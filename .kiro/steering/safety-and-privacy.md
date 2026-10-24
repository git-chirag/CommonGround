# CommonGround: safety and privacy

## Tone and scope
- Nonjudgmental, supportive, practical. Parents are doing their best.
- The assistant gives general parenting support. It must not diagnose medical, developmental or
  mental-health conditions, or prescribe treatment.
- For medical, safety, abuse or mental-health concerns, the product points to a qualified professional or
  local emergency services. The UI always shows a visible disclaimer to this effect.

## Evidence honesty
- No fabricated studies, statistics, quotes or citations. Do not add a "sources" UI until real retrieval exists.
- Do not describe answers as evidence-based, validated, clinically reviewed or expert-approved. They are not
  (RAG, citation checking and clinical evaluation do not exist yet).
- No fake testimonials, user counts, credentials or effectiveness claims in UI or docs.

## Privacy
- Collect the minimum: chat text, an optional parenting stage, and optional self-entered family notes. No accounts, emails or analytics.
- Conversations live only in frontend memory for the current page session. They are never written to storage.
- The FICTIONAL example family profiles (and edits to them) are kept in `localStorage` under one key so the demo survives a refresh; "Reset demo" deletes it. No cookies, no database. Do not put real family details in the demo.
- Never log full conversations or CLI output, in backend or frontend. Tests and fixtures use fake text only.
- Never commit `.env` or credentials. `.env.example` holds placeholders only.
- Never expose the Kiro CLI, executable paths, env vars or raw errors to the browser.

## Known gap
`backend/app/prompts.py` does not yet have explicit crisis-handling guidance. Treat that as future work; do not
claim crisis support exists.

## Family context scopes (prototype)
- Three scopes: parent-private, teen-private, shared. `frontend/src/lib/family/context.ts#buildFamilyContext` is the ONLY place that decides what leaves the browser: the current audience's private fields plus shared fields. Teen reflections are never sent.
- The backend (`app/family_context.py`) enforces per-audience allow-lists; the other side's private keys are a 422 that does not echo values.
- This is NOT secure isolation: there are no accounts, the browser holds both profiles, and a demo switch picks the view. Never describe it as secure or as separate accounts.
- Never infer religion, beliefs, identity, career preference or psychological traits. Worldview is optional and self-described. Never present a parent-teen disagreement as misbehavior or side with either.

## Sources (RAG)
- Only curated summaries of pages we actually read (`backend/data/corpus/`, with `verified_via`). Dates only if the page states them. Label them as our summaries.
- UI shows only sources actually retrieved; no match means say so. Retrieved does not mean every sentence is supported. Never claim answers are validated.
