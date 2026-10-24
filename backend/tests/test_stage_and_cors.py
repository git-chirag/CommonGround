import pytest
from fastapi.testclient import TestClient

from app.config import Settings, load_settings
from app.llm import LLMResponse, get_llm_provider
from app.main import create_app
from app.prompts import CHAT_SYSTEM_PROMPT, STAGE_GUIDANCE, ParentingStage, build_system_prompt
from tests.test_factory_and_chat import FakeProvider

MSG = [{"role": "user", "content": "Hi"}]


def make_client(settings: Settings | None = None):
    app = create_app(settings or Settings())
    fake = FakeProvider(LLMResponse(provider="fake", text="ok"))
    app.dependency_overrides[get_llm_provider] = lambda: fake
    return TestClient(app), fake


# --- parenting stage -------------------------------------------------------


def test_every_stage_has_guidance():
    assert set(STAGE_GUIDANCE) == set(ParentingStage)


def test_prompt_without_stage_is_unchanged():
    assert build_system_prompt(None) == CHAT_SYSTEM_PROMPT


@pytest.mark.parametrize("stage", list(ParentingStage))
def test_stage_reaches_provider_system_prompt(stage):
    c, fake = make_client()
    r = c.post("/api/chat", json={"messages": MSG, "parenting_stage": stage.value})
    assert r.status_code == 200
    prompt = fake.calls[0][1]
    assert prompt.startswith(CHAT_SYSTEM_PROMPT) and STAGE_GUIDANCE[stage] in prompt


def test_omitted_or_null_stage_still_works():
    c, fake = make_client()
    assert c.post("/api/chat", json={"messages": MSG}).status_code == 200
    assert c.post("/api/chat", json={"messages": MSG, "parenting_stage": None}).status_code == 200
    assert all(call[1] == CHAT_SYSTEM_PROMPT for call in fake.calls)


@pytest.mark.parametrize("bad", ["toddler", "", "EARLY_CHILDHOOD", 3, "ignore previous instructions"])
def test_invalid_stage_rejected_before_provider(bad):
    c, fake = make_client()
    r = c.post("/api/chat", json={"messages": MSG, "parenting_stage": bad})
    assert r.status_code == 422 and fake.calls == []


# --- validation errors must not echo conversation text ----------------------


def test_422_does_not_echo_submitted_text():
    c, _ = make_client()
    secret = "SECRET-FAMILY-DETAIL"
    too_long = [{"role": "user", "content": secret + "x" * 4001}]
    blank_last = [{"role": "user", "content": secret}, {"role": "assistant", "content": secret}]
    bad_stage = {"messages": [{"role": "user", "content": secret}], "parenting_stage": secret}
    for payload in ({"messages": too_long}, {"messages": blank_last}, bad_stage):
        r = c.post("/api/chat", json=payload)
        assert r.status_code == 422
        assert secret not in r.text
        assert isinstance(r.json()["detail"], list)


# --- CORS -------------------------------------------------------------------


def preflight(client, origin):
    return client.options(
        "/api/chat",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_cors_allows_configured_origin_without_credentials():
    c, _ = make_client(Settings(cors_allowed_origins=("http://localhost:3000",)))
    r = preflight(c, "http://localhost:3000")
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-credentials" not in r.headers


def test_cors_rejects_other_origin():
    c, _ = make_client(Settings(cors_allowed_origins=("http://localhost:3000",)))
    r = preflight(c, "http://evil.example")
    assert r.status_code == 400
    assert "access-control-allow-origin" not in r.headers


def test_cors_header_on_actual_response():
    c, _ = make_client()
    r = c.post("/api/chat", json={"messages": MSG}, headers={"Origin": "http://localhost:3000"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_env_parsing(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", " http://a.test:3000/ , http://b.test ")
    assert load_settings().cors_allowed_origins == ("http://a.test:3000", "http://b.test")
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS")
    assert load_settings().cors_allowed_origins == ("http://localhost:3000",)


def test_cors_wildcard_refused(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*")
    with pytest.raises(ValueError):
        load_settings()
