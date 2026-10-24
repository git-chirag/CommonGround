import { isDemoMode } from "./config";
import { REQUEST_TIMEOUT_MS } from "./limits";
import type { FamilyContextPayload } from "./family/types";
import type { ChatErrorKind, Grounding, Message, ParentingStage, Source } from "./types";

/**
 * The ONLY module that calls `fetch` or knows the backend contract.
 * Contract (backend/app/api/chat.py):
 *   POST {base}/api/chat  { messages, parenting_stage?, family_context?, retrieve_sources? }
 *     ->  200 { reply, grounding?, sources? }
 * We map failures by HTTP status and never surface server text to the UI.
 */

export class ChatError extends Error {
  readonly kind: ChatErrorKind;
  constructor(kind: ChatErrorKind) {
    super(kind); // deliberately no server-provided detail
    this.name = "ChatError";
    this.kind = kind;
  }
}

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  return url.replace(/\/+$/, "");
}

export function kindForStatus(status: number): ChatErrorKind {
  if (status === 422) return "invalid";
  if (status === 503) return "unavailable";
  if (status === 504) return "timeout";
  return "failed"; // 502, other 5xx, unexpected 4xx
}

export interface ChatOptions {
  stage?: ParentingStage | null;
  familyContext?: FamilyContextPayload | null;
  retrieveSources?: boolean;
}

export interface ChatResult {
  reply: string;
  grounding?: Grounding;
  sources?: Source[];
}

// Only http(s) links are ever rendered as links (blocks javascript: and similar).
const isHttps = (u: unknown): u is string => typeof u === "string" && u.startsWith("https://");
const str = (v: unknown) => (typeof v === "string" ? v : "");

function parseSources(raw: unknown): Source[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r: Record<string, unknown>) =>
    r && typeof r.title === "string" && isHttps(r.url) && typeof r.n === "number"
      ? [
          {
            n: r.n,
            id: str(r.id),
            title: r.title,
            publisher: str(r.publisher),
            url: r.url,
            published: typeof r.published === "string" ? r.published : null,
            accessed: str(r.accessed),
            kind: str(r.kind),
            verifiedVia: str(r.verified_via),
            cited: r.cited === true,
          },
        ]
      : [],
  );
}

export async function sendChat(
  messages: Message[],
  options: ChatOptions = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<ChatResult> {
  // Second guard behind the UI: in demo mode nothing is ever sent, to localhost or anywhere else.
  if (isDemoMode()) throw new ChatError("disabled");
  // Stage, profile context and the sources switch travel as request metadata, never as messages.
  // Only role/content are sent for each message (not the sources we attached for display).
  const body: Record<string, unknown> = { messages: messages.map(({ role, content }) => ({ role, content })) };
  if (options.stage) body.parenting_stage = options.stage;
  if (options.familyContext) body.family_context = options.familyContext;
  if (options.retrieveSources) body.retrieve_sources = true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError = our timeout; anything else = backend down / CORS / offline.
    if (err instanceof DOMException && err.name === "AbortError") throw new ChatError("timeout");
    throw new ChatError("network");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new ChatError(kindForStatus(response.status));

  let data: Record<string, unknown> | null;
  try {
    data = (await response.json()) as Record<string, unknown> | null;
  } catch {
    throw new ChatError("network");
  }
  const reply = data?.reply;
  if (typeof reply !== "string" || reply.trim() === "") throw new ChatError("failed");
  const grounding = data?.grounding === "retrieved" || data?.grounding === "none" ? data.grounding : undefined;
  return { reply, grounding, sources: grounding ? parseSources(data?.sources) : undefined };
}
