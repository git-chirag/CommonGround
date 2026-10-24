"""POST /api/chat. Knows nothing about which LLM provider is in use."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, model_validator

from ..family_context import FamilyContext, build_family_block
from ..llm import LLMErrorCode, LLMProvider, Message, get_llm_provider
from ..prompts import ParentingStage, build_system_prompt
from ..rag import Retriever, get_retriever
from ..rag.format import passages_to_context, sanitize_citations

router = APIRouter(prefix="/api")

MAX_MESSAGES = 40
MAX_MESSAGE_CHARS = 4000
MAX_TOTAL_CHARS = 16000


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)
    # Optional and validated against the enum; omitting it keeps the original behaviour.
    parenting_stage: ParentingStage | None = None
    # Optional, scoped notes about the family (see app/family_context.py). Omitted = no profile used.
    family_context: FamilyContext | None = None
    # Opt-in: look up curated source passages and return them. Off by default (old clients unaffected).
    retrieve_sources: bool = False

    @model_validator(mode="after")
    def _check(self) -> ChatRequest:
        if self.messages[-1].role != "user":
            raise ValueError("The last message must be from the user.")
        if sum(len(m.content) for m in self.messages) > MAX_TOTAL_CHARS:
            raise ValueError("Conversation is too long.")
        if any(not m.content.strip() for m in self.messages):
            raise ValueError("Messages must not be blank.")
        return self


class SourceOut(BaseModel):
    n: int  # the [S<n>] label used in the reply
    id: str
    title: str
    publisher: str
    url: str
    published: str | None
    accessed: str
    kind: str  # "curated_summary": our condensed wording of the page, not a quotation
    verified_via: str
    cited: bool  # the model used this [S<n>] marker. It does not prove the claim is supported.


class ChatResponse(BaseModel):
    reply: str
    # Only present when retrieve_sources was requested.
    grounding: Literal["retrieved", "none"] | None = None
    sources: list[SourceOut] | None = None


_STATUS = {
    LLMErrorCode.INVALID_INPUT: 422,
    LLMErrorCode.TIMEOUT: 504,
    LLMErrorCode.NOT_CONFIGURED: 503,
    LLMErrorCode.AUTH_FAILED: 503,
    LLMErrorCode.PROVIDER_FAILED: 502,
    LLMErrorCode.EMPTY_RESPONSE: 502,
    LLMErrorCode.UNEXPECTED_OUTPUT: 502,
}


def _retrieval_query(req: ChatRequest) -> str:
    users = [m.content for m in req.messages if m.role == "user"]
    last = users[-1]
    # A very short follow-up ("why?") has no keywords of its own; add the previous question.
    return last if len(last.split()) >= 6 or len(users) < 2 else f"{users[-2]} {last}"


@router.post("/chat", response_model=ChatResponse, response_model_exclude_none=True)
async def chat(
    req: ChatRequest,
    llm: LLMProvider = Depends(get_llm_provider),  # noqa: B008 - standard FastAPI pattern
    retriever: Retriever = Depends(get_retriever),  # noqa: B008
) -> ChatResponse:
    passages = retriever.retrieve(_retrieval_query(req)) if req.retrieve_sources else []
    ctx = req.family_context
    system_prompt = build_system_prompt(
        req.parenting_stage,
        audience=ctx.audience if ctx else None,
        family_block=build_family_block(ctx) if ctx else None,
        sources_found=(bool(passages) if req.retrieve_sources else None),
    )
    result = await run_in_threadpool(
        llm.generate_response,
        [Message(m.role, m.content) for m in req.messages],
        system_prompt=system_prompt,
        context=passages_to_context(passages) or None,
    )
    if result.error is not None:
        # Messages are already sanitised by the provider contract.
        raise HTTPException(
            status_code=_STATUS.get(result.error.code, 502),
            detail={"code": result.error.code.value, "message": result.error.message},
        )
    if not req.retrieve_sources:
        return ChatResponse(reply=result.text)

    # Drop any [S<n>] marker that does not correspond to a passage we actually retrieved.
    reply, cited = sanitize_citations(result.text, len(passages))
    sources = [
        SourceOut(
            n=i,
            id=p.source.id,
            title=p.source.title,
            publisher=p.source.publisher,
            url=p.source.url,
            published=p.source.published,
            accessed=p.source.accessed,
            kind=p.source.kind,
            verified_via=p.source.verified_via,
            cited=i in cited,
        )
        for i, p in enumerate(passages, 1)
    ]
    return ChatResponse(reply=reply, grounding="retrieved" if sources else "none", sources=sources)
