# CommonGround

An empathetic AI parenting companion. Choose an optional parenting stage, ask a question, and get a warm, practical
reply. It offers **general parenting support only: not medical or mental-health advice, not a diagnosis, not for
emergencies**, and its answers have not been clinically reviewed.

## What works today
- **Conversation-first app** with two distinct experiences (switch at the top): a calm, editorial **parent** view and a bold, expressive **teen** view with optional dark mode. Each opens on a full-height chat with conversation starters; profile notes live one click away in **Family context** / **My space** (editable, saveable, resettable fictional examples).
- **Strict audience scoping**: each request contains only the active person's chat, their own notes (if enabled) and what the family has explicitly shared. The other person's private notes, chats and the teen's reflections are never sent. A compact "What the assistant can see" bar above the composer shows exactly what goes out.
- **Perspective support**: the assistant offers possibilities, not verdicts, about what another person might feel, says behavior alone can't establish a cause, suggests gentle openers, never pressures a teen to disclose, and points to real-world help if serious risk is described (prompt-level only).
- **Small real RAG pipeline** over a curated library (UNICEF, Harvard Center on the Developing Child, CDC). Answers show the sources actually retrieved, or say none matched. Sources are general guidance, not evidence about a particular person.
- FastAPI backend with a provider-independent LLM interface and a local **Kiro CLI** provider; limits, timeouts, CORS allow-list, no conversation logging, and automatic deletion of the CLI's saved session transcripts.

## Demo script (all fictional)

### Guided scenario: Party Night (about 3 minutes)
A teenage daughter (Maya) wants to wear an outfit she likes to a party. Her father (David) objects because he worries
about how other people might behave, it escalates, and she leaves upset. The point is not who is right: it is how each
of them can understand possible perspectives and prepare for a real conversation.

1. Choose **Demo scenario: Party Night**, then **Reset demo**.
2. **Teen view** -> click **Explain my side**. Answer shows UNICEF sources. Open the "Personalised with..." bar: only
   Maya's notes and the shared goals are sent.
3. Teen **Plan** -> **Fill in demo example** (Maya's note about feeling she had to wear a short dress like her friends,
   while also liking it) -> **Review before sharing** -> **Share this with David**. Nothing crosses before this click.
4. **Parent view** -> **Plan**: David sees exactly Maya's approved note under "Shared with you by Maya", nothing else.
5. Parent **Chat** -> click **Repair after an argument**. The answer can now take the pressure Maya chose to share into
   account, apologises for *how* the concern came out, keeps safety planning separate from her clothing, and shows a
   UNICEF source.
6. **Reset demo** restores the fictional data, removes shared notes and clears both chats.

### Career conversation (the original example)
Choose **Demo scenario: Career conversation**, then try **Understand a perspective** or **Prepare a conversation** in
the parent view and **Prepare for a hard talk** in the teen view.

## Privacy boundaries and limits (please read)
- The browser holds **both** example profiles in `localStorage`; the view switch is a demo control, **not a login**. What the boundary guarantees is *what is sent to the assistant*, enforced in `buildFamilyContext` (frontend, tested) and per-audience allow-lists (backend, tested). **It is not secure isolation between real accounts.** Real use would need authentication and server-side storage.
- Nothing crosses between the two people unless it is a shared goal or routine, a teen goal the teen ticked to share, or a note someone wrote, reviewed and approved with **Share** on the Plan page (withdrawable). Drafts are never stored or sent.
- Privacy is enforced by what each request *contains* (separate audience builders, allow-lists on both ends, separate chat histories), not by asking the model to keep secrets. This is tested at the browser request and at the exact CLI argv.
- The profile notes and your messages go to the model through the local Kiro CLI, under your Kiro account. The CLI saves each call as a local session transcript; the backend deletes those after each call by default. Do not enter real family details in this prototype.
- Retrieved sources are **related reading, not proof** that each sentence of an answer is supported, and the model may cite imperfectly (unknown `[S#]` markers are stripped). Sources are *our condensed summaries*; check the original.
- Some corpus entries are thin: the CDC pages could not be fetched by our tools, so only their opening sentences (from search results) are summarised, and the UI shows that basis. The "CDC Child Development Resources" page was **not** ingested because it could not be verified.
- Retrieval is keyword-based (BM25), so paraphrased questions can miss relevant sources.

## What does not exist yet
A reviewed crisis protocol (there is only a prompt-level instruction), expert/clinical review, embeddings or a vector database, accounts, server-side persistence, streaming, a hosted LLM provider, and deployment.

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
