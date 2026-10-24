"""Provider selection. To add a provider, write a builder and register it."""

from __future__ import annotations

from collections.abc import Callable
from functools import lru_cache

from ..config import Settings, load_settings
from .base import LLMProvider
from .kiro_cli import KiroCliProvider


class ProviderConfigError(Exception):
    """Raised at startup/selection time for an unknown or unavailable provider."""


def _build_kiro_cli(s: Settings) -> LLMProvider:
    return KiroCliProvider(
        cli_path=s.kiro_cli_path,
        timeout_seconds=s.llm_timeout_seconds,
        model=s.llm_model,
        max_prompt_chars=s.llm_max_prompt_chars,
        max_concurrent=s.llm_max_concurrent,
    )


# Future: "gemini": _build_gemini (see README, "Adding a Gemini provider").
_BUILDERS: dict[str, Callable[[Settings], LLMProvider]] = {
    "kiro_cli": _build_kiro_cli,
}


def create_provider(settings: Settings) -> LLMProvider:
    builder = _BUILDERS.get(settings.llm_provider)
    if builder is None:
        raise ProviderConfigError(
            f"Unknown LLM_PROVIDER {settings.llm_provider!r}. Available: {', '.join(sorted(_BUILDERS))}."
        )
    return builder(settings)


@lru_cache(maxsize=1)
def get_llm_provider() -> LLMProvider:
    """Process-wide provider (used as a FastAPI dependency)."""
    return create_provider(load_settings())
