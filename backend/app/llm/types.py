"""Provider-independent types for the LLM module."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Literal


class LLMErrorCode(str, Enum):
    INVALID_INPUT = "invalid_input"
    NOT_CONFIGURED = "not_configured"  # provider missing / unusable (e.g. CLI not installed)
    AUTH_FAILED = "auth_failed"
    TIMEOUT = "timeout"
    PROVIDER_FAILED = "provider_failed"  # non-zero exit, upstream error
    EMPTY_RESPONSE = "empty_response"
    UNEXPECTED_OUTPUT = "unexpected_output"


@dataclass(frozen=True)
class Message:
    role: Literal["user", "assistant"]
    content: str


@dataclass(frozen=True)
class LLMUsage:
    """Token usage, when the provider reports it. All fields optional."""

    input_tokens: int | None = None
    output_tokens: int | None = None


@dataclass(frozen=True)
class LLMError:
    code: LLMErrorCode
    # Safe, user-presentable summary. Never raw stderr, env values or credentials.
    message: str


@dataclass(frozen=True)
class LLMResponse:
    """Normalized result. Exactly one of (non-empty text) or error is set."""

    provider: str
    text: str = ""
    model: str | None = None
    usage: LLMUsage | None = None
    error: LLMError | None = None

    @property
    def ok(self) -> bool:
        return self.error is None

    @classmethod
    def failure(
        cls, provider: str, code: LLMErrorCode, message: str, model: str | None = None
    ) -> LLMResponse:
        return cls(provider=provider, model=model, error=LLMError(code, message))
