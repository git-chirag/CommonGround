# CommonGround

An empathetic AI parenting companion. Choose an optional parenting stage, ask a question, and get a warm, practical
reply. It offers **general parenting support only: not medical or mental-health advice, not a diagnosis, not for
emergencies**, and its answers have not been clinically reviewed.

## What works today
- **Two dashboards** (switch at the top): a calm editorial **parent** view and an expressive **teen** view with an optional dark theme. Both use clearly labelled *fictional example profiles* that you can edit, save, and reset.
- **Structured family context** with three visible scopes (parent-private, teen-private, shared). A "What the assistant can see" panel shows exactly what is sent. Teen reflections are never sent.
- **Context-aware assistant**: balanced, nonjudgmental, aware of intention vs impact and teen autonomy; never diagnoses.
- **Small real RAG pipeline**: a hand-curated library of summaries of real pages (UNICEF, Harvard Center on the Developing Child, CDC), chunked and searched with BM25. Answers show the **sources actually retrieved** with links; if nothing matches, the UI says so.
- Chat basics: loading state, friendly errors with retry, new conversation, responsive and keyboard accessible.
- FastAPI backend with a provider-independent LLM interface and a local **Kiro CLI** provider; stage and context sent as validated request metadata; limits, timeouts, CORS allow-list, no conversation logging.

## Demo script (about 2 minutes, all fictional)
1. Parent view: note the example profile (goals: critical thinking, independence; hope: a stable career for Sam) and the "What the assistant can see" panel.
2. Click **"How can I talk with my teen about a career choice when my hopes differ…"**. The answer is balanced and shows retrieved sources (UNICEF, CDC) with links.
3. Switch to **Teen view**: different layout and identity. Sam's career ideas and reflections are private; only the goal Sam ticked "Share with family" is visible to the parent. Try **Help me plan what to say**.
4. Untick a shared goal, switch back, and see it disappear from the parent view. Toggle **Dark theme**.
5. Ask something unrelated (for example "What is the capital of France?") to see the "no sourced guidance" message.
6. Press **Reset demo** to repeat.

## Privacy boundaries and limits (please read)
- The browser holds **both** example profiles in `localStorage`; the view switch is a demo control, **not a login**. What the boundary guarantees is *what is sent to the assistant*, enforced in `buildFamilyContext` (frontend, tested) and per-audience allow-lists (backend, tested). **It is not secure isolation between real accounts.** Real use would need authentication and server-side storage.
- The profile notes and your messages go to the model through the local Kiro CLI. Do not enter real family details in this prototype.
- Retrieved sources are **related reading, not proof** that each sentence of an answer is supported, and the model may cite imperfectly (unknown `[S#]` markers are stripped). Sources are *our condensed summaries*; check the original.
- Some corpus entries are thin: the CDC pages could not be fetched by our tools, so only their opening sentences (from search results) are summarised, and the UI shows that basis. The "CDC Child Development Resources" page was **not** ingested because it could not be verified.
- Retrieval is keyword-based (BM25), so paraphrased questions can miss relevant sources.

## What does not exist yet
Crisis-handling guidance in the prompt, expert/clinical review, embeddings or a vector database, accounts, server-side persistence, streaming, a hosted LLM provider, and deployment.

## Important limitation
The LLM runs through **your locally installed, signed-in Kiro CLI**. That is a local development setup: it will not
work on a server without the CLI and login, and **remote users or judges cannot use a locally running instance**.
The provider interface exists so a hosted provider (for example Gemini) can replace it later.

## Structure
```
backend/    FastAPI, LLM module, family context, RAG (app/rag, data/corpus), tests (pytest, ruff)
frontend/   Next.js + React + TypeScript + Tailwind, tests (Vitest)
docs/       ARCHITECTURE_WALKTHROUGH.md, DEVELOPMENT_LOG.md
.kiro/      steering documents and the frontend spec
```
See [docs/ARCHITECTURE_WALKTHROUGH.md](docs/ARCHITECTURE_WALKTHROUGH.md) for diagrams and request flow.

## Prerequisites
- Python 3.11+ and Node.js 20.9+ (developed on Python 3.14, Node 26)
- Kiro CLI installed and signed in: `kiro-cli whoami`

## Run it (two terminals)

**Terminal 1: backend (port 8000)**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --env-file .env --reload
```

**Terminal 2: frontend (port 3000)**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

## Configuration
| File | Variable | Default | Purpose |
|---|---|---|---|
| `frontend/.env.local` | `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend URL used by the browser |
| `backend/.env` | `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Browser origins allowed to call the API (no `*`) |
| `backend/.env` | `LLM_PROVIDER`, `KIRO_CLI_PATH`, `LLM_TIMEOUT_SECONDS`, `LLM_MODEL` | see `backend/README.md` | LLM provider settings |

### CORS in local development
The page is served from `http://localhost:3000` and calls the API on `http://localhost:8000`: different origins, so the
browser asks the API for permission first. The backend answers only for origins listed in `CORS_ALLOWED_ORIGINS`
and allows no credentials. If you open the frontend on another host or port (for example `127.0.0.1:3000`), add it to that list. A
CORS failure looks like a generic "Can't reach CommonGround" error in the UI.

## Checks
```bash
cd backend  && .venv/bin/pytest -q && .venv/bin/ruff check .
cd backend  && .venv/bin/python -m app.rag.ingest "How can I listen better to my teenager?"   # inspect the corpus and retrieval
cd frontend && npm run check      # eslint + tsc + vitest
cd frontend && npm run build
```

## Troubleshooting
| Symptom in the UI | Likely cause |
|---|---|
| "Can't reach CommonGround" | Backend not running, wrong `NEXT_PUBLIC_API_BASE_URL`, or origin not in `CORS_ALLOWED_ORIGINS` |
| "isn't available right now" | Kiro CLI missing or signed out: run `kiro-cli whoami` / `kiro-cli login` |
| "That took too long" | Slow CLI; raise `LLM_TIMEOUT_SECONDS` |
More detail in [backend/README.md](backend/README.md).
