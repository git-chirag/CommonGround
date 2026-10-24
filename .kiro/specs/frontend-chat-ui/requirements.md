# Requirements: Frontend Chat UI (Milestone 2)

## Introduction
A first usable web chat for CommonGround. The browser talks only to the existing FastAPI `POST /api/chat`,
which talks to the local Kiro CLI. The user can optionally choose a parenting stage, which is passed to the
assistant as explicit context. No database, authentication, RAG or citations in this milestone.

Terms: "stage" is one of the six parenting stages. "Backend" is the FastAPI service.

## Requirements

### R1: Welcome and scope clarity
**User story:** As a parent, I want to understand what CommonGround is and is not, so I can use it with the right expectations.

Acceptance criteria
1. WHEN the page loads THEN the system SHALL show a short introduction to CommonGround.
2. The system SHALL show a visible notice that it offers general parenting support and does not provide medical or mental-health diagnosis or emergency help, and that the user should contact a qualified professional or local emergency services for urgent or clinical concerns.
3. The system SHALL NOT display testimonials, credentials, effectiveness claims, citations or statements that answers are evidence-based, validated or clinically reviewed.

### R2: Optional parenting stage
**User story:** As a parent, I want to say which stage I am in, so suggestions fit my situation, without being forced to.

Acceptance criteria
1. The system SHALL offer these stages: Preparing for parenthood; Pregnancy and infancy; Early childhood; School-age children; Adolescence; Adult family relationships.
2. The system SHALL let the user skip stage selection and start chatting immediately.
3. WHEN a stage is selected THEN the system SHALL send it with every subsequent chat request as `parenting_stage` until it is changed or cleared.
4. WHEN no stage is selected THEN the system SHALL omit `parenting_stage` from the request.
5. The user SHALL be able to change or clear the stage at any time without losing the conversation.
6. The stage SHALL NOT be persisted beyond the browser session.

### R3: Chat
**User story:** As a parent, I want to ask a question and read the answer in a conversation.

Acceptance criteria
1. The system SHALL provide a text input and a send button; Enter sends, Shift+Enter inserts a newline.
2. WHEN the user sends a message THEN the system SHALL show it immediately as a user bubble and send `{messages, parenting_stage?}` containing the full session history to `POST {API_BASE_URL}/api/chat`.
3. WHEN the backend returns `{reply}` THEN the system SHALL append it as an assistant bubble.
4. Conversation history SHALL live in frontend state for the current page session only.
5. WHEN the input is blank or whitespace THEN the system SHALL NOT send a request.
6. WHEN a request is in flight THEN the system SHALL prevent sending another.
7. Message text SHALL be rendered as plain text (never as HTML).
8. The system SHALL offer a "New conversation" action that clears history.

### R4: Input limits
**User story:** As a user, I want clear feedback when my input is too long, instead of a confusing failure.

Acceptance criteria
1. The client SHALL enforce the backend limits (4000 chars per message, 16000 total, 40 messages) from one constants module.
2. WHEN a message exceeds the per-message limit THEN the system SHALL show a clear inline message and not send it.
3. WHEN the conversation would exceed total or message-count limits THEN the system SHALL explain this and offer to start a new conversation.

### R5: Loading state
Acceptance criteria
1. WHILE waiting for a reply THEN the system SHALL show a visible "thinking" indicator and disable sending.
2. The indicator SHALL be announced to assistive technology.
3. The client SHALL abort a request after 120 seconds and treat it as a timeout.

### R6: Error handling and retry
**User story:** As a user, when something fails I want to know what happened and be able to try again.

Acceptance criteria
1. WHEN the backend returns 503 THEN the system SHALL say the assistant is not available right now.
2. WHEN 504 or a client timeout THEN the system SHALL say the response took too long.
3. WHEN 502 or another 5xx THEN the system SHALL say the assistant could not produce a response.
4. WHEN 422 THEN the system SHALL show a generic "check your message and try again" message and SHALL NOT render raw validation detail.
5. WHEN the network fails (backend down, CORS misconfigured) or the body is not the expected JSON THEN the system SHALL show a generic connection message.
6. WHEN any error occurs THEN the system SHALL keep the user's message in history and show a Retry action that resends the same history without duplicating the user message.
7. The system SHALL NOT display stack traces, response bodies, URLs or internal codes to the user.

### R7: Suggested questions
Acceptance criteria
1. WHEN the conversation is empty THEN the system SHALL show 3 suggested questions for the selected stage (or a general set if none selected).
2. WHEN a suggestion is chosen THEN the system SHALL send it as the user's message.
3. Suggestions SHALL be neutral starting points and SHALL NOT make claims about evidence or outcomes.

### R8: Configuration and integration
Acceptance criteria
1. The backend base URL SHALL come from `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:8000`, documented in `frontend/.env.example`.
2. The existing request/response contract SHALL remain backward compatible: requests without `parenting_stage` behave as before.
3. The backend SHALL accept an optional `parenting_stage` limited to the six enum values; any other value is rejected with 422.
4. The backend SHALL add the stage guidance to the system prompt on the server; the frontend SHALL NOT send prompt text.
5. The backend SHALL allow cross-origin requests only from origins listed in `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`), for POST and the preflight, with no wildcard and no credentials.
6. The browser SHALL never invoke or reference the Kiro CLI.

### R9: Privacy
Acceptance criteria
1. The frontend SHALL NOT log message content (no `console.*` of messages/replies) and SHALL NOT use localStorage, sessionStorage, cookies, or analytics.
2. Tests and fixtures SHALL use fake text only.

### R10: Accessibility and responsiveness
Acceptance criteria
1. The layout SHALL work from 320px wide to desktop with no horizontal scrolling.
2. All controls SHALL be keyboard operable with visible focus; touch targets at least 44px.
3. The message list SHALL be a live region so new replies are announced; errors SHALL use `role="alert"`.
4. The input SHALL have an accessible label; stage options SHALL be a properly labelled radio group or equivalent.
5. Text contrast SHALL meet WCAG AA targets, and animations SHALL respect `prefers-reduced-motion`.
6. Note: automated checks and manual keyboard testing are used; full WCAG conformance needs expert/assistive-technology review and is not claimed.

### R11: Quality and documentation
Acceptance criteria
1. Existing backend tests and `ruff check .` SHALL still pass, plus new backend tests for stage and CORS.
2. Frontend lint, type check and unit/component tests SHALL pass.
3. README SHALL document setup, configuration and running both services.
4. `docs/DEVELOPMENT_LOG.md` SHALL record milestones, Kiro features actually used, checks run, and decisions.
