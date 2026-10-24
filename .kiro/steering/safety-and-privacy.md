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

## Perspective support
- Separate observable behavior from interpretations; offer several general possibilities with uncertain language;
  say behavior alone cannot establish a cause; suggest gentle openers; never state another person's inner state as fact.
- Teens: help them say what they want understood and set boundaries; never pressure disclosure; do not cast the parent
  as wrong by default.

## Risk and crisis (limited)
`SAFETY_LINE` in `backend/app/prompts.py` tells the model to point to emergency services or a professional when serious
risk is described. That is a prompt instruction only, not a tested crisis protocol, detector or escalation path. Do not
describe it as crisis support.

## Family context scopes (prototype)
- Three scopes: parent-private, teen-private, shared. `frontend/src/lib/family/context.ts#buildFamilyContext` is the ONLY place that decides what leaves the browser: the current audience's private fields plus shared fields. Teen reflections are never sent.
- Privacy is enforced in code, not by asking the model to keep secrets: each request only ever CONTAINS the active audience's data. Never send both profiles and rely on the prompt to conceal one.
- Separate builders per audience (`buildParentContext`, `buildTeenContext`) with explicit allow-lists; the only cross-audience input is `sharedView()`. Separate chat histories per audience; nothing derived (summaries, inferences) from one side's private data is ever produced or sent.
- The backend (`app/family_context.py`) enforces per-audience allow-lists; the other side's private keys are a 422 that does not echo values. The backend is stateless between requests.
- RAG retrieves only from the static curated corpus, using the conversation only (never profile notes) as the query.
- The Kiro CLI stores each call's transcript in `~/.kiro/sessions` (memory disabled for those sessions). The provider deletes them after each call (`KIRO_CLI_DELETE_SESSIONS=true`). Prompts still go to the Kiro service under the user's own account.
- This is NOT secure isolation: there are no accounts, the browser holds both profiles, and a demo switch picks the view. Never describe it as secure or as separate accounts.
- Never infer religion, beliefs, identity, career preference or psychological traits. Worldview is optional and self-described. Never present a parent-teen disagreement as misbehavior or side with either.

## Sources (RAG)
- Only curated summaries of pages we actually read (`backend/data/corpus/`, with `verified_via`). Dates only if the page states them. Label them as our summaries.
- UI shows only sources actually retrieved; no match means say so. Retrieved does not mean every sentence is supported. Never claim answers are validated.
