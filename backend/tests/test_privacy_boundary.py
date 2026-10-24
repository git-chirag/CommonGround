"""Privacy boundary, checked at the last point we control: the argv handed to the Kiro CLI.

These tests use the REAL KiroCliProvider and route, with only `subprocess.run` mocked, so every
assertion is about the complete outbound provider request (system prompt + notes + passages +
conversation), not about an intermediate object.
"""

import json
import logging
import os
import subprocess
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, load_settings
from app.llm import LLMErrorCode, Message, create_provider, get_llm_provider
from app.llm.kiro_cli import KiroCliProvider, session_ids_for
from app.main import create_app

# Unique markers so a leak cannot hide behind ordinary words.
PARENT_HOPE = "PARENT-HOPE-7Q2"
PARENT_CONCERN = "PARENT-CONCERN-4K9"
PARENT_CHAT = "PARENT-CHAT-MSG-1Z5"
TEEN_CAREER = "TEEN-CAREER-8W3"
TEEN_CHAT = "TEEN-CHAT-MSG-6R1"
SHARED_GOAL = "SHARED-GOAL-2M8"


def _ok(stdout=b"A careful reply."):
    return subprocess.CompletedProcess(args=[], returncode=0, stdout=stdout, stderr=b"[INFO] log line")


class Recorder:
    """Records every subprocess call made by the provider."""

    def __init__(self):
        self.calls: list[tuple[list[str], dict]] = []

    def __call__(self, argv, **kwargs):
        self.calls.append((list(argv), kwargs))
        return _ok()

    @property
    def prompts(self) -> list[str]:
        return [argv[-1] for argv, _ in self.calls if "--no-interactive" in argv]


@pytest.fixture
def stack():
    """App + real provider; yields (client, recorder)."""
    app = create_app(Settings())
    provider = KiroCliProvider(cli_path="kiro-cli")  # no session cleanup: one call per request
    app.dependency_overrides[get_llm_provider] = lambda: provider
    rec = Recorder()
    with patch("app.llm.kiro_cli.subprocess.run", side_effect=rec):
        yield TestClient(app), rec


def parent_request(**overrides):
    body = {
        "messages": [{"role": "user", "content": f"Why has my teen become withdrawn? {PARENT_CHAT}"}],
        "parenting_stage": "adolescence",
        "retrieve_sources": True,
        "family_context": {
            "audience": "parent",
            "own": {"hopes": PARENT_HOPE, "concerns": PARENT_CONCERN},
            "shared": {"shared_goals": SHARED_GOAL},
        },
    }
    body.update(overrides)
    return body


def teen_request(**overrides):
    body = {
        "messages": [{"role": "user", "content": f"How do I talk to my parent? {TEEN_CHAT}"}],
        "retrieve_sources": True,
        "family_context": {
            "audience": "teen",
            "own": {"career_ideas": TEEN_CAREER},
            "shared": {"shared_goals": SHARED_GOAL},
        },
    }
    body.update(overrides)
    return body


# --- what each audience's outbound request contains -------------------------------


def test_parent_outbound_prompt_has_only_parent_and_shared(stack):
    client, rec = stack
    assert client.post("/api/chat", json=parent_request()).status_code == 200
    (prompt,) = rec.prompts
    for allowed in (PARENT_HOPE, PARENT_CONCERN, SHARED_GOAL, PARENT_CHAT):
        assert allowed in prompt
    for forbidden in (TEEN_CAREER, TEEN_CHAT):
        assert forbidden not in prompt
    assert "talking with a PARENT" in prompt and "talking with a TEENAGER" not in prompt


def test_teen_outbound_prompt_has_only_teen_and_shared(stack):
    client, rec = stack
    assert client.post("/api/chat", json=teen_request()).status_code == 200
    (prompt,) = rec.prompts
    for allowed in (TEEN_CAREER, SHARED_GOAL, TEEN_CHAT):
        assert allowed in prompt
    for forbidden in (PARENT_HOPE, PARENT_CONCERN, PARENT_CHAT):
        assert forbidden not in prompt
    assert "talking with a TEENAGER" in prompt


def test_server_keeps_no_state_between_audiences(stack):
    """Parent then teen, then parent again: nothing from one request appears in the next."""
    client, rec = stack
    client.post("/api/chat", json=parent_request())
    client.post("/api/chat", json=teen_request())
    client.post("/api/chat", json=parent_request(family_context=None))
    p1, t1, p2 = rec.prompts
    assert PARENT_HOPE not in t1 and PARENT_CHAT not in t1
    assert TEEN_CAREER not in p2 and TEEN_CHAT not in p2
    # every call is a fresh, separate CLI process in its own directory, never resumed
    cwds = [kw["cwd"] for argv, kw in rec.calls]
    assert len(set(cwds)) == 3
    assert not any(flag in argv for argv, _ in rec.calls for flag in ("--resume", "-r", "--resume-id"))


@pytest.mark.parametrize(
    "audience,key",
    [("parent", "career_ideas"), ("parent", "interests"), ("teen", "hopes"), ("teen", "concerns")],
)
def test_other_sides_private_keys_never_reach_the_provider(stack, audience, key):
    client, rec = stack
    body = parent_request() if audience == "parent" else teen_request()
    body["family_context"]["own"][key] = "SMUGGLED-VALUE"
    r = client.post("/api/chat", json=body)
    assert r.status_code == 422 and rec.calls == []
    assert "SMUGGLED-VALUE" not in r.text


def test_reflections_have_no_field_at_all(stack):
    client, rec = stack
    for audience_body in (parent_request(), teen_request()):
        for scope in ("own", "shared"):
            body = json.loads(json.dumps(audience_body))
            body["family_context"][scope]["reflections"] = "PRIVATE-REFLECTION"
            assert client.post("/api/chat", json=body).status_code == 422
    assert rec.calls == []


def test_context_toggled_off_sends_no_profile_notes(stack):
    client, rec = stack
    client.post("/api/chat", json=parent_request(family_context=None))
    (prompt,) = rec.prompts
    assert "[FAMILY NOTES" not in prompt
    assert PARENT_HOPE not in prompt and SHARED_GOAL not in prompt
    assert PARENT_CHAT in prompt  # the question itself is still sent


def test_shared_goal_present_only_when_shared(stack):
    client, rec = stack
    shared_off = parent_request()
    shared_off["family_context"]["shared"] = {}
    client.post("/api/chat", json=parent_request())
    client.post("/api/chat", json=shared_off)
    with_shared, without_shared = rec.prompts
    assert SHARED_GOAL in with_shared and SHARED_GOAL not in without_shared


def test_profile_notes_never_drive_retrieval(stack):
    """Retrieval uses the conversation only. Notes full of matching keywords must not pull in sources."""
    client, rec = stack
    body = parent_request(messages=[{"role": "user", "content": "What is the capital of France?"}])
    body["family_context"]["own"]["concerns"] = "listen teen opinion active listening open questions"
    data = client.post("/api/chat", json=body).json()
    assert data["grounding"] == "none" and data["sources"] == []
    assert "[REFERENCE MATERIAL" not in rec.prompts[0]


def test_passages_in_prompt_come_only_from_the_curated_corpus(stack):
    client, rec = stack
    data = client.post("/api/chat", json=parent_request()).json()
    prompt = rec.prompts[0]
    assert data["grounding"] == "retrieved"
    reference = prompt.split("[REFERENCE MATERIAL", 1)[1].split("[CONVERSATION]", 1)[0]
    assert PARENT_HOPE not in reference and PARENT_CHAT not in reference and SHARED_GOAL not in reference
    for s in data["sources"]:
        assert s["title"] in reference


def test_backend_logs_contain_no_conversation_or_profile_text(stack, caplog):
    client, _ = stack
    with caplog.at_level(logging.DEBUG):
        client.post("/api/chat", json=parent_request())
        client.post("/api/chat", json=teen_request())
    logged = "\n".join(r.getMessage() for r in caplog.records)
    for marker in (PARENT_HOPE, PARENT_CONCERN, PARENT_CHAT, TEEN_CAREER, TEEN_CHAT, SHARED_GOAL):
        assert marker not in logged


# --- CLI session cleanup (the CLI stores each transcript under ~/.kiro/sessions) ------------


def listing(cwd, *ids):
    return json.dumps([{"cwd": cwd, "sessions": [{"sessionId": i} for i in ids], "complete": True}]).encode()


def test_session_ids_only_for_our_directory():
    out = json.dumps(
        [
            {"cwd": "/tmp/cg-kiro-abc", "sessions": [{"sessionId": "sess_1111aaaa-22"}]},
            {"cwd": "/Users/someone/project", "sessions": [{"sessionId": "sess_9999ffff-99"}]},
        ]
    ).encode()
    assert session_ids_for(out, "/tmp/cg-kiro-abc") == ["sess_1111aaaa-22"]
    assert session_ids_for(out, "/tmp/other") == []


@pytest.mark.parametrize(
    "raw", [b"", b"not json", b'{"cwd": 1}', b"\xff", listing("/x", "--all", "sess_a b")]
)
def test_session_listing_garbage_is_ignored(raw):
    assert session_ids_for(raw, "/x") == []


def test_cleanup_deletes_this_calls_session_and_directory():
    calls = []

    def fake_run(argv, **kw):
        calls.append((argv, kw["cwd"]))
        if "--list-sessions" in argv:
            return subprocess.CompletedProcess(argv, 0, listing(kw["cwd"], "sess_0000test-0001"), b"")
        return _ok()

    provider = KiroCliProvider(delete_sessions=True, run_cleanup=lambda task: task())
    with patch("app.llm.kiro_cli.subprocess.run", side_effect=fake_run):
        result = provider.generate_response([Message("user", "hi")])
    assert result.ok
    chat, lst, delete = calls
    assert "--no-interactive" in chat[0]
    assert lst[0][1:] == ["chat", "--list-sessions", "-f", "json"] and lst[1] == chat[1]
    assert delete[0][1:] == ["chat", "--delete-session", "sess_0000test-0001"]
    assert not os.path.exists(chat[1])  # temp dir removed


def test_cleanup_failure_never_breaks_the_reply_and_still_removes_directory():
    seen_cwd = []

    def fake_run(argv, **kw):
        seen_cwd.append(kw["cwd"])
        if "--list-sessions" in argv:
            raise subprocess.TimeoutExpired(argv, 30)
        return _ok()

    provider = KiroCliProvider(delete_sessions=True, run_cleanup=lambda task: task())
    with patch("app.llm.kiro_cli.subprocess.run", side_effect=fake_run):
        assert provider.generate_response([Message("user", "hi")]).text == "A careful reply."
    assert not os.path.exists(seen_cwd[0])


def test_cleanup_also_runs_after_a_failed_call():
    calls = []

    def fake_run(argv, **kw):
        calls.append(argv)
        if "--list-sessions" in argv:
            return subprocess.CompletedProcess(argv, 0, listing(kw["cwd"]), b"")
        raise subprocess.TimeoutExpired(argv, 1)

    provider = KiroCliProvider(delete_sessions=True, run_cleanup=lambda task: task())
    with patch("app.llm.kiro_cli.subprocess.run", side_effect=fake_run):
        assert provider.generate_response([Message("user", "hi")]).error.code == LLMErrorCode.TIMEOUT
    assert any("--list-sessions" in a for a in calls)


def test_no_cleanup_calls_when_disabled(stack):
    client, rec = stack
    client.post("/api/chat", json=parent_request())
    assert all("--list-sessions" not in argv and "--delete-session" not in argv for argv, _ in rec.calls)


def test_app_factory_enables_session_cleanup_by_default(monkeypatch):
    monkeypatch.delenv("KIRO_CLI_DELETE_SESSIONS", raising=False)
    assert create_provider(load_settings())._delete_sessions is True
    monkeypatch.setenv("KIRO_CLI_DELETE_SESSIONS", "false")
    assert create_provider(load_settings())._delete_sessions is False
    monkeypatch.setenv("KIRO_CLI_DELETE_SESSIONS", "maybe")
    with pytest.raises(ValueError):
        load_settings()
