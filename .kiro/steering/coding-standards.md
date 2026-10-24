# CommonGround: coding standards

- Prefer simple, readable, idiomatic code over clever abstractions. Small files, one responsibility each.
- Add a dependency only when it clearly pays for itself; pin exact versions. Explain the reason in the task summary.
- Work in small increments: one task at a time, run its checks, then summarize.
- Do not add features, configurability or abstractions beyond the current task.

## TypeScript / React (frontend)
- `strict` TypeScript, no `any`. Shared types in one place.
- Server contract handling lives in one module (`lib/api.ts`). Components never call `fetch` directly.
- Local state (`useState`) before any global state or state library.
- Components stay small; extract a hook for stateful logic, a component for repeated UI.
- Accessibility is a requirement, not polish: semantic HTML, labels, keyboard support, visible focus.
- Lint with ESLint; test with Vitest + React Testing Library. Mock `fetch`; never call the real backend in tests.

## Python (backend)
- Type hints, `ruff check .` clean, tests with pytest and mocked subprocess/providers.
- Providers return `LLMResponse` errors; routes translate them to HTTP.
- Keep provider-specific code out of routes; keep parenting logic out of `app/llm/`.

## Errors, logging, docs
- Show users short friendly messages; never stack traces, raw server output or internal details.
- Do not log message content or CLI output (frontend `console.*` included). Log categories and durations only.
- Never claim a check passed unless it was run. Report failures plainly.
- Update `README`/`docs/DEVELOPMENT_LOG.md` when behavior, commands or decisions change.
