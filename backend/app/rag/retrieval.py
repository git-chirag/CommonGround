"""Lightweight lexical retrieval (BM25) behind a small interface.

To move to embeddings or a vector database later, write another class with the same
`retrieve()` signature and return it from `get_retriever()`. The chat route does not change.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from functools import lru_cache
from typing import Protocol

from .corpus import load_chunks
from .types import Chunk, Passage

_WORD = re.compile(r"[a-z']+")

_STOP = set(
    "a about above after again all also am an and any are as at be because been before being below between both "
    "but by can could did do does doing down during each few for from further had has have having he her here hers "
    "him his how i if in into is it its just me more most my no nor not of off on once only or other our out over "
    "own same she should so some such than that the their them then there these they this those through to too "
    "under until up very was we were what when where which while who whom why will with would you your yours "
    # words too common in this domain to prove relevance on their own
    "parent parents child children family kid kids help want need get make thing things way ways "
    "tell say talk ask should".split()
)

# Tiny synonym/alias map so "teenager", "adolescent" etc. all reach the same stem.
_ALIASES = {
    "teenager": "teen", "teenagers": "teen", "teenage": "teen", "teens": "teen",
    "adolescent": "teen", "adolescents": "teen", "adolescence": "teen",
    "listening": "listen", "opinions": "opinion", "careers": "career",
    "independence": "independent", "babbles": "babble", "babbling": "babble",
    "cries": "cry", "crying": "cry", "responsive": "respond", "responding": "respond",
}  # fmt: skip


def _stem(w: str) -> str:
    w = _ALIASES.get(w, w)
    if w in _ALIASES.values():
        return w
    for suf, rep in (("ies", "y"), ("sses", "ss"), ("ing", ""), ("ed", ""), ("s", "")):
        if len(w) > len(suf) + 2 and w.endswith(suf) and not (suf == "s" and w.endswith("ss")):
            return w[: -len(suf)] + rep
    return w


def _clean(word: str) -> str:
    word = word.strip("'")
    return word[:-2] if word.endswith("'s") else word  # teen's -> teen


def tokenize(text: str) -> list[str]:
    words = (_clean(w) for w in _WORD.findall(text.lower()))
    return [_stem(w) for w in words if w and w not in _STOP]


class Retriever(Protocol):
    def retrieve(self, query: str, k: int = 3) -> list[Passage]: ...


class LexicalRetriever:
    """BM25 over chunks. A passage counts as relevant only if it matches >= `min_terms`
    distinct meaningful query terms; otherwise we return nothing rather than a weak guess."""

    def __init__(self, chunks: list[Chunk], min_terms: int = 2, k1: float = 1.5, b: float = 0.75):
        self._chunks = chunks
        self._tokens = [Counter(tokenize(c.text)) for c in chunks]
        self._lens = [sum(t.values()) for t in self._tokens]
        self._avg = (sum(self._lens) / len(chunks)) if chunks else 0.0
        df: Counter[str] = Counter()
        for t in self._tokens:
            df.update(t.keys())
        n = len(chunks)
        self._idf = {w: math.log(1 + (n - d + 0.5) / (d + 0.5)) for w, d in df.items()}
        self._min_terms, self._k1, self._b = min_terms, k1, b

    def retrieve(self, query: str, k: int = 3) -> list[Passage]:
        q = set(tokenize(query))
        scored: list[tuple[float, Chunk]] = []
        for chunk, tf, length in zip(self._chunks, self._tokens, self._lens, strict=True):
            matched = [w for w in q if w in tf]
            if len(matched) < self._min_terms:
                continue
            score = 0.0
            for w in matched:
                f = tf[w]
                norm = f + self._k1 * (1 - self._b + self._b * length / (self._avg or 1))
                score += self._idf[w] * f * (self._k1 + 1) / norm
            scored.append((score, chunk))
        scored.sort(key=lambda x: x[0], reverse=True)
        out: list[Passage] = []
        seen: set[str] = set()
        for score, chunk in scored:  # best chunk per source, so sources are distinct
            if chunk.source.id in seen:
                continue
            seen.add(chunk.source.id)
            out.append(Passage(chunk.source, chunk.text, round(score, 3)))
            if len(out) == k:
                break
        return out


@lru_cache(maxsize=1)
def get_retriever() -> Retriever:
    _, chunks = load_chunks()
    return LexicalRetriever(chunks)
