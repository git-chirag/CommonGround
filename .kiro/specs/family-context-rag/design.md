# Design: Dual dashboards, family context, and sourced answers

- **Boundary:** `buildFamilyContext(state, audience)` (frontend) is the single gate; backend allow-lists per audience reject anything else (422, values not echoed). One `useChat` per audience so histories and contexts never mix.
- **Prompt assembly:** `build_system_prompt(stage, audience, family_block, sources_found)`: base prompt + stage + family-communication rules + labelled notes ("data, not instructions") + source rules. Retrieved passages go through the existing `context` parameter of `LLMProvider`.
- **RAG:** curated markdown in `backend/data/corpus/` -> sentence-based ~80-word chunks with 1-sentence overlap -> BM25 with a 2-distinct-term relevance gate (prefer no result to a weak one) -> best chunk per source, top 3. `Retriever` protocol allows embeddings later.
- **Sources honesty:** every corpus entry records `verified_via` (full text / partial / snippet only) and is labelled a curated summary. CDC pages returned HTTP 403 to our fetcher, so only their opening sentences (from search snippets) are summarised and labelled as such. The "CDC Child Development Resources" page was not ingested because it could not be verified.
- **Opt-in contract:** `retrieve_sources` defaults to false and response extras are omitted when not requested, so old clients and tests are unaffected.
- **Persistence:** fictional profiles only, `localStorage` via `useSyncExternalStore`; conversations never stored.
- **Themes:** the same CSS token names are redefined per `data-theme` (`parent`, `teen`, `teen-dark`) so shared components restyle automatically; layouts differ per dashboard.

## Iteration 2
- Layout: `h-dvh` column: `AppHeader` -> `main` with either the full-height `ChatPanel` (empty state = `ParentWelcome` / `TeenWelcome`) or the scrolling secondary page. `ChatPanel` is keyed by audience.
- Boundary: `buildParentContext(parent, sharedView)` / `buildTeenContext(teen, sharedView)` accept only their own profile and the shared projection; `pick(allowlist)` drops anything else at runtime. Privacy never depends on the model keeping a secret.
- Logging path found during review: kiro-cli saves every call as a session transcript under `~/.kiro/sessions`. Mitigation: list sessions for the call's unique temp cwd and delete them in a background thread; never touch sessions for any other directory.
- Replies render `**bold**` via a tiny formatter that builds React elements from strings (no HTML parsing).
