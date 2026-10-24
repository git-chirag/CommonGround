"""The interface every LLM provider implements."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence

from .types import LLMResponse, Message


class LLMProvider(ABC):
    name: str

    @abstractmethod
    def generate_response(
        self,
        messages: Sequence[Message],
        system_prompt: str | None = None,
        temperature: float | None = None,
        context: Sequence[str] | None = None,
    ) -> LLMResponse:
        """Generate a reply to a conversation.

        ``context`` carries caller-supplied evidence passages (e.g. RAG results).
        Providers must not raise for expected failures; they return an
        ``LLMResponse`` with ``error`` set. Providers that cannot honour
        ``temperature`` ignore it.
        """
