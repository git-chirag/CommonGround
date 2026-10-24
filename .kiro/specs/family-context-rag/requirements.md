# Requirements: Dual dashboards, family context, and sourced answers

1. Two dashboards (parent, teen) with genuinely different layouts and identities, a clear demo switcher, and fictional, labelled example profiles.
2. Structured, optional, editable context with three scopes (parent-private, teen-private, shared); every field shows its scope; Save and Reset-to-example per card; global Reset demo.
3. Privacy boundary: teen-private data never appears in the parent view or parent requests; parent-private data never in teen requests; only shared fields cross; teen reflections are never sent. The UI states this is a local prototype, not secure isolation.
4. No inference of religion, beliefs, identity, career preference or traits; worldview optional and self-described.
5. Context-aware assistant: empathetic, balanced, intention vs impact, respects autonomy, asks clarifying questions, no diagnosis; profile notes travel in the system prompt, never in message history.
6. Minimal RAG over a small curated corpus with real metadata (title, publisher, URL, date only if stated), overlapping chunks, lightweight retrieval, top-k passages passed as provider context.
7. Sources shown with real titles and links; if nothing relevant is retrieved the UI says so; unknown `[S#]` markers are removed; no claim that retrieval proves a statement.
8. Existing API contract and tests keep working: new request/response fields are optional and additive.
9. A fictional demo flow (parent career question with differing hopes) works repeatably in the browser and is resettable.
