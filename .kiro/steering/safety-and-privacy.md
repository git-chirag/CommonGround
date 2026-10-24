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
- Collect the minimum: chat text and an optional parenting stage. No names, accounts, emails or analytics.
- Conversation lives only in frontend memory for the current session. No localStorage, cookies, database.
- Never log full conversations or CLI output, in backend or frontend. Tests and fixtures use fake text only.
- Never commit `.env` or credentials. `.env.example` holds placeholders only.
- Never expose the Kiro CLI, executable paths, env vars or raw errors to the browser.

## Known gap
`backend/app/prompts.py` does not yet have explicit crisis-handling guidance. Treat that as future work; do not
claim crisis support exists.
