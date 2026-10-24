# CommonGround: architecture

Monorepo, two services, no database.

```
backend/    FastAPI (Python). Run from backend/: uvicorn app.main:app --env-file .env --reload  (port 8000)
frontend/   Next.js + React + TypeScript + Tailwind (port 3000; lib/api.ts is the only code that calls fetch)
docs/       DEVELOPMENT_LOG.md
.kiro/      steering + specs (committed on purpose)
```

## Backend (exists, tested)
- `app/api/chat.py`: `POST /api/chat`. The route does not know which LLM provider is used.
- `app/llm/`: provider-independent interface `LLMProvider.generate_response(messages, system_prompt,
  temperature, context)` returning `LLMResponse` (text, provider, model, usage, error). Providers return
  errors instead of raising. `factory.py` picks the provider from `LLM_PROVIDER`.
- `app/llm/kiro_cli.py`: runs the local Kiro CLI via an argument list. Local development only; not for deployment.
- `app/prompts.py`: the application-level system prompt. Parenting logic lives here, never in `app/llm/`.
- `app/config.py`: settings from environment variables. Secrets never in code.
- Tests: `cd backend && pytest` and `ruff check .` (use the venv in `backend/.venv`).

## API contract
Request: `{"messages": [{"role": "user"|"assistant", "content": "..."}]}`. Last message must be `user`.
Limits: 40 messages, 4000 chars per message, 16000 chars total. Blank messages are rejected.
Success: `200 {"reply": "..."}`.
Errors:
- Provider errors: `{"detail": {"code": "...", "message": "<safe text>"}}` with 503, 504 or 502.
- Request validation: `422 {"detail": [{loc, msg, type}, ...]}`; submitted input is deliberately not echoed. The frontend must not display it raw.
- The frontend must also handle network failures and non-JSON responses.
The browser never talks to the Kiro CLI; only the FastAPI server does.

## Implemented this milestone (backward compatible)
- Optional `parenting_stage` enum field on the request, turned into extra system-prompt guidance in `app/prompts.py`.
- CORS middleware with origins from `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`).

## Family context and RAG (added)
- Request extras, all optional: `family_context {audience, own, shared}`, `retrieve_sources` (bool). Response extras (only when sources were requested): `grounding` ("retrieved"|"none"), `sources[]`.
- `app/family_context.py`: allow-listed scoped fields -> prompt block. `app/rag/`: `corpus.py` (curated markdown + chunking), `retrieval.py` (BM25 behind the `Retriever` protocol; swap in embeddings by writing another class), `format.py` (passage labels, strips unknown `[S#]` markers). `python -m app.rag.ingest` validates the corpus.
- Frontend: `AppShell` -> `ParentDashboard` / `TeenDashboard` (different layouts and `data-theme` token sets), shared `ChatPanel`, `lib/family/` (types, seed, store, context), one `useChat` per audience.

See `.kiro/specs/frontend-chat-ui/` and `.kiro/specs/family-context-rag/` for the specs.
