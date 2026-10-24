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

## Iteration 2: conversation-first UX and strict scoping
10. Chat is the primary surface for both audiences (full-height conversation, anchored composer, starters, loading/error/retry, sources under answers, compact expandable context bar). Profile editors move to a secondary page and keep all functionality.
11. Separate audience-scoped context builders with explicit allow-lists; the only cross-audience data is the shared projection (family goals, teen goals the teen shared, routines, commitments). Separate chat histories. No derived summaries.
12. Automated tests inspect the complete outbound provider request (CLI argv) and the browser request body to prove private fields and chat messages cannot cross audiences, including shared goals and the context toggle.
13. Perspective support: uncertainty-aware possibilities, behavior is not proof of cause, gentle openers, no pressure on teens to disclose, risk -> point to real-world help without diagnosing.
14. Sources state that retrieved guidance is general and not evidence of what a particular family member is experiencing.

## Iteration 3: Party Night scenario and explicit sharing
15. A selectable, resettable fictional scenario "Party Night" with parent-private, teen-private and shared context (shared states only what both agreed, never private specifics; the teen's own preference is included, not only peer pressure).
16. Guided prompts per audience and a static conversation plan (possible interpretations, openers, 2-3 open questions, agreement template for transport, check-ins and feeling unsafe, pause reminder).
17. Explicit review-and-share: drafts are never stored or sent; approved notes reach both views and both requests; withdrawal removes them.
18. Prompt rule: no implication that clothing causes harassment; safety planning supports independence; another person's experience is phrased as a possibility.
19. Teen chat stays dominant on desktop and mobile; My space keeps all profile features.
