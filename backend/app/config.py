"""Environment-based configuration. Values are read lazily, never hard-coded."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    llm_provider: str = "kiro_cli"
    kiro_cli_path: str = "kiro-cli"
    llm_timeout_seconds: float = 90.0
    llm_model: str | None = None
    llm_max_prompt_chars: int = 24000
    llm_max_concurrent: int = 2
    cors_allowed_origins: tuple[str, ...] = ("http://localhost:3000",)
    kiro_cli_delete_sessions: bool = True


def _origins() -> tuple[str, ...]:
    raw = os.environ.get("CORS_ALLOWED_ORIGINS", "").strip()
    if not raw:
        return ("http://localhost:3000",)
    origins = tuple(o.strip().rstrip("/") for o in raw.split(",") if o.strip())
    if "*" in origins:
        raise ValueError("CORS_ALLOWED_ORIGINS must list explicit origins; '*' is not allowed.")
    return origins


def _bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    if raw in ("1", "true", "yes", "on"):
        return True
    if raw in ("0", "false", "no", "off"):
        return False
    raise ValueError(f"{name} must be true or false.")


def _float(name: str, default: float) -> float:
    raw = os.environ.get(name, "").strip()
    return float(raw) if raw else default


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    return int(raw) if raw else default


def load_settings() -> Settings:
    return Settings(
        llm_provider=os.environ.get("LLM_PROVIDER", "kiro_cli").strip().lower() or "kiro_cli",
        kiro_cli_path=os.environ.get("KIRO_CLI_PATH", "").strip() or "kiro-cli",
        llm_timeout_seconds=_float("LLM_TIMEOUT_SECONDS", 90.0),
        llm_model=os.environ.get("LLM_MODEL", "").strip() or None,
        llm_max_prompt_chars=_int("LLM_MAX_PROMPT_CHARS", 24000),
        llm_max_concurrent=_int("LLM_MAX_CONCURRENT", 2),
        cors_allowed_origins=_origins(),
        kiro_cli_delete_sessions=_bool("KIRO_CLI_DELETE_SESSIONS", True),
    )
