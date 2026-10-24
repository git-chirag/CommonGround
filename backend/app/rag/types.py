"""Plain data types for the retrieval pipeline."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Source:
    """Metadata copied verbatim from a corpus file's front matter. Nothing is invented."""

    id: str
    title: str
    publisher: str
    url: str
    published: str | None  # only if the source page states it
    accessed: str  # date WE read it
    kind: str  # "curated_summary": our own condensed wording, not a quotation
    verified_via: str
    topics: tuple[str, ...]


@dataclass(frozen=True)
class Chunk:
    source: Source
    text: str


@dataclass(frozen=True)
class Passage:
    source: Source
    text: str
    score: float
