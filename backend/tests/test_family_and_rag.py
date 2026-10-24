import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.family_context import FamilyContext, build_family_block
from app.llm import LLMResponse, get_llm_provider
from app.main import create_app
from app.prompts import CHAT_SYSTEM_PROMPT, build_system_prompt
from app.rag import LexicalRetriever, get_retriever
from app.rag.corpus import CorpusError, chunk_text, load_chunks, parse_document
from app.rag.format import passages_to_context
from tests.test_factory_and_chat import FakeProvider

CAREER_Q = "How do I discuss a career choice when my hopes differ from my teen's preference?"
MSG = [{"role": "user", "content": CAREER_Q}]
PARENT_SECRET = "PARENT-PRIVATE-MARKER"
TEEN_SECRET = "TEEN-PRIVATE-MARKER"


def make(reply="ok"):
    app = create_app(Settings())
    fake = FakeProvider(LLMResponse(provider="fake", text=reply))
    app.dependency_overrides[get_llm_provider] = lambda: fake
    return TestClient(app), fake


# --- family context: scopes ---------------------------------------------------


def test_parent_prompt_contains_parent_private_and_shared_only():
    ctx = FamilyContext(
        audience="parent",
        own={"hopes": PARENT_SECRET},
        shared={"shared_goals": "Plan a weekly check-in"},
    )
    prompt = build_system_prompt(audience="parent", family_block=build_family_block(ctx))
    assert PARENT_SECRET in prompt and "weekly check-in" in prompt
    assert TEEN_SECRET not in prompt
    assert "PARENT" in prompt and "do not have access to the teen's private notes" in prompt


def test_teen_prompt_contains_teen_private_and_shared_only():
    ctx = FamilyContext(audience="teen", own={"interests": TEEN_SECRET}, shared={"routines": "Sunday dinner"})
    prompt = build_system_prompt(audience="teen", family_block=build_family_block(ctx))
    assert TEEN_SECRET in prompt and "Sunday dinner" in prompt
    assert PARENT_SECRET not in prompt


@pytest.mark.parametrize(
    "audience,key",
    [("teen", "hopes"), ("teen", "worldview"), ("parent", "interests"), ("parent", "career_ideas")],
)
def test_other_audiences_private_keys_are_rejected(audience, key):
    c, fake = make()
    body = {"messages": MSG, "family_context": {"audience": audience, "own": {key: "secret text"}}}
    r = c.post("/api/chat", json=body)
    assert r.status_code == 422 and fake.calls == []
    assert "secret text" not in r.text


def test_unknown_shared_key_rejected_and_not_echoed():
    c, fake = make()
    body = {
        "messages": MSG,
        "family_context": {"audience": "parent", "shared": {"teen_reflections": "SECRET-VALUE"}},
    }
    r = c.post("/api/chat", json=body)
    assert r.status_code == 422 and fake.calls == [] and "SECRET-VALUE" not in r.text


def test_oversized_field_rejected():
    c, _ = make()
    body = {"messages": MSG, "family_context": {"audience": "parent", "own": {"hopes": "x" * 801}}}
    assert c.post("/api/chat", json=body).status_code == 422


def test_no_context_means_unchanged_prompt():
    c, fake = make()
    assert c.post("/api/chat", json={"messages": MSG}).status_code == 200
    assert fake.calls[0][1] == CHAT_SYSTEM_PROMPT


def test_context_reaches_system_prompt_not_messages():
    c, fake = make()
    body = {"messages": MSG, "family_context": {"audience": "parent", "own": {"hopes": PARENT_SECRET}}}
    assert c.post("/api/chat", json=body).status_code == 200
    messages, system = fake.calls[0]
    assert PARENT_SECRET in system
    assert all(PARENT_SECRET not in m.content for m in messages)


def test_blank_fields_are_dropped():
    ctx = FamilyContext(audience="parent", own={"hopes": "   "}, shared={})
    assert build_family_block(ctx) is None


def test_prompt_forbids_inference_and_siding():
    p = build_system_prompt(audience="teen")
    assert "Do not automatically side" in p and "infer" in p


# --- corpus and retrieval ----------------------------------------------------


def test_corpus_loads_with_real_metadata():
    sources, chunks = load_chunks()
    assert len(sources) >= 5 and chunks
    for s in sources:
        assert s.url.startswith("https://") and s.title and s.publisher and s.verified_via
        assert s.kind == "curated_summary"
    # dates are only set when the source page states them
    assert {s.id: s.published for s in sources}["unicef-parenting-adolescents"] == "February 2021"
    assert {s.id: s.published for s in sources}["unicef-11-tips"] is None


def test_parse_document_validates():
    with pytest.raises(CorpusError):
        parse_document("no front matter", "x")
    with pytest.raises(CorpusError):
        parse_document("---\nid: a\n---\nbody", "x")


def test_chunks_overlap_and_cover_text():
    text = " ".join(f"Sentence number {i} has several words in it for testing." for i in range(30))
    chunks = chunk_text(text, max_words=40, overlap_sentences=1)
    assert len(chunks) > 3
    for a, b in zip(chunks, chunks[1:], strict=False):
        assert a.split(". ")[-1].rstrip(".") in b  # last sentence of a reappears in b


@pytest.mark.parametrize(
    "question,expected",
    [
        (MSG[0]["content"], "unicef-11-tips"),
        ("How can I listen better to my teenager?", "unicef-11-tips"),
        ("What are executive function skills?", "harvard-executive-function"),
        ("How do I respond to my baby's babbling and crying?", "harvard-serve-and-return"),
    ],
)
def test_relevant_questions_retrieve_expected_source(question, expected):
    ids = [p.source.id for p in get_retriever().retrieve(question)]
    assert expected in ids


@pytest.mark.parametrize(
    "question", ["What is the capital of France?", "My child won't eat vegetables", "hi", "", "????"]
)
def test_unrelated_questions_return_nothing(question):
    assert get_retriever().retrieve(question) == []


def test_retriever_with_empty_corpus_is_safe():
    assert LexicalRetriever([]).retrieve("anything about teens") == []


def test_passage_context_labels_and_discloses_summary():
    ctx = passages_to_context(get_retriever().retrieve("How can I listen better to my teenager?"))
    assert ctx[0].startswith("[S1]") and "condensed summary" in ctx[0]


# --- citations in the route ---------------------------------------------------


def test_sources_returned_match_retrieval_metadata():
    c, fake = make("Listen first [S1]. Then ask questions [S2].")
    r = c.post("/api/chat", json={"messages": MSG, "retrieve_sources": True})
    data = r.json()
    assert r.status_code == 200 and data["grounding"] == "retrieved"
    expected = {p.source.id: p.source for p in get_retriever().retrieve(MSG[0]["content"])}
    assert {s["id"] for s in data["sources"]} == set(expected)
    for s in data["sources"]:
        src = expected[s["id"]]
        assert (s["title"], s["url"], s["publisher"]) == (src.title, src.url, src.publisher)
    assert "reference passages" in fake.calls[0][1].lower()


def test_fabricated_citation_markers_are_removed():
    c, _ = make("A claim [S9]. Another [S1].")
    data = c.post("/api/chat", json={"messages": MSG, "retrieve_sources": True}).json()
    assert "[S9]" not in data["reply"] and "[S1]" in data["reply"]
    assert [s["cited"] for s in data["sources"]][0] is True


def test_no_evidence_found_is_reported_not_faked():
    c, fake = make("Here is a general answer [S1].")
    q = [{"role": "user", "content": "What is the capital of France?"}]
    data = c.post("/api/chat", json={"messages": q, "retrieve_sources": True}).json()
    assert data["grounding"] == "none" and data["sources"] == []
    assert "[S1]" not in data["reply"]
    assert "No reference passages were found" in fake.calls[0][1]


def test_sources_not_requested_keeps_original_contract():
    c, _ = make("plain")
    assert c.post("/api/chat", json={"messages": MSG}).json() == {"reply": "plain"}


def test_short_followup_uses_previous_question_for_retrieval():
    c, _ = make("ok")
    msgs = [
        {"role": "user", "content": "How can I listen better to my teenager?"},
        {"role": "assistant", "content": "Try open questions."},
        {"role": "user", "content": "Why?"},
    ]
    data = c.post("/api/chat", json={"messages": msgs, "retrieve_sources": True}).json()
    assert data["grounding"] == "retrieved"


# --- Party Night retrieval (real curated UNICEF pages) -----------------------------------------

PARTY_PARENT = (
    "I argued with my daughter about what she was wearing to a party. I was worried about how some people "
    "might treat her, but I came across as controlling. Now she's left upset. How can I repair this?"
)
PARTY_TEEN = (
    "My dad got upset about my party outfit, and it felt like he didn't trust me. I left angry. How can I "
    "explain my side without starting another argument?"
)


@pytest.mark.parametrize("question", [PARTY_PARENT, PARTY_TEEN])
def test_party_night_prompts_retrieve_a_unicef_source(question):
    hits = get_retriever().retrieve(question)
    assert hits and all(h.source.url.startswith("https://www.unicef.org/") for h in hits[:1])


def test_party_parent_prompt_no_longer_matches_executive_function():
    ids = [p.source.id for p in get_retriever().retrieve(PARTY_PARENT)]
    assert "harvard-executive-function" not in ids


def test_party_safety_question_retrieves_risky_behaviour_page():
    ids = [p.source.id for p in get_retriever().retrieve("How can I talk about staying safe at a party?")]
    assert "unicef-teens-risky-behaviour" in ids
