# Design: Frontend Chat UI

## 1. Current architecture, and one request traced

```
Browser (Next.js, :3000)
  └─ fetch POST http://localhost:8000/api/chat      (cross-origin, so CORS needed)
       FastAPI (:8000)  app/api/chat.py
         1. Pydantic ChatRequest validates shape and limits  -> 422 on failure
         2. route calls LLMProvider.generate_response(...) in a worker thread
              factory.get_llm_provider() returned KiroCliProvider (chosen by LLM_PROVIDER)
         3. KiroCliProvider builds one prompt (system text + transcript), then runs
              kiro-cli chat --no-interactive --trust-tools= -- "<prompt>"   (argument list, temp cwd, timeout)
         4. stdout = answer, stderr = ignored logs; exit code and output are checked
         5. returns LLMResponse(text) or LLMResponse(error)
         6. route: error -> HTTPException(503/504/502, {code, message}); success -> {"reply": text}
  └─ browser appends reply to history
```
The route only knows `LLMProvider`. Swapping to Gemini later changes the factory and one provider file.

## 2. Contract the frontend relies on
| Case | Status | Body |
|---|---|---|
| Success | 200 | `{"reply": string}` |
| Provider not available / not signed in | 503 | `{"detail": {"code", "message"}}` |
| Timeout | 504 | same |
| Provider failure / empty / bad output | 502 | same |
| Request validation | 422 | `{"detail": [ ... ]}` (a list, may echo input) |
| Backend down / CORS blocked | no response | `fetch` throws `TypeError` |
The client maps by **HTTP status**, not by parsing `detail`, and uses its own friendly copy. Rationale: the 422
shape differs from the others, and not rendering server text means a backend change can never leak internals to the UI.

## 3. Backend changes (smallest backward-compatible)
1. `ChatRequest.parenting_stage: ParentingStage | None = None`, where `ParentingStage` is a `str` enum of
   `preparing | pregnancy_infancy | early_childhood | school_age | adolescence | adult_relationships`.
   Existing clients that omit it are unaffected.
2. `app/prompts.py`: `build_system_prompt(stage) -> str` returns `CHAT_SYSTEM_PROMPT` plus one line from a
   `STAGE_GUIDANCE` dict (for example "The user is parenting an adolescent; keep suggestions suitable for teenagers."). The
   route calls it and passes the result as `system_prompt`. Adding or editing a stage is a one-line dict change.
3. `app/main.py`: `CORSMiddleware`, `allow_origins` from `CORS_ALLOWED_ORIGINS` (comma-separated),
   `allow_methods=["POST","GET","OPTIONS"]`, `allow_headers=["content-type"]`, `allow_credentials=False`.
   Add to `Settings` and `.env.example`.

**Why a structured field and not text in the user message?** It keeps history clean, lets the server own the
prompt (the browser never sends instructions), validates against an enum so it can't inject arbitrary text,
and moves to a hosted provider unchanged.

**Why CORS and not a Next.js proxy?** Direct calls match "backend URL from an env var" and teach CORS. A proxy
(`next.config` rewrites) avoids CORS but adds a hop and hides the real topology. Trade-off accepted; the proxy is
an easy later swap because only `lib/api.ts` knows the URL.

## 4. Frontend architecture
Next.js (App Router) + React + strict TypeScript + Tailwind. One page, client components, local state. No state
library, no UI kit, no markdown renderer (replies are rendered as plain text with `whitespace-pre-wrap`, which is
XSS-safe and avoids a dependency).

```
frontend/
  src/
    app/layout.tsx, page.tsx, globals.css
    components/
      ChatPage.tsx        composes everything; owns stage + useChat
      Header.tsx          name, tagline, "New conversation"
      Disclaimer.tsx      scope notice (always visible)
      StagePicker.tsx     radio group + Skip; also used to change stage
      SuggestedQuestions.tsx
      MessageList.tsx     live region, auto-scroll
      MessageBubble.tsx
      ThinkingIndicator.tsx
      ErrorBanner.tsx     role=alert + Retry
      ChatInput.tsx       textarea, counter, send button
    hooks/useChat.ts      messages, status, error, send, retry, reset
    lib/
      types.ts            Message, ParentingStage, ChatError
      limits.ts           MAX_* constants mirroring backend
      stages.ts           stage ids, labels, suggested questions (single source)
      api.ts              sendChat(): fetch, timeout, status -> ChatError
  tests/
  .env.example            NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Responsibilities
- `api.ts`: the only code that calls `fetch` or knows the URL/contract. Returns `string` or throws `ChatError{kind}`;
  kinds: `unavailable | timeout | failed | invalid | network`. Uses `AbortController` (120 s).
- `useChat(stage)`: state `{messages, status: idle|loading|error, errorKind}`. `send(text)` validates limits,
  appends the user message, calls `sendChat`. `retry()` re-calls with existing history (no duplicate). `reset()` clears.
  Guards against double sends and ignores a result that arrives after `reset()`.
- Components are presentational; they receive props and callbacks.

### State rules
- Stage: `useState<ParentingStage | null>` in `ChatPage`. Changing it never clears messages.
- After an error the user message stays; backend allows consecutive user messages as long as the last is a user message, so a new send also works.
- Suggested questions render only when `messages.length === 0`.
- Onboarding is not a blocking step: the stage picker is shown on the empty chat screen with a "Skip" option, and remains available as a compact control in the header.

### Error copy (client-owned)
unavailable: "CommonGround's assistant isn't available right now. Please try again in a bit."
timeout: "That took too long. Please try again."
failed: "I couldn't put a response together. Please try again."
invalid: "Please check your message and try again."
network: "Can't reach CommonGround right now. Check your connection and try again."

## 5. UI design notes
Warm palette (soft cream background, deep teal/sage accent, warm amber highlights), rounded bubbles, generous
spacing, one centered column (max ~42rem) on desktop, full width on mobile, input pinned to the bottom, `dvh` for
mobile browsers. Disclaimer sits under the header as a slim, always-visible note. Fonts: system stack (no
network font fetch).

## 6. Accessibility
Landmarks (`header`, `main`, form), `<label>` on the textarea, `fieldset/legend` radio group for stage,
`role="log"` + `aria-live="polite"` on the message list, `role="status"` thinking indicator, `role="alert"` errors,
`:focus-visible` rings, disabled-state not relying on colour alone, `prefers-reduced-motion` respected, focus
returns to the textarea after send/retry/reset.

## 7. Testing strategy
- Backend (pytest): stage accepted, omitted still works, invalid stage 422, stage guidance reaches the provider's
  `system_prompt`, CORS preflight allowed for configured origin and not for others.
- Frontend (Vitest + React Testing Library + jsdom, `fetch` mocked, fake text only):
  - `api.ts`: request body/URL/headers, `parenting_stage` omitted when null, each status -> error kind, network error, timeout abort.
  - `useChat`/`ChatPage`: send, loading state, success, error + retry without duplicate, reset, double-send guard, limits.
  - Components: ChatInput (Enter/Shift+Enter, blank, counter), StagePicker, suggestions per stage.
  - Basic a11y assertions (roles/labels) via Testing Library queries.
- Static: `tsc --noEmit`, ESLint.
- Manual end-to-end with the real Kiro CLI (checklist in tasks).
- Not covered: visual regression, real-browser E2E, full a11y audit.

## 8. Dependencies (all justified)
next, react, react-dom, typescript, tailwindcss (via create-next-app); eslint (+ next config); vitest,
@testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom, @vitejs/plugin-react.
Versions pinned at scaffold time. Local Node is v26.8.1; compatibility will be verified, and if Next has issues
on it, we document the supported LTS instead of hacking around it.

## 9. Kiro hook (proposed, not installed)
Candidate: a `PostTaskExec` command hook running `npm run lint && npm run typecheck && npm test` in `frontend/`.
Reason: runs once per completed spec task, not on every save, so it is cheap and not noisy. Before installing,
verify in the current Kiro docs the command's working directory, stdin payload and failure behavior; then install
with `createHook` and test it on a trivial task. Until verified, no hook is committed.

## 10. Risks / open points
- Kiro CLI replies take several seconds; UX relies on a clear thinking state.
- CORS misconfiguration looks like a generic network error in the browser; README troubleshooting covers it.
- Stage guidance is a prompt hint only: it improves fit but is not validated or clinical.
- Crisis-handling language is not in the system prompt yet; out of scope here and recorded as a known gap.
