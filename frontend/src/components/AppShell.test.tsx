import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_FAMILY } from "@/lib/family/seed";
import { STORAGE_KEY } from "@/lib/family/store";
import AppShell from "./AppShell";

type Handler = () => Promise<Response> | Response;
type User = ReturnType<typeof userEvent.setup>;

const reply = (text: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ reply: text, ...extra }), { status: 200 });
const status = (code: number) => new Response(JSON.stringify({ detail: "SECRET" }), { status: code });
const SOURCE = {
  n: 1, id: "unicef-11-tips", title: "11 tips for communicating with your teen", publisher: "UNICEF",
  url: "https://www.unicef.org/eca/11-tips-communicating-your-teen", published: null, accessed: "2026-10-24",
  kind: "curated_summary", verified_via: "full page text read", cited: true,
};

// Text that is private to one side in the seeded example family.
const PARENT_PRIVATE = [SEED_FAMILY.parent.hopes, SEED_FAMILY.parent.concerns, SEED_FAMILY.parent.values, SEED_FAMILY.parent.worldview];
const TEEN_PRIVATE = [
  SEED_FAMILY.teen.careerIdeas,
  SEED_FAMILY.teen.interests,
  SEED_FAMILY.teen.aspirations,
  SEED_FAMILY.teen.reflections[0].text,
  SEED_FAMILY.teen.reflections[1].text,
  "Learn basic 3D modelling", // unshared teen goal
];
const SHARED_TEEN_GOAL = "Build and release a small game this term";

let fetchMock: ReturnType<typeof vi.fn>;
function queue(...handlers: Handler[]) {
  fetchMock = vi.fn();
  handlers.forEach((h) => fetchMock.mockImplementationOnce(async () => h()));
  vi.stubGlobal("fetch", fetchMock);
}
const bodyAt = (n = -1) => JSON.parse(fetchMock.mock.calls.at(n)![1].body as string);
const wireAt = (n = -1) => fetchMock.mock.calls.at(n)![1].body as string;

beforeEach(() => {
  window.localStorage.clear();
  queue();
});
afterEach(() => vi.unstubAllGlobals());

const box = () => screen.getByRole("textbox", { name: /your message/i });
const nav = () => screen.getByRole("navigation", { name: "Sections" });
const goTeen = (user: User) => user.click(screen.getByRole("button", { name: "Teen view" }));
const goParent = (user: User) => user.click(screen.getByRole("button", { name: "Parent view" }));
const openContext = (user: User) => user.click(within(nav()).getByRole("button", { name: /family context|my space/i }));
const openChat = (user: User) => user.click(within(nav()).getByRole("button", { name: "Chat" }));
const say = async (user: User, text: string) => user.type(box(), `${text}{Enter}`);
// Everything a user could read on screen: text nodes AND the values inside form fields.
const onScreen = () =>
  [
    document.body.textContent ?? "",
    ...[...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")].map((e) => e.value),
  ].join("\n");
const expectNoneVisible = (texts: string[]) => texts.forEach((t) => expect(onScreen()).not.toContain(t));

describe("conversation-first layout", () => {
  it("opens on the chat with a welcome, starters, composer and disclaimer, not on profile forms", () => {
    render(<AppShell />);
    expect(box()).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what's on your mind, alex/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /understand a perspective/i })).toBeInTheDocument();
    expect(screen.getByText(/not medical or mental-health advice/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Hopes")).not.toBeInTheDocument();
    expect(within(nav()).getByRole("button", { name: "Chat" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps the profile editors one click away and returns to the chat", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openContext(user);
    expect(screen.getByLabelText("Hopes")).toHaveValue(SEED_FAMILY.parent.hopes);
    expect(screen.getByRole("group", { name: /developmental stage/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /your message/i })).not.toBeInTheDocument();
    await openChat(user);
    expect(box()).toBeInTheDocument();
  });

  it("the context bar's Edit link opens the context page", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByText(/personalised with/i));
    await user.click(screen.getByRole("button", { name: /edit family context/i }));
    expect(screen.getByLabelText("Hopes")).toBeInTheDocument();
  });

  it("teen view has its own welcome, starters, space and dark theme", async () => {
    const user = userEvent.setup();
    const { container } = render(<AppShell />);
    await goTeen(user);
    expect(screen.getByRole("heading", { name: /hey sam/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decide what to share/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have to share anything/i)).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-theme", "teen");
    const darkBtn = screen.getByRole("button", { name: "Dark theme" });
    expect(darkBtn).toHaveAttribute("aria-pressed", "false");
    await user.click(darkBtn);
    expect(darkBtn).toHaveAttribute("aria-pressed", "true");
    expect(container.firstChild).toHaveAttribute("data-theme", "teen-dark");
    await openContext(user);
    expect(screen.getByRole("heading", { name: /private reflections/i })).toBeInTheDocument();
  });

  it("an action on a context page switches to the chat and sends", async () => {
    queue(() => reply("Let's prepare."));
    const user = userEvent.setup();
    render(<AppShell />);
    await openContext(user);
    await user.click(screen.getByRole("button", { name: /help me prepare: a career conversation/i }));
    expect(await screen.findByText("Let's prepare.")).toBeInTheDocument();
    expect(bodyAt().messages[0].content).toMatch(/career choice/i);
  });
});

describe("privacy boundary: what is shown", () => {
  it("parent chat and family context never display teen-private text", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    expectNoneVisible(TEEN_PRIVATE);
    await openContext(user);
    expectNoneVisible(TEEN_PRIVATE);
    expect(screen.getAllByText(SHARED_TEEN_GOAL).length).toBeGreaterThan(0); // the teen shared it
  });

  it("positive control: the visibility check does see field values", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await openContext(user);
    expect(onScreen()).toContain(SEED_FAMILY.parent.hopes);
    await goTeen(user);
    await openContext(user);
    expect(onScreen()).toContain(SEED_FAMILY.teen.careerIdeas);
  });

  it("teen chat and my space never display parent-private text", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await goTeen(user);
    expectNoneVisible(PARENT_PRIVATE);
    await openContext(user);
    expectNoneVisible(PARENT_PRIVATE);
    expect(screen.getByText(SEED_FAMILY.teen.reflections[0].text)).toBeInTheDocument();
  });

  it("un-sharing a teen goal removes it from the parent view and the parent's request", async () => {
    queue(() => reply("ok"));
    const user = userEvent.setup();
    render(<AppShell />);
    await goTeen(user);
    await openContext(user);
    const row = screen.getByText(SHARED_TEEN_GOAL, { selector: "span" }).closest("li")!;
    await user.click(within(row).getByRole("checkbox", { name: /share with family/i }));
    await goParent(user);
    await openContext(user);
    expect(screen.queryByText(SHARED_TEEN_GOAL)).not.toBeInTheDocument();
    await openChat(user);
    await say(user, "Hello");
    await screen.findByText("ok");
    expect(wireAt()).not.toContain(SHARED_TEEN_GOAL);
  });
});

describe("privacy boundary: what is sent", () => {
  it("parent request: parent-private + shared + stage, nothing teen-private", async () => {
    queue(() => reply("ok"));
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "How do I talk about careers?");
    await screen.findByText("ok");
    const body = bodyAt();
    expect(body.family_context.audience).toBe("parent");
    expect(body.parenting_stage).toBe("adolescence");
    expect(body.retrieve_sources).toBe(true);
    expect(body.family_context.own.hopes).toBe(SEED_FAMILY.parent.hopes);
    expect(wireAt()).toContain(SHARED_TEEN_GOAL);
    TEEN_PRIVATE.forEach((t) => expect(wireAt()).not.toContain(t));
  });

  it("teen request: teen-private + shared, nothing parent-private, no reflections", async () => {
    queue(() => reply("ok"));
    const user = userEvent.setup();
    render(<AppShell />);
    await goTeen(user);
    await say(user, "Help me plan");
    await screen.findByText("ok");
    const body = bodyAt();
    expect(body.family_context.audience).toBe("teen");
    expect(body).not.toHaveProperty("parenting_stage");
    expect(body.family_context.own.career_ideas).toBe(SEED_FAMILY.teen.careerIdeas);
    PARENT_PRIVATE.forEach((t) => expect(wireAt()).not.toContain(t));
    SEED_FAMILY.teen.reflections.forEach((r) => expect(wireAt()).not.toContain(r.text));
  });

  it("chat histories never cross audiences, in either direction", async () => {
    queue(
      () => reply("P-REPLY-1"),
      () => reply("T-REPLY-1"),
      () => reply("P-REPLY-2"),
      () => reply("T-REPLY-2"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "PARENT-MSG-1");
    await screen.findByText("P-REPLY-1");

    await goTeen(user);
    expectNoneVisible(["PARENT-MSG-1", "P-REPLY-1"]);
    await say(user, "TEEN-MSG-1");
    await screen.findByText("T-REPLY-1");
    expect(bodyAt().messages).toEqual([{ role: "user", content: "TEEN-MSG-1" }]);
    expect(wireAt()).not.toContain("PARENT-MSG-1");

    await goParent(user);
    expectNoneVisible(["TEEN-MSG-1", "T-REPLY-1"]);
    await say(user, "PARENT-MSG-2");
    await screen.findByText("P-REPLY-2");
    expect(bodyAt().messages.map((m: { content: string }) => m.content)).toEqual(["PARENT-MSG-1", "P-REPLY-1", "PARENT-MSG-2"]);
    expect(wireAt()).not.toContain("TEEN-MSG");

    await goTeen(user);
    await say(user, "TEEN-MSG-2");
    await screen.findByText("T-REPLY-2");
    expect(wireAt()).not.toContain("PARENT-MSG");
    expect(wireAt()).not.toContain("P-REPLY");
  });

  it("a goal the parent adds to the shared list reaches the teen request", async () => {
    queue(() => reply("ok"));
    const user = userEvent.setup();
    render(<AppShell />);
    await openContext(user);
    await user.type(screen.getByRole("textbox", { name: /add a shared goal/i }), "PARENT-ADDED-SHARED{Enter}");
    await goTeen(user);
    await say(user, "Hi");
    await screen.findByText("ok");
    expect(wireAt()).toContain("PARENT-ADDED-SHARED");
    PARENT_PRIVATE.forEach((t) => expect(wireAt()).not.toContain(t));
  });

  it("turning profile notes off removes them from the request, per audience", async () => {
    queue(
      () => reply("parent ok"),
      () => reply("teen ok"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("checkbox", { name: /use my profile notes/i }));
    expect(screen.getByText(/profile notes off/i)).toBeInTheDocument();
    await say(user, "Hi there");
    await screen.findByText("parent ok");
    expect(bodyAt()).not.toHaveProperty("family_context");
    expect(wireAt()).not.toContain(SEED_FAMILY.parent.hopes);
    expect(bodyAt().messages[0].content).toBe("Hi there"); // the question itself is still sent

    await goTeen(user);
    expect(screen.getByRole("checkbox", { name: /use my profile notes/i })).toBeChecked();
    await say(user, "Hey");
    await screen.findByText("teen ok");
    expect(bodyAt().family_context.audience).toBe("teen");
  });

  it("the context bar lists exactly the fields that will be sent", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    const bar = screen.getByRole("region", { name: /what the assistant can see/i });
    await user.click(within(bar).getByText(/personalised with/i));
    expect(within(bar).getByText("Hopes")).toBeInTheDocument();
    expect(within(bar).getByText("Shared goals")).toBeInTheDocument();
    expect(within(bar).queryByText("Career ideas")).not.toBeInTheDocument();
    expect(within(bar).getByText(/not secure isolation/i)).toBeInTheDocument();
  });
});

describe("editable and resettable demo data", () => {
  it("saves an edit, uses it in the next request, and survives remount", async () => {
    queue(() => reply("ok"));
    const user = userEvent.setup();
    const { unmount } = render(<AppShell />);
    await openContext(user);
    const hopes = screen.getByLabelText("Hopes");
    await user.clear(hopes);
    await user.type(hopes, "EDITED-HOPE");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).parent.hopes).toBe("EDITED-HOPE");
    await openChat(user);
    await say(user, "Question here");
    await screen.findByText("ok");
    expect(bodyAt().family_context.own.hopes).toBe("EDITED-HOPE");
    unmount();
    render(<AppShell />);
    await openContext(user);
    expect(screen.getByDisplayValue("EDITED-HOPE")).toBeInTheDocument();
  });

  it("'Reset to example' restores one card; 'Reset demo' restores everything and clears both chats", async () => {
    queue(
      () => reply("parent answer"),
      () => reply("teen answer"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await openContext(user);
    const hopes = screen.getByLabelText("Hopes");
    await user.clear(hopes);
    await user.type(hopes, "CHANGED");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Reset to example" })[0]);
    expect(screen.getByDisplayValue(SEED_FAMILY.parent.hopes)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Early childhood" }));

    await openChat(user);
    await say(user, "Hello");
    await screen.findByText("parent answer");
    await goTeen(user);
    await say(user, "Hey");
    await screen.findByText("teen answer");

    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(screen.queryByText("teen answer")).not.toBeInTheDocument();
    await goParent(user);
    expect(screen.queryByText("parent answer")).not.toBeInTheDocument();
    await openContext(user);
    expect(screen.getByRole("radio", { name: "Adolescence" })).toBeChecked();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("recovers from corrupt stored data by using the example profile", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    const user = userEvent.setup();
    render(<AppShell />);
    await openContext(user);
    expect(screen.getByDisplayValue(SEED_FAMILY.parent.hopes)).toBeInTheDocument();
  });
});

describe("sources", () => {
  it("shows real source titles with safe links and says guidance is not evidence about a person", async () => {
    queue(() => reply("Listen first [S1].", { grounding: "retrieved", sources: [SOURCE] }));
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "How can I listen better to my teenager?");
    const aside = await screen.findByRole("complementary", { name: "Sources" });
    expect(within(aside).getByText(/11 tips for communicating with your teen/)).toBeInTheDocument();
    expect(within(aside).getByText(/referenced in answer/i)).toBeInTheDocument();
    expect(within(aside).getByText(/can't tell you what a particular person/i)).toBeInTheDocument();
    const link = within(aside).getByRole("link", { name: /open original page/i });
    expect(link).toHaveAttribute("href", SOURCE.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("says plainly when no sourced guidance was found", async () => {
    queue(() => reply("A general answer.", { grounding: "none", sources: [] }));
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "What is the capital of France?");
    expect(await screen.findByText(/no sourced guidance matched/i)).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Sources" })).not.toBeInTheDocument();
  });

  it("renders no sources UI when the backend returns none of the new fields", async () => {
    queue(() => reply("Plain reply"));
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "Hello");
    await screen.findByText("Plain reply");
    expect(screen.queryByText(/no sourced guidance/i)).not.toBeInTheDocument();
  });

  it("does not send display-only source data back to the backend", async () => {
    queue(
      () => reply("First [S1]", { grounding: "retrieved", sources: [SOURCE] }),
      () => reply("Second"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "One");
    await screen.findByText("First [S1]");
    await say(user, "Two");
    await screen.findByText("Second");
    expect(bodyAt().messages[1]).toEqual({ role: "assistant", content: "First [S1]" });
  });
});

describe("chat behaviour", () => {
  it("sends a clicked parent starter (the demo career question)", async () => {
    queue(() => reply("sure"));
    const user = userEvent.setup();
    render(<AppShell />);
    await user.click(screen.getByRole("button", { name: /prepare a conversation/i }));
    await screen.findByText("sure");
    expect(bodyAt().messages[0].content).toMatch(/career choice when my hopes differ/i);
  });

  it("sends a clicked teen starter", async () => {
    queue(() => reply("let's plan"));
    const user = userEvent.setup();
    render(<AppShell />);
    await goTeen(user);
    await user.click(screen.getByRole("button", { name: /prepare for a hard talk/i }));
    await screen.findByText("let's plan");
    expect(bodyAt().messages[0].content).toMatch(/talk to my parent about my future plans/i);
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
    await say(user, "First");
    expect((await screen.findByText(/is thinking/i)).closest("[role=status]")).not.toBeNull();
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    await say(user, "Second");
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
    await say(user, "Hello");
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(document.body).not.toHaveTextContent("SECRET");
  });

  it("shows a connection error when the backend is unreachable", async () => {
    queue(() => {
      throw new TypeError("Failed to fetch");
    });
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "Hello");
    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach commonground/i);
  });

  it("retries after an error without duplicating the user message", async () => {
    queue(
      () => status(503),
      () => reply("Second try worked"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "Help please");
    await user.click(await screen.findByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Second try worked")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("Help please")).toHaveLength(1);
    expect(bodyAt().messages).toEqual([{ role: "user", content: "Help please" }]);
  });

  it("changing the stage on the context page keeps the conversation and updates the next request", async () => {
    queue(
      () => reply("first answer"),
      () => reply("second answer"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "One");
    await screen.findByText("first answer");
    await openContext(user);
    await user.click(screen.getByRole("radio", { name: "School-age children" }));
    await openChat(user);
    expect(screen.getByText("first answer")).toBeInTheDocument();
    await say(user, "Two");
    await screen.findByText("second answer");
    expect(bodyAt().parenting_stage).toBe("school_age");
    expect(bodyAt().messages.map((m: { content: string }) => m.content)).toEqual(["One", "first answer", "Two"]);
  });

  it("starts a new conversation and ignores a reply that arrives after it", async () => {
    let release!: (r: Response) => void;
    queue(() => new Promise<Response>((res) => (release = res)));
    const user = userEvent.setup();
    render(<AppShell />);
    await say(user, "Hi");
    await user.click(await screen.findByRole("button", { name: /new conversation/i }));
    release(reply("late reply"));
    await waitFor(() => expect(screen.queryByText("late reply")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /what's on your mind/i })).toBeInTheDocument();
  });
});
