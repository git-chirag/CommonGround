import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatError, sendChat } from "./api";

const MSGS = [{ role: "user" as const, content: "Hello there" }];

function mockFetch(impl: (...args: unknown[]) => unknown) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("sendChat", () => {
  it("posts messages and stage as metadata, returns the reply", async () => {
    const f = mockFetch(async () => json(200, { reply: "Hi!" }));
    await expect(sendChat(MSGS, { stage: "adolescence" })).resolves.toEqual({ reply: "Hi!", grounding: undefined, sources: undefined });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ messages: MSGS, parenting_stage: "adolescence" });
  });

  it("omits parenting_stage when none is selected", async () => {
    const f = mockFetch(async () => json(200, { reply: "ok" }));
    await sendChat(MSGS);
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ messages: MSGS });
    expect("parenting_stage" in body).toBe(false);
  });

  it("sends family_context and retrieve_sources only when provided, and strips display-only fields", async () => {
    const f = mockFetch(async () => json(200, { reply: "ok" }));
    const ctx = { audience: "parent" as const, own: { hopes: "x" }, shared: {} };
    const withSources = [{ role: "assistant" as const, content: "a", sources: [], grounding: "none" as const }];
    await sendChat(withSources, { familyContext: ctx, retrieveSources: true });
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.family_context).toEqual(ctx);
    expect(body.retrieve_sources).toBe(true);
    expect(body.messages).toEqual([{ role: "assistant", content: "a" }]);
    await sendChat(MSGS, {});
    const plain = JSON.parse((f.mock.calls[1][1] as RequestInit).body as string);
    expect("family_context" in plain || "retrieve_sources" in plain).toBe(false);
  });

  it("parses sources and drops non-https links", async () => {
    const good = { n: 1, id: "a", title: "T", publisher: "P", url: "https://x.org/a", published: null, accessed: "d", kind: "k", verified_via: "v", cited: true };
    mockFetch(async () =>
      json(200, { reply: "r [S1]", grounding: "retrieved", sources: [good, { ...good, n: 2, url: "javascript:alert(1)" }, { n: 3 }] }),
    );
    const res = await sendChat(MSGS, { retrieveSources: true });
    expect(res.grounding).toBe("retrieved");
    expect(res.sources).toHaveLength(1);
    expect(res.sources![0]).toMatchObject({ title: "T", url: "https://x.org/a", cited: true, verifiedVia: "v" });
  });

  it("reports grounding none with an empty source list", async () => {
    mockFetch(async () => json(200, { reply: "r", grounding: "none", sources: [] }));
    const res = await sendChat(MSGS, { retrieveSources: true });
    expect(res).toEqual({ reply: "r", grounding: "none", sources: [] });
  });

  it.each([
    [422, "invalid"],
    [503, "unavailable"],
    [504, "timeout"],
    [502, "failed"],
    [500, "failed"],
    [404, "failed"],
  ])("maps HTTP %i to %s without exposing server text", async (status, kind) => {
    mockFetch(async () => json(status, { detail: { message: "SECRET internal detail" } }));
    const err = await sendChat(MSGS).catch((e) => e);
    expect(err).toBeInstanceOf(ChatError);
    expect(err.kind).toBe(kind);
    expect(err.message).not.toContain("SECRET");
  });

  it("treats a network failure as network", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(sendChat(MSGS)).rejects.toMatchObject({ kind: "network" });
  });

  it("treats an unreadable body as network and a missing reply as failed", async () => {
    mockFetch(async () => new Response("<html>oops</html>", { status: 200 }));
    await expect(sendChat(MSGS)).rejects.toMatchObject({ kind: "network" });
    mockFetch(async () => json(200, { nope: 1 }));
    await expect(sendChat(MSGS)).rejects.toMatchObject({ kind: "failed" });
    mockFetch(async () => json(200, { reply: "  " }));
    await expect(sendChat(MSGS)).rejects.toMatchObject({ kind: "failed" });
  });

  it("aborts after the timeout and reports timeout", async () => {
    mockFetch(
      (_url, init) =>
        new Promise((_, reject) => {
          (init as RequestInit).signal!.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    await expect(sendChat(MSGS, {}, 20)).rejects.toMatchObject({ kind: "timeout" });
  });
});
