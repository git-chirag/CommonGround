# Implementation plan: Frontend Chat UI

Each task is one reviewable increment: explain, implement, run checks, summarize, give a manual checklist.

- [x] 1. Backend: optional parenting stage
  - Add `ParentingStage` enum and `parenting_stage` (optional) to `ChatRequest`; add `STAGE_GUIDANCE` and `build_system_prompt()` in `app/prompts.py`; use it in the route
  - Add pytest tests (stage forwarded to system prompt, omitted still works, invalid value 422)
  - Run `pytest` and `ruff check .`
  - _Requirements: R2.3, R2.4, R8.2, R8.3, R8.4, R11.1_

- [x] 2. Backend: CORS for local development
  - Add `cors_allowed_origins` to `Settings`, `CORSMiddleware` in `main.py`, document in `.env.example`
  - Tests: preflight allowed for configured origin, rejected for others
  - _Requirements: R8.5, R11.1_

- [x] 3. Scaffold the frontend
  - `create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/`), add Vitest + Testing Library, `typecheck` and `test` scripts, `.env.example`, `.gitignore`
  - Verify `npm run dev`, `lint`, `typecheck`, `test` all run on the empty app
  - _Requirements: R8.1, R11.2_

- [x] 4. Types, limits, stages and API client
  - `lib/types.ts`, `lib/limits.ts`, `lib/stages.ts`, `lib/api.ts` with status-to-error mapping and 120 s abort
  - Unit tests for every status class, network failure, timeout, stage omitted when null
  - _Requirements: R2.1, R2.3, R2.4, R4.1, R5.3, R6.1-R6.5, R6.7, R8.1_

- [x] 5. Chat state hook
  - `hooks/useChat.ts`: send, retry (no duplicate), reset, limits checks, double-send guard, stale-result guard
  - Hook tests with mocked `sendChat`
  - _Requirements: R3.2-R3.6, R3.8, R4.2, R4.3, R5.1, R6.6, R9.1_

- [x] 6. Core chat components
  - `MessageBubble`, `MessageList` (live region, auto-scroll), `ThinkingIndicator`, `ChatInput` (label, Enter/Shift+Enter, counter, disabled while loading)
  - Component tests
  - _Requirements: R3.1, R3.7, R4.2, R5.1, R5.2, R10.3, R10.4_

- [x] 7. Welcome, stage picker, disclaimer, suggestions
  - `Header`, `Disclaimer`, `StagePicker` (radio group, Skip, change later), `SuggestedQuestions` (3 per stage + general set)
  - Component tests
  - _Requirements: R1.1-R1.3, R2.1, R2.2, R2.5, R7.1-R7.3_

- [x] 8. Compose the page and error handling
  - `ChatPage` + `ErrorBanner` with Retry; wire stage into `useChat`; responsive layout and visual polish; reduced-motion; focus management
  - Integration tests: full send -> loading -> reply; error -> retry -> success; stage sent in body; reset
  - _Requirements: R2.3, R2.5, R3, R6, R10, R11.2_

- [x] 9. End-to-end verification with the real Kiro CLI
  - Start backend and frontend, run the manual checklist (stage chosen, message, real reply, stop backend to see network error, long message limit, keyboard-only pass, 320px width)
  - Record what was and was not verified
  - _Requirements: all, Phase 7 completion criteria_

- [x] 10. Documentation and development log
  - Root `README.md` (setup, config, run both services, CORS, troubleshooting); `docs/DEVELOPMENT_LOG.md` (only what actually happened); decision summary for interviews; verify the proposed hook against current Kiro docs and install only if it behaves correctly
  - _Requirements: R11.3, R11.4_

## Completion notes
- Task 2: CORS was done together with Task 1.
- Task 9: browser run used headless Chrome automation; manual keyboard-only and screen-reader passes were NOT done.
- Task 10: the Kiro hook was not installed, because its working-directory and failure semantics could not be verified from the docs.
