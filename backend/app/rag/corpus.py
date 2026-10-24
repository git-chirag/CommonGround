"""Load the curated corpus (markdown + front matter) and split it into overlapping chunks."""

from __future__ import annotations

import re
from pathlib import Path

from .types import Chunk, Source

DEFAULT_CORPUS_DIR = Path(__file__).resolve().parents[2] / "data" / "corpus"
REQUIRED = ("id", "title", "publisher", "url", "accessed", "kind", "verified_via")


class CorpusError(ValueError):
    pass


def parse_document(raw: str, name: str) -> tuple[Source, str]:
    """Parse `---\\nkey: value\\n---\\nbody`. Minimal on purpose: no YAML dependency."""
    parts = raw.split("---", 2)
    if len(parts) != 3 or parts[0].strip():
        raise CorpusError(f"{name}: missing front matter")
    meta: dict[str, str] = {}
    for line in parts[1].strip().splitlines():
        key, sep, value = line.partition(":")
        if not sep:
            raise CorpusError(f"{name}: bad front matter line")
        meta[key.strip()] = value.strip().strip('"')
    missing = [k for k in REQUIRED if not meta.get(k)]
    if missing:
        raise CorpusError(f"{name}: missing fields {missing}")
    if not meta["url"].startswith("https://"):
        raise CorpusError(f"{name}: url must be https")
    body = parts[2].strip()
    if not body:
        raise CorpusError(f"{name}: empty body")
    source = Source(
        id=meta["id"],
        title=meta["title"],
        publisher=meta["publisher"],
        url=meta["url"],
        published=meta.get("published") or None,
        accessed=meta["accessed"],
        kind=meta["kind"],
        verified_via=meta["verified_via"],
        topics=tuple(t.strip() for t in meta.get("topics", "").split(",") if t.strip()),
    )
    return source, body


_SENTENCE = re.compile(r"(?<=[.!?])\s+")


def chunk_text(text: str, max_words: int = 80, overlap_sentences: int = 1) -> list[str]:
    """Group whole sentences into ~max_words chunks; each repeats the previous chunk's last sentence."""
    sentences = [s.strip() for s in _SENTENCE.split(" ".join(text.split())) if s.strip()]
    chunks: list[list[str]] = []
    current: list[str] = []
    words = 0
    for s in sentences:
        n = len(s.split())
        if current and words + n > max_words:
            chunks.append(current)
            current = current[-overlap_sentences:] if overlap_sentences else []
            words = sum(len(x.split()) for x in current)
        current.append(s)
        words += n
    if current and (not chunks or current != chunks[-1][-len(current) :]):
        chunks.append(current)
    return [" ".join(c) for c in chunks]


def load_chunks(directory: Path = DEFAULT_CORPUS_DIR) -> tuple[list[Source], list[Chunk]]:
    files = sorted(directory.glob("*.md"))
    if not files:
        raise CorpusError(f"no corpus files in {directory}")
    sources: list[Source] = []
    chunks: list[Chunk] = []
    seen: set[str] = set()
    for f in files:
        source, body = parse_document(f.read_text(encoding="utf-8"), f.name)
        if source.id in seen:
            raise CorpusError(f"duplicate id {source.id}")
        seen.add(source.id)
        sources.append(source)
        chunks.extend(Chunk(source, t) for t in chunk_text(body))
    return sources, chunks
