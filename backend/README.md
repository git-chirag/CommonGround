# CommonGround backend

FastAPI service. `POST /api/chat` takes `{"messages": [{"role": "user"|"assistant", "content": "..."}]}`
(last message must be from the user) and returns `{"reply": "..."}`. Errors return
`{"detail": {"code": "...", "message": "..."}}` with 422 / 502 / 503 / 504.

## Layout

- `app/llm/types.py`: `Message`, `LLMResponse` (text, provider, model, usage, error), `LLMError`.
- `app/llm/base.py`: `LLMProvider.generate_response(messages, system_prompt=None, temperature=None, context=None)`.
  `context` is for caller-supplied evidence passages (future RAG). Providers return errors, they do not raise.
- `app/llm/factory.py`: selects the provider from `LLM_PROVIDER`.
- `app/llm/kiro_cli.py`: local Kiro CLI provider.
- `app/api/chat.py`: route; unaware of the provider. `app/prompts.py`: app-level system prompt.

## Setup and run

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # edit if needed
uvicorn app.main:app --env-file .env --reload
```

Try it:

```bash
curl -s localhost:8000/api/chat -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Give me one tip for bedtime battles."}]}'
```

Tests and lint (no real CLI or login needed): `pytest` and `ruff check .`

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `LLM_PROVIDER` | `kiro_cli` | Provider name |
| `KIRO_CLI_PATH` | `kiro-cli` | Executable, server-side only |
| `LLM_TIMEOUT_SECONDS` | `90` | Per-request timeout |
| `LLM_MODEL` | (CLI default) | Passed as `--model`; see `kiro-cli chat --list-models` |
| `LLM_MAX_PROMPT_CHARS` | `24000` | Hard cap on the assembled prompt |
| `LLM_MAX_CONCURRENT` | `2` | Max simultaneous CLI processes |

## Kiro CLI provider: how it works

Runs `kiro-cli chat --no-interactive --trust-tools= [--model M] -- <prompt>` via an argument list (no shell).
Verified against kiro-cli 2.34.0: stdout contains only the answer, and logs go to stderr, so stdout is used as
the answer and stderr is never returned or logged. `--trust-tools=` disables the CLI's file/command tools,
`--` stops the prompt being read as a flag, and each call runs in a fresh empty temp directory with no
session resume, so requests share no state. The CLI has no system-prompt or temperature flag: the system
prompt is embedded in the prompt text and `temperature` is ignored.

Output is rejected (never partially returned) if the exit code is non-zero, stdout is empty, not valid UTF-8,
or contains terminal control characters.

Known limits: the prompt travels in the process arguments, so it is visible to other local users via `ps`;
I did not verify how the CLI behaves when logged out (auth detection is a keyword heuristic on stderr);
each call takes several seconds.

**Local development only.** It depends on a CLI installed and logged in on your machine under your personal
account. A deployed server will not have that, and using a personal login to serve other users is not appropriate.
Switch to a hosted provider before deploying.

## Verify authentication

```bash
kiro-cli whoami
kiro-cli chat --no-interactive --trust-tools= "Reply with the word ok"
```

## Troubleshooting

| HTTP / code | Likely cause | Fix |
|---|---|---|
| 503 `not_configured` | CLI not found | Install it or set `KIRO_CLI_PATH` |
| 503 `auth_failed` | Not signed in | Run `kiro-cli login` |
| 504 `timeout` | Slow CLI/network | Raise `LLM_TIMEOUT_SECONDS` |
| 502 `provider_failed` | Non-zero exit (e.g. bad `LLM_MODEL`) | Run the command above in a terminal to see the real error |
| 502 `empty_response` / `unexpected_output` | CLI output format changed | Check CLI version; update provider |

The server logs only error categories, exit codes and durations, never conversation content or CLI output.

## Adding a Gemini provider

1. Add `app/llm/gemini.py` with `class GeminiProvider(LLMProvider)`; map `system_prompt` to the API's system
   instruction, `messages` to its turns, `temperature` natively, and `context` into the prompt. Fill
   `LLMResponse.model` and `usage`; map failures to `LLMErrorCode` with safe messages.
2. Add `GEMINI_API_KEY` / `GEMINI_MODEL` to `Settings` and `.env.example` (key from the environment only), and add the SDK to `requirements.txt`.
3. Register `"gemini": _build_gemini` in `_BUILDERS` in `app/llm/factory.py`.
4. Set `LLM_PROVIDER=gemini`. The route and its tests do not change.

## Safety notes

Responses are model output, not medically or scientifically validated, and the system prompt tells the model
not to invent citations. Do not add citations unless they come from your own retrieval step via `context`.
