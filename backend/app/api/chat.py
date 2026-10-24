"""POST /api/chat. Knows nothing about which LLM provider is in use."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, model_validator

from ..llm import LLMErrorCode, LLMProvider, Message, get_llm_provider
from ..prompts import CHAT_SYSTEM_PROMPT

router = APIRouter(prefix="/api")

MAX_MESSAGES = 40
MAX_MESSAGE_CHARS = 4000
MAX_TOTAL_CHARS = 16000


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)

    @model_validator(mode="after")
    def _check(self) -> ChatRequest:
        if self.messages[-1].role != "user":
            raise ValueError("The last message must be from the user.")
        if sum(len(m.content) for m in self.messages) > MAX_TOTAL_CHARS:
            raise ValueError("Conversation is too long.")
        if any(not m.content.strip() for m in self.messages):
            raise ValueError("Messages must not be blank.")
        return self


class ChatResponse(BaseModel):
    reply: str


_STATUS = {
    LLMErrorCode.INVALID_INPUT: 422,
    LLMErrorCode.TIMEOUT: 504,
    LLMErrorCode.NOT_CONFIGURED: 503,
    LLMErrorCode.AUTH_FAILED: 503,
    LLMErrorCode.PROVIDER_FAILED: 502,
    LLMErrorCode.EMPTY_RESPONSE: 502,
    LLMErrorCode.UNEXPECTED_OUTPUT: 502,
}


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    llm: LLMProvider = Depends(get_llm_provider),  # noqa: B008 - standard FastAPI pattern
) -> ChatResponse:
    result = await run_in_threadpool(
        llm.generate_response,
        [Message(m.role, m.content) for m in req.messages],
        system_prompt=CHAT_SYSTEM_PROMPT,
    )
    if result.error is not None:
        # Messages are already sanitised by the provider contract.
        raise HTTPException(
            status_code=_STATUS.get(result.error.code, 502),
            detail={"code": result.error.code.value, "message": result.error.message},
        )
    return ChatResponse(reply=result.text)
