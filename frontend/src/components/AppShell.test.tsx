import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_FAMILY } from "@/lib/family/seed";
import { STORAGE_KEY } from "@/lib/family/store";
import AppShell from "./AppShell";

type Handler = () => Promise<Response> | Response;
const reply = (text: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ reply: text, ...extra }), { status: 200 });
const status = (code: number) => new Response(JSON.stringify({ detail: "SECRET" }), { status: code });
const SOURCE = {
  n: 1, id: "unicef-11-tips", title: "11 tips for communicating with your teen", publisher: "UNICEF",
  url: "https://www.unicef.org/eca/11-tips-communicating-your-teen", published: null, accessed: "2026-10-24",
  kind: "curated_summary", verified_via: "full page text read", cited: true,
};

let fetchMock: ReturnType<typeof vi.fn>;
function queue(...handlers: Handler[]) {
  fetchMock = vi.fn();
  handlers.forEach((h) => fetchMock.mockImplementationOnce(async () => h()));
  vi.stubGlobal("fetch", fetchMock);
}
const lastBody = (n = -1) => JSON.parse(fetchMock.mock.calls.at(n)![1].body as string);

beforeEach(() => {
  window.localStorage.clear();
  queue();
});
afterEach(() => vi.unstubAllGlobals());

const box = () => screen.getByRole("textbox", { name: /your message/i });
const goTeen = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Teen view" }));
const goParent = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Parent view" }));

describe("dashboards and privacy boundaries", () => {
  it("starts on the parent dashboard with fictional-data labels and the disclaimer", () => {
    render(<AppShell />);
    expect(screen.getByRole("heading", { name: /welcome, alex/i })).toBeInTheDocument();
    expect(screen.getAllByText(/fictional/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not medical or mental-health advice/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/not secure isolation/i)).toBeInTheDocument();
  });

  it("teen view is a different dashboard and never shows parent-private text", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    expect(screen.getByDisplayValue(SEED_FAMILY.parent.hopes)).toBeInTheDocument();
    await goTeen(user);
    expect(screen.getByRole("heading", { name: /hey sam/i })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(SEED_FAMILY.parent.hopes);
    expect(screen.queryByDisplayValue(SEED_FAMILY.parent.hopes)).not.toBeInTheDocument();
    expect(screen.getByText(SEED_FAMILY.teen.reflections[0].text)).toBeInTheDocument();
  });

  it("parent view never shows teen-private fields or reflections, only what the teen shared", async () => {
    render(<AppShell />);
    expect(document.body).not.toHaveTextContent(SEED_FAMILY.teen.careerIdeas);
    expect(document.body).not.toHaveTextContent(SEED_FAMILY.teen.reflections[0].text);
    expect(document.body).not.toHaveTextContent("Learn basic 3D modelling"); // unshared teen goal
    expect(screen.getAllByText("Build and release a small game this term").length).toBeGreaterThan(0); // shared
  });

  it("un-sharing a teen goal removes it from the parent view", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await goTeen(user);
    const row = screen.getByText("Build and release a small game this term", { selector: "span" }).closest("li")!;
    await user.click(within(row).getByRole("checkbox", { name: /share with family/i }));
    await goParent(user);
    expect(screen.queryByText("Build and release a small game this term")).not.toBeInTheDocument();
  });

  it("sends parent context + stage + sources switch, never teen-private data", async () => {
    queue(() => reply("Ask first [S1].", { grounding: "retrieved", sources: [SOURCE] }));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "How do I talk about careers?{Enter}");
    await screen.findByText("Ask first [S1].");
    const body = lastBody();
    expect(body.parenting_stage).toBe("adolescence");
    expect(body.retrieve_sources).toBe(true);
    expect(body.family_context.audience).toBe("parent");
    const wire = JSON.stringify(body);
    expect(wire).toContain(SEED_FAMILY.parent.hopes);
    expect(wire).toContain("Build and release a small game"); // teen goal the teen shared
    expect(wire).not.toContain(SEED_FAMILY.teen.careerIdeas);
    expect(wire).not.toContain(SEED_FAMILY.teen.reflections[0].text);
    expect(wire).not.toContain("3D modelling");
  });

  it("sends teen context for the teen chat, never parent-private data or reflections", async () => {
    queue(() => reply("Here is a plan."));
    const user = userEvent.setup();
    render(<AppShell />);
    await goTeen(user);
    await user.type(box(), "Help me plan{Enter}");
    await screen.findByText("Here is a plan.");
    const body = lastBody();
    expect(body.family_context.audience).toBe("teen");
    expect(body).not.toHaveProperty("parenting_stage");
    const wire = JSON.stringify(body);
    expect(wire).toContain(SEED_FAMILY.teen.careerIdeas);
    expect(wire).not.toContain(SEED_FAMILY.parent.hopes);
    expect(wire).not.toContain(SEED_FAMILY.parent.concerns);
    expect(wire).not.toContain(SEED_FAMILY.teen.reflections[0].text);
  });

  it("keeps separate conversations per view", async () => {
    queue(() => reply("parent answer"));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "Parent question{Enter}");
    await screen.findByText("parent answer");
    await goTeen(user);
    expect(screen.queryByText("parent answer")).not.toBeInTheDocument();
    await goParent(user);
    expect(screen.getByText("parent answer")).toBeInTheDocument();
  });

  it("omits family_context when the user turns profile notes off", async () => {
    queue(() => reply("ok"));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("checkbox", { name: /use my profile notes/i }));
    expect(screen.getByText(/no profile notes are sent/i)).toBeInTheDocument();
    await user.type(box(), "Hi there{Enter}");
    await screen.findByText("ok");
    expect(lastBody()).not.toHaveProperty("family_context");
  });

  it("boundary panel lists exactly the fields that are sent", () => {
    render(<AppShell />);
    const panel = screen.getByRole("region", { name: /what the assistant can see/i });
    expect(within(panel).getByText("Hopes")).toBeInTheDocument();
    expect(within(panel).getByText("Shared goals")).toBeInTheDocument();
    expect(within(panel).queryByText("Career ideas")).not.toBeInTheDocument();
  });
});

describe("editable and resettable demo data", () => {
  it("saves an edit, uses it in the next request, and survives remount", async () => {
    queue(() => reply("ok"));
    const user = userEvent.setup();
    const { unmount } = render(<AppShell />);
    const hopes = screen.getByLabelText("Hopes");
    await user.clear(hopes);
    await user.type(hopes, "EDITED-HOPE");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).parent.hopes).toBe("EDITED-HOPE");
    await user.type(box(), "Question here{Enter}");
    await screen.findByText("ok");
    expect(lastBody().family_context.own.hopes).toBe("EDITED-HOPE");
    unmount();
    render(<AppShell />);
    expect(screen.getByDisplayValue("EDITED-HOPE")).toBeInTheDocument();
  });

  it("'Reset to example' restores one card and 'Reset demo' restores everything and clears chats", async () => {
    queue(() => reply("an answer"));
    const user = userEvent.setup();
    render(<AppShell />);
    const hopes = screen.getByLabelText("Hopes");
    await user.clear(hopes);
    await user.type(hopes, "CHANGED");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Reset to example" })[0]);
    expect(screen.getByDisplayValue(SEED_FAMILY.parent.hopes)).toBeInTheDocument();

    await user.type(box(), "Hello{Enter}");
    await screen.findByText("an answer");
    await user.click(screen.getByRole("radio", { name: "Early childhood" }));
    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(screen.queryByText("an answer")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Adolescence" })).toBeChecked();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("recovers from corrupt stored data by using the example profile", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    render(<AppShell />);
    expect(screen.getByDisplayValue(SEED_FAMILY.parent.hopes)).toBeInTheDocument();
  });
});

describe("sources", () => {
  it("shows real source titles with safe external links", async () => {
    queue(() => reply("Listen first [S1].", { grounding: "retrieved", sources: [SOURCE] }));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "How can I listen better to my teenager?{Enter}");
    const aside = await screen.findByRole("complementary", { name: "Sources" });
    expect(within(aside).getByText(/11 tips for communicating with your teen/)).toBeInTheDocument();
    expect(within(aside).getByText(/referenced in answer/i)).toBeInTheDocument();
    const link = within(aside).getByRole("link", { name: /open original page/i });
    expect(link).toHaveAttribute("href", SOURCE.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("says plainly when no sourced guidance was found", async () => {
    queue(() => reply("A general answer.", { grounding: "none", sources: [] }));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "What is the capital of France?{Enter}");
    expect(await screen.findByText(/no sourced guidance matched/i)).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Sources" })).not.toBeInTheDocument();
  });

  it("renders no sources UI when the backend returns none of the new fields", async () => {
    queue(() => reply("Plain reply"));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "Hello{Enter}");
    await screen.findByText("Plain reply");
    expect(screen.queryByText(/no sourced guidance/i)).not.toBeInTheDocument();
  });

  it("does not send the sources we attached for display back to the backend", async () => {
    queue(
      () => reply("First [S1]", { grounding: "retrieved", sources: [SOURCE] }),
      () => reply("Second"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "One{Enter}");
    await screen.findByText("First [S1]");
    await user.type(box(), "Two{Enter}");
    await screen.findByText("Second");
    expect(lastBody().messages[1]).toEqual({ role: "assistant", content: "First [S1]" });
  });
});

describe("chat behaviour", () => {
  it("shows suggestions, including the demo career question, and sends a clicked one", async () => {
    queue(() => reply("sure"));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /talk with my teen about a career choice/i }));
    await screen.findByText("sure");
    expect(lastBody().messages[0].content).toMatch(/career choice/i);
  });

  it("refuses an empty message without calling the backend", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "   ");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText(/type a message first/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an over-long message and keeps the text", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(box());
    await user.paste("x".repeat(4001));
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText(/too long/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows loading and blocks duplicate sends", async () => {
    let release!: (r: Response) => void;
    queue(() => new Promise<Response>((res) => (release = res)));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "First{Enter}");
    expect((await screen.findByText(/is thinking/i)).closest("[role=status]")).not.toBeNull();
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    await user.type(box(), "Second{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release(reply("done"));
    expect(await screen.findByText("done")).toBeInTheDocument();
  });

  it.each([
    [503, /isn't available/i],
    [504, /took too long/i],
    [502, /couldn't put a response together/i],
    [422, /check your message/i],
  ])("shows a friendly error for %i and never the server text", async (code, text) => {
    queue(() => status(code));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "Hello{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(document.body).not.toHaveTextContent("SECRET");
  });

  it("shows a connection error when the backend is unreachable", async () => {
    queue(() => {
      throw new TypeError("Failed to fetch");
    });
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "Hello{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach commonground/i);
  });

  it("retries after an error without duplicating the user message", async () => {
    queue(
      () => status(503),
      () => reply("Second try worked"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "Help please{Enter}");
    await user.click(await screen.findByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Second try worked")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("Help please")).toHaveLength(1);
    expect(lastBody().messages).toEqual([{ role: "user", content: "Help please" }]);
  });

  it("changing the stage mid-conversation keeps messages and updates the next request", async () => {
    queue(
      () => reply("first answer"),
      () => reply("second answer"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "One{Enter}");
    await screen.findByText("first answer");
    await user.click(screen.getByRole("radio", { name: "School-age children" }));
    expect(screen.getByText("first answer")).toBeInTheDocument();
    await user.type(box(), "Two{Enter}");
    await screen.findByText("second answer");
    expect(lastBody().parenting_stage).toBe("school_age");
    expect(lastBody().messages.map((m: { content: string }) => m.content)).toEqual(["One", "first answer", "Two"]);
  });

  it("starts a new conversation and ignores a reply that arrives after it", async () => {
    let release!: (r: Response) => void;
    queue(() => new Promise<Response>((res) => (release = res)));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.type(box(), "Hi{Enter}");
    await user.click(await screen.findByRole("button", { name: /new conversation/i }));
    release(reply("late reply"));
    await waitFor(() => expect(screen.queryByText("late reply")).not.toBeInTheDocument());
  });
});
