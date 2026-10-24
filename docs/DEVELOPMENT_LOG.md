# Development log

Only things that actually happened.

## Milestone 1: backend LLM module (earlier session)
- Inspected the Kiro CLI's real behavior (stdout is the answer, logs on stderr, `--trust-tools=`, `--`, `--model`).
- Built FastAPI `POST /api/chat`, `LLMProvider` interface, `KiroCliProvider`, config, safe errors. 33 tests.

## Milestone 2: frontend
**Kiro features used**
- Steering: `.kiro/steering/{product,architecture,coding-standards,safety-and-privacy}.md`, always-included, written before implementation and followed during it.
- Spec: `.kiro/specs/frontend-chat-ui/{requirements,design,tasks}.md`, written in Kiro's spec format and implemented in task order. I wrote the files directly; the interactive Specs panel approval flow was not used.
- Hooks: **not used.** I tried to read the Kiro hook docs to verify working directory and failure behavior but the pages did not return readable content (only search snippets: exit code 0 adds stdout to context). Because that could not be verified, no hook is installed. Candidate for later: a `PostTaskExec` command hook running `npm run check` in `frontend/`.
- MCP, powers: not used.

**Work done**
- Task 1-2 (backend): optional validated `parenting_stage`, `build_system_prompt`, explicit-origin CORS (no wildcard, no credentials), 422 responses no longer echo submitted input. 53 backend tests.
- Task 3: scaffolded Next.js 16.4.3 (requires Node >=20.9; local Node 26.8.1 works). Vitest + Testing Library.
- Tasks 4-8: `lib/` (types, limits, stages, api client), `useChat` hook, 11 small components, page.
- Task 9: real-browser run with headless Chrome via a throwaway `puppeteer-core` script (kept outside the repo) against the real backend and real Kiro CLI.
- Task 10: README, architecture walkthrough, this log.

**Decisions**
- Direct browser-to-FastAPI with CORS (not a Next proxy).
- Stage is validated request metadata; server builds the prompt.
- Frontend maps errors by HTTP status and owns all user-facing copy.
- No markdown renderer; replies are plain text.
- Dropped `@vitejs/plugin-react` from Vitest (Vite version mismatch broke type checking; esbuild handles JSX).
- Replaced the scaffold's Google font with a system font stack (no build-time network fetch).

**Checks run (2026-10-24)**
- Backend: `pytest` 53 passed; `ruff check .` clean.
- Frontend: `eslint`, `tsc --noEmit` clean; Vitest 27 passed (11 API client, 16 page-level); `next build` succeeded.
- Real browser end-to-end: 14/14 scripted checks passed (empty message, loading, no-stage reply, stage reply, stage change mid-conversation, retry without duplicate, suggestions per stage, 375px no horizontal overflow).

**Not verified**
- 502/503/504/422 handling was verified in unit tests only, not in the browser. The browser "unreachable backend" case was simulated by aborting one request, not by stopping the server.
- Keyboard-only and screen-reader use were not tested by hand; no accessibility audit.
- Client-side 120 s timeout is covered by a unit test with a short timeout only.

## Milestone 3: dashboards, family context, RAG
**Kiro features used:** steering files (updated: privacy scopes, sources, architecture) and a new compact spec `.kiro/specs/family-context-rag/` (requirements, design, tasks) written directly in the spec format. No hooks, MCP or powers were used (hook docs could not be read earlier, see Milestone 2).

**Work done**
- Source verification first: fetched the five requested sources. UNICEF "11 tips" (full text), UNICEF "Parenting of Adolescents" (highlights and Feb 2021 date only), Harvard homepage / Serve and Return (full) / Executive Function (description only) were readable. Both CDC URLs returned HTTP 403, so only search-result snippets were used (one CDC age page and the overview) and labelled as such; the CDC Child Development Resources page was not ingested.
- Backend: `family_context.py`, `rag/` (corpus, retrieval, format, ingest), prompt builder extended, route extended with opt-in `retrieve_sources` and optional `family_context`. Original 53 tests untouched and passing.
- Fixed during testing: the retriever returned nothing for the demo question (possessives like "teen's" and word forms were not normalised); fixed tokenisation. A browser check that passed vacuously on empty sources was tightened; the demo question was reworded to a naturally retrievable phrasing ("my teen").
- Frontend: `lib/family/*`, parent and teen dashboards (different layout, type and `data-theme` palettes), boundary panel, sources UI. Replaced the old single chat page.
- Test environment note: Node 26 exposes a method-less experimental `localStorage` that shadows jsdom's, so the test setup installs an in-memory Storage.

**Checks run (2026-10-24)**
- Backend: `pytest` 84 passed (53 original + 31 new); `ruff check .` clean.
- Frontend: eslint and `tsc` clean; Vitest 48 passed (14 API client, 6 privacy-gate, 28 app-level); `next build` succeeded.
- Real browser (headless Chrome, real backend, real Kiro CLI): 23/23 scripted checks. They covered the parent career question, request contents for both audiences, real sources matching the response metadata, teen view, dark theme, preserved chat when switching, edit/save/reset, the no-evidence path, and 375px layouts.

**Not verified / limits**
- Answer quality and balance were reviewed on two sample replies only; no systematic evaluation, no expert review.
- Whether the model cites correctly is not guaranteed; only unknown markers are stripped.
- Keyboard-only and screen-reader use not tested by hand; no accessibility audit.
- Retrieval is lexical; paraphrases can miss. The corpus is small and partly thin (see above).
