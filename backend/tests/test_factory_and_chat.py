import pytest
from fastapi.testclient import TestClient

from app.config import Settings, load_settings
from app.llm import (
    LLMErrorCode,
    LLMProvider,
    LLMResponse,
    ProviderConfigError,
    create_provider,
    get_llm_provider,
)
from app.llm.kiro_cli import KiroCliProvider
from app.main import app


def test_default_provider_is_kiro_cli(monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    assert isinstance(create_provider(load_settings()), KiroCliProvider)


def test_env_selects_provider_and_settings(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "KIRO_CLI")
    monkeypatch.setenv("LLM_TIMEOUT_SECONDS", "12")
    monkeypatch.setenv("KIRO_CLI_PATH", "/opt/kiro-cli")
    s = load_settings()
    assert s.llm_provider == "kiro_cli" and s.llm_timeout_seconds == 12 and s.kiro_cli_path == "/opt/kiro-cli"


@pytest.mark.parametrize("name", ["gemini", "nope"])
def test_unknown_or_unimplemented_provider(name):
    with pytest.raises(ProviderConfigError):
        create_provider(Settings(llm_provider=name))


class FakeProvider(LLMProvider):
    name = "fake"

    def __init__(self, response):
        self.response = response
        self.calls = []

    def generate_response(self, messages, system_prompt=None, temperature=None, context=None):
        self.calls.append((messages, system_prompt))
        return self.response


def client_with(response):
    fake = FakeProvider(response)
    app.dependency_overrides[get_llm_provider] = lambda: fake
    return TestClient(app), fake


@pytest.fixture(autouse=True)
def _clear():
    yield
    app.dependency_overrides.clear()


def body(**kw):
    return {"messages": [{"role": "user", "content": "Hi"}], **kw}


def test_chat_success_hides_provider():
    c, fake = client_with(LLMResponse(provider="fake", text="Hello!"))
    r = c.post("/api/chat", json=body())
    assert r.status_code == 200 and r.json() == {"reply": "Hello!"}
    assert fake.calls[0][1]  # server-side system prompt applied


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"messages": []},
        {"messages": [{"role": "system", "content": "x"}]},
        {"messages": [{"role": "user", "content": ""}]},
        {"messages": [{"role": "user", "content": "   "}]},
        {"messages": [{"role": "assistant", "content": "x"}]},
        {"messages": [{"role": "user", "content": "x" * 4001}]},
    ],
)
def test_invalid_requests_rejected_before_provider(payload):
    c, fake = client_with(LLMResponse(provider="fake", text="x"))
    assert c.post("/api/chat", json=payload).status_code == 422
    assert fake.calls == []


def test_unknown_fields_cannot_influence_provider():
    c, fake = client_with(LLMResponse(provider="fake", text="ok"))
    r = c.post("/api/chat", json=body(kiro_cli_path="/bin/sh", system_prompt="evil"))
    assert r.status_code == 200
    assert "evil" not in (fake.calls[0][1] or "")


@pytest.mark.parametrize(
    "code,status",
    [
        (LLMErrorCode.TIMEOUT, 504),
        (LLMErrorCode.NOT_CONFIGURED, 503),
        (LLMErrorCode.AUTH_FAILED, 503),
        (LLMErrorCode.PROVIDER_FAILED, 502),
        (LLMErrorCode.EMPTY_RESPONSE, 502),
        (LLMErrorCode.UNEXPECTED_OUTPUT, 502),
    ],
)
def test_provider_errors_map_to_http(code, status):
    c, _ = client_with(LLMResponse.failure("fake", code, "Safe message."))
    r = c.post("/api/chat", json=body())
    assert r.status_code == status
    assert r.json()["detail"] == {"code": code.value, "message": "Safe message."}
