"""Provider that shells out to a locally installed, locally authenticated Kiro CLI.

LOCAL DEVELOPMENT ONLY. Verified CLI behaviour (kiro-cli 2.34.0):
  * ``chat --no-interactive`` writes only the answer to stdout (no ANSI when piped);
    all diagnostics/log lines go to stderr.
  * ``--trust-tools=`` (empty) disables every agent tool, so the model cannot
    read files or run commands.
  * ``--`` ends option parsing, so a prompt starting with ``-`` cannot be
    interpreted as a flag.
  * Failures (e.g. unknown model) exit non-zero with the error on stderr.
  * There is no flag for system prompt or temperature; the system prompt is
    embedded in the prompt text and temperature is ignored.
"""

from __future__ import annotations

import logging
import subprocess
import tempfile
import threading
import time
from collections.abc import Sequence

from .base import LLMProvider
from .types import LLMErrorCode, LLMResponse, Message

logger = logging.getLogger(__name__)

PROVIDER_NAME = "kiro_cli"

_AUTH_HINTS = (
    "not logged in",
    "login",
    "log in",
    "unauthorized",
    "unauthenticated",
    "token expired",
    "authenticat",
)


def build_prompt(
    messages: Sequence[Message],
    system_prompt: str | None,
    context: Sequence[str] | None,
) -> str:
    parts: list[str] = []
    if system_prompt:
        parts.append(f"[SYSTEM INSTRUCTIONS]\n{system_prompt.strip()}")
    if context:
        passages = "\n\n".join(f"({i}) {c.strip()}" for i, c in enumerate(context, 1))
        parts.append(
            "[REFERENCE MATERIAL: supplied by the application; use only if relevant, "
            "and do not cite anything not listed here]\n" + passages
        )
    transcript = "\n\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content.strip()}" for m in messages
    )
    parts.append(f"[CONVERSATION]\n{transcript}\n\nWrite only the Assistant's next reply.")
    return "\n\n".join(parts)


class KiroCliProvider(LLMProvider):
    name = PROVIDER_NAME

    def __init__(
        self,
        cli_path: str = "kiro-cli",
        timeout_seconds: float = 90.0,
        model: str | None = None,
        max_prompt_chars: int = 24000,
        max_concurrent: int = 2,
    ) -> None:
        self._cli_path = cli_path
        self._timeout = timeout_seconds
        self._model = model
        self._max_prompt_chars = max_prompt_chars
        self._slots = threading.BoundedSemaphore(max(1, max_concurrent))

    def _argv(self, prompt: str) -> list[str]:
        argv = [self._cli_path, "chat", "--no-interactive", "--trust-tools="]
        if self._model:
            argv += ["--model", self._model]
        return [*argv, "--", prompt]

    def _fail(self, code: LLMErrorCode, message: str) -> LLMResponse:
        return LLMResponse.failure(self.name, code, message, model=self._model)

    def generate_response(
        self,
        messages: Sequence[Message],
        system_prompt: str | None = None,
        temperature: float | None = None,  # not supported by the CLI; ignored
        context: Sequence[str] | None = None,
    ) -> LLMResponse:
        if not messages:
            return self._fail(LLMErrorCode.INVALID_INPUT, "No messages provided.")
        prompt = build_prompt(messages, system_prompt, context)
        if len(prompt) > self._max_prompt_chars or "\x00" in prompt:
            return self._fail(LLMErrorCode.INVALID_INPUT, "Input is too large or invalid.")

        if not self._slots.acquire(timeout=self._timeout):
            return self._fail(LLMErrorCode.PROVIDER_FAILED, "The assistant is busy. Try again shortly.")
        started = time.monotonic()
        try:
            # Fresh empty working directory per call: no shared session state,
            # no project files for the CLI to pick up.
            with tempfile.TemporaryDirectory(prefix="cg-kiro-") as workdir:
                proc = subprocess.run(  # noqa: S603 - argv list, no shell
                    self._argv(prompt),
                    capture_output=True,
                    stdin=subprocess.DEVNULL,
                    timeout=self._timeout,
                    cwd=workdir,
                    check=False,
                )
        except FileNotFoundError:
            logger.error("kiro_cli executable not found")
            return self._fail(LLMErrorCode.NOT_CONFIGURED, "The local assistant is not available.")
        except PermissionError:
            logger.error("kiro_cli executable not permitted")
            return self._fail(LLMErrorCode.NOT_CONFIGURED, "The local assistant is not available.")
        except subprocess.TimeoutExpired:
            logger.error("kiro_cli timed out after %.0fs", self._timeout)
            return self._fail(LLMErrorCode.TIMEOUT, "The assistant took too long to respond.")
        except OSError:
            logger.error("kiro_cli could not be started")
            return self._fail(LLMErrorCode.PROVIDER_FAILED, "The assistant failed to respond.")
        finally:
            self._slots.release()

        elapsed = time.monotonic() - started
        stderr = proc.stderr.decode("utf-8", errors="replace").lower()

        if proc.returncode != 0:
            # Log only the exit code and category, never stderr/stdout content.
            if any(h in stderr for h in _AUTH_HINTS):
                logger.error("kiro_cli auth failure (exit %s)", proc.returncode)
                return self._fail(LLMErrorCode.AUTH_FAILED, "The local assistant is not signed in.")
            logger.error("kiro_cli exited %s after %.1fs", proc.returncode, elapsed)
            return self._fail(LLMErrorCode.PROVIDER_FAILED, "The assistant failed to respond.")

        try:
            text = proc.stdout.decode("utf-8")  # strict: corrupted bytes are an error
        except UnicodeDecodeError:
            return self._fail(LLMErrorCode.UNEXPECTED_OUTPUT, "The assistant returned unreadable output.")

        if "\x1b" in text or "\x00" in text:
            # Terminal control codes mean we are not getting plain-text output.
            logger.error("kiro_cli output contained control sequences")
            return self._fail(LLMErrorCode.UNEXPECTED_OUTPUT, "The assistant returned unexpected output.")

        text = text.strip()
        if not text:
            return self._fail(LLMErrorCode.EMPTY_RESPONSE, "The assistant returned an empty response.")

        logger.info("kiro_cli ok in %.1fs (%d chars)", elapsed, len(text))
        return LLMResponse(provider=self.name, text=text, model=self._model)
