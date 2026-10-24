"""Validate and summarise the curated corpus:  python -m app.rag.ingest [query ...]

There is no crawler. The corpus is a small set of hand-curated markdown files under
`data/corpus/`, each summarising a page we actually read (see `verified_via`). This command
re-parses every file, checks the metadata, and optionally runs sample queries.
"""

from __future__ import annotations

import sys

from .corpus import load_chunks
from .retrieval import LexicalRetriever


def main(queries: list[str]) -> int:
    sources, chunks = load_chunks()
    print(f"{len(sources)} sources, {len(chunks)} chunks")
    for s in sources:
        n = sum(1 for c in chunks if c.source.id == s.id)
        print(f"- {s.id}: {n} chunks | published={s.published or 'n/a'} | {s.verified_via}")
    retriever = LexicalRetriever(chunks)
    for q in queries:
        print(f"\nQ: {q}")
        hits = retriever.retrieve(q)
        if not hits:
            print("  (no relevant passages)")
        for p in hits:
            print(f"  {p.score:6.2f}  {p.source.title}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
