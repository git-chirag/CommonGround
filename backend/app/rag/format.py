"""Turn retrieved passages into provider context, and sanitise citation markers in the reply."""

from __future__ import annotations

import re
from collections.abc import Sequence

from .types import Passage

_MARKER = re.compile(r"\s?\[S(\d+)\]")


def passages_to_context(passages: Sequence[Passage]) -> list[str]:
    """One context string per passage, labelled [S1], [S2]... with honest provenance."""
    out = []
    for i, p in enumerate(passages, 1):
        s = p.source
        out.append(
            f"[S{i}] {s.title} ({s.publisher}). Note: this is a condensed summary written for CommonGround "
            f"from the source page, not a direct quotation.\n{p.text}"
        )
    return out


def sanitize_citations(reply: str, n_sources: int) -> tuple[str, list[int]]:
    """Remove [Sn] markers that do not match a retrieved source; return (text, cited numbers)."""
    cited: list[int] = []

    def fix(m: re.Match[str]) -> str:
        n = int(m.group(1))
        if 1 <= n <= n_sources:
            if n not in cited:
                cited.append(n)
            return m.group(0)
        return ""

    return _MARKER.sub(fix, reply), cited
