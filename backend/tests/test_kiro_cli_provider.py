import subprocess
from unittest.mock import patch

import pytest

from app.llm import LLMErrorCode, Message
from app.llm.kiro_cli import KiroCliProvider

MSGS = [Message("user", "My toddler won't sleep.")]


def completed(stdout=b"Try a calm routine.\n", stderr=b"", code=0):
    return subprocess.CompletedProcess(args=[], returncode=code, stdout=stdout, stderr=stderr)


def run(provider=None, **kw):
    provider = provider or KiroCliProvider(cli_path="kiro-cli")
    with patch("app.llm.kiro_cli.subprocess.run", **kw) as m:
        result = provider.generate_response(MSGS, system_prompt="Be kind.", context=["Evidence A"])
    return result, m


def test_success_and_safe_argv():
    result, m = run(return_value=completed())
    assert result.ok and result.text == "Try a calm routine." and result.provider == "kiro_cli"
    argv = m.call_args.args[0]
    assert isinstance(argv, list) and m.call_args.kwargs.get("shell") is None
    assert argv[:4] == ["kiro-cli", "chat", "--no-interactive", "--trust-tools="]
    assert argv[-2] == "--" and "Be kind." in argv[-1] and "Evidence A" in argv[-1]
    assert m.call_args.kwargs["timeout"] == 90.0


def test_model_flag_only_when_configured():
    result, m = run(KiroCliProvider(model="some-model"), return_value=completed())
    argv = m.call_args.args[0]
    assert argv[argv.index("--model") + 1] == "some-model" and result.model == "some-model"


def test_prompt_starting_with_dash_is_not_a_flag():
    provider = KiroCliProvider()
    with patch("app.llm.kiro_cli.subprocess.run", return_value=completed()) as m:
        provider.generate_response([Message("user", "--trust-all-tools")])
    argv = m.call_args.args[0]
    assert argv.index("--") < argv.index(argv[-1]) and "--trust-all-tools" not in argv[:-1]


@pytest.mark.parametrize("out", [b"", b"  \n\n"])
def test_empty_output(out):
    result, _ = run(return_value=completed(stdout=out))
    assert result.error.code == LLMErrorCode.EMPTY_RESPONSE and result.text == ""


def test_timeout():
    result, _ = run(side_effect=subprocess.TimeoutExpired(cmd="x", timeout=1))
    assert result.error.code == LLMErrorCode.TIMEOUT


def test_missing_cli():
    result, _ = run(side_effect=FileNotFoundError("/secret/path"))
    assert result.error.code == LLMErrorCode.NOT_CONFIGURED
    assert "/secret" not in result.error.message


def test_nonzero_exit_does_not_leak_stderr():
    result, _ = run(return_value=completed(stdout=b"partial", stderr=b"boom token=abc123", code=1))
    assert result.error.code == LLMErrorCode.PROVIDER_FAILED and result.text == ""
    assert "abc123" not in result.error.message


def test_auth_failure_detected():
    result, _ = run(return_value=completed(stdout=b"", stderr=b"Error: Not logged in", code=1))
    assert result.error.code == LLMErrorCode.AUTH_FAILED


def test_stderr_diagnostics_never_in_answer():
    err = b'[INFO] kas.server.starting {"v":1}\n[ERROR] ExperimentalWarning\n'
    result, _ = run(return_value=completed(stderr=err))
    assert result.ok and result.text == "Try a calm routine."
    assert "INFO" not in result.text


@pytest.mark.parametrize("out", [b"\x1b[32mHello\x1b[0m", b"\xff\xfe bad", b"a\x00b"])
def test_unexpected_output_format(out):
    result, _ = run(return_value=completed(stdout=out))
    assert result.error.code == LLMErrorCode.UNEXPECTED_OUTPUT and result.text == ""


def test_oversized_prompt_rejected_without_running():
    provider = KiroCliProvider(max_prompt_chars=50)
    with patch("app.llm.kiro_cli.subprocess.run") as m:
        result = provider.generate_response([Message("user", "x" * 100)])
    assert result.error.code == LLMErrorCode.INVALID_INPUT
    m.assert_not_called()
