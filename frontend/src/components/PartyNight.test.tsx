import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFamilyContext } from "@/lib/family/context";
import { PARTY_PARENT_PROMPT, PARTY_TEEN_PROMPT, SCENARIOS } from "@/lib/family/scenarios";
import { seedFor, STORAGE_KEY } from "@/lib/family/store";
import AppShell from "./AppShell";

type Handler = () => Promise<Response> | Response;
type User = ReturnType<typeof userEvent.setup>;

const PARTY = SCENARIOS["party-night"].seed;
// Private, per-side text in the Party Night seed.
const DAD_PRIVATE = [PARTY.parent.concerns, PARTY.parent.situation!, PARTY.parent.intentions, PARTY.parent.hopes];
const MAYA_PRIVATE = [
  PARTY.teen.situation!,
  PARTY.teen.interests,
  PARTY.teen.aspirations,
  ...PARTY.teen.reflections.map((r) => r.text),
  "Talk to Dad when I've calmed down", // unshared goal
];
// Short fragments, so a paraphrase-free copy of a private sentence anywhere would be caught.
const DAD_FRAGMENTS = ["unwanted attention", "raised my voice", "regret how it went"];
const MAYA_FRAGMENTS = ["felt judged and misunderstood", "the odd one out", "felt like I had to", "I love it", "asked what I thought"];

const reply = (text: string) => new Response(JSON.stringify({ reply: text }), { status: 200 });
let fetchMock: ReturnType<typeof vi.fn>;
function queue(...handlers: Handler[]) {
  fetchMock = vi.fn();
  handlers.forEach((h) => fetchMock.mockImplementationOnce(async () => h()));
  vi.stubGlobal("fetch", fetchMock);
}
const wireAt = (n = -1) => fetchMock.mock.calls.at(n)![1].body as string;
const bodyAt = (n = -1) => JSON.parse(wireAt(n));

const onScreen = () =>
  [
    document.body.textContent ?? "",
    ...[...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")].map((e) => e.value),
  ].join("\n");

const nav = () => screen.getByRole("navigation", { name: "Sections" });
const go = (user: User, name: RegExp | string) => user.click(within(nav()).getByRole("button", { name }));
const goTeen = (user: User) => user.click(screen.getByRole("button", { name: "Teen view" }));
const goParent = (user: User) => user.click(screen.getByRole("button", { name: "Parent view" }));
const box = () => screen.getByRole("textbox", { name: /your message/i });
const loadParty = (user: User) => user.selectOptions(screen.getByLabelText("Demo scenario"), "party-night");

beforeEach(() => {
  window.localStorage.clear();
  queue();
});
afterEach(() => vi.unstubAllGlobals());

describe("Party Night: scenario data", () => {
  it("is fictional, balanced, and keeps the teen's own preference (not only peer pressure)", () => {
    expect(PARTY.teen.situation).toMatch(/felt like I had to wear one too/); // the pressure she felt
    expect(PARTY.teen.situation).toMatch(/I also like this dress and feel good in it/); // and her own preference
    expect(PARTY.teen.reflections.map((r) => r.text).join(" ")).toMatch(/not just because of my friends/);
    expect(PARTY.parent.concerns).toMatch(/without sounding judgmental or controlling/);
    expect(PARTY.parent.situation).toMatch(/regret/);
  });

  it("shared context says only what both agreed, never the private specifics", () => {
    const shared = JSON.stringify(PARTY.shared);
    expect(shared).toMatch(/less hurtful/);
    expect(shared).toMatch(/safety and independence respectfully/);
    expect(shared).toMatch(/care about our relationship/);
    [...DAD_FRAGMENTS, ...MAYA_FRAGMENTS].forEach((f) => expect(shared).not.toContain(f));
    expect(PARTY.shared.messages).toEqual([]); // nothing pre-approved
  });

  it("each audience's context carries its own situation and never the other's", () => {
    const state = seedFor("party-night");
    const parent = JSON.stringify(buildFamilyContext(state, "parent"));
    const teen = JSON.stringify(buildFamilyContext(state, "teen"));
    expect(parent).toContain(PARTY.parent.situation);
    expect(teen).toContain(PARTY.teen.situation);
    MAYA_PRIVATE.forEach((t) => expect(parent).not.toContain(t));
    DAD_PRIVATE.forEach((t) => expect(teen).not.toContain(t));
  });
});

describe("Party Night: guided demo in the UI", () => {
  it("the scenario picker loads Party Night with its own names and starters", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    expect(screen.getByRole("heading", { name: /what's on your mind, david/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /repair after an argument/i })).toBeInTheDocument();
    await goTeen(user);
    expect(screen.getByRole("heading", { name: /hey maya/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explain my side/i })).toBeInTheDocument();
  });

  it("parent demo prompt: request has Dad's private context + shared only", async () => {
    queue(() => reply("parent answer"));
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    await user.click(screen.getByRole("button", { name: /repair after an argument/i }));
    await screen.findByText("parent answer");
    const body = bodyAt();
    expect(body.messages).toEqual([{ role: "user", content: PARTY_PARENT_PROMPT }]);
    expect(body.family_context.audience).toBe("parent");
    expect(body.family_context.own.situation).toBe(PARTY.parent.situation);
    expect(wireAt()).toContain("less hurtful");
    MAYA_PRIVATE.forEach((t) => expect(wireAt()).not.toContain(t));
    MAYA_FRAGMENTS.forEach((t) => expect(wireAt()).not.toContain(t));
  });

  it("teen demo prompt: request has Maya's private context + shared only, and no Dad chat", async () => {
    queue(
      () => reply("parent answer"),
      () => reply("teen answer"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    await user.click(screen.getByRole("button", { name: /repair after an argument/i }));
    await screen.findByText("parent answer");
    await goTeen(user);
    await user.click(screen.getByRole("button", { name: /explain my side/i }));
    await screen.findByText("teen answer");
    const body = bodyAt();
    expect(body.messages).toEqual([{ role: "user", content: PARTY_TEEN_PROMPT }]);
    expect(body.family_context.audience).toBe("teen");
    expect(body.family_context.own.situation).toBe(PARTY.teen.situation);
    DAD_PRIVATE.forEach((t) => expect(wireAt()).not.toContain(t));
    DAD_FRAGMENTS.forEach((t) => expect(wireAt()).not.toContain(t));
    expect(wireAt()).not.toContain("parent answer");
    expect(wireAt()).not.toContain(PARTY_PARENT_PROMPT);
  });

  it("neither view displays the other side's private text, in any section", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    for (const section of ["Chat", "Plan", /family context/i]) {
      await go(user, section);
      MAYA_PRIVATE.forEach((t) => expect(onScreen()).not.toContain(t));
    }
    await goTeen(user);
    for (const section of ["Chat", "Plan", /my space/i]) {
      await go(user, section);
      DAD_PRIVATE.forEach((t) => expect(onScreen()).not.toContain(t));
    }
  });
});

describe("Party Night: conversation plan", () => {
  it("contains possibilities, openers, questions, an agreement template and a pause reminder", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    await go(user, "Plan");
    expect(screen.getByRole("heading", { name: /after party night/i })).toBeInTheDocument();
    expect(screen.getByText(/possible interpretations, not facts/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^(One|Another) possibility:/)).toHaveLength(4);
    expect(screen.getAllByText(/a possible opening line/i)).toHaveLength(2);
    const questions = screen.getByRole("heading", { name: /open questions/i }).parentElement!;
    expect(within(questions).getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
    for (const label of [/getting there and home/i, /check-ins/i, /if someone feels unsafe/i]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText(/not tied to what anyone wears/i)).toBeInTheDocument();
    expect(screen.getByText(/can say .*pause and come back/i)).toBeInTheDocument();
  });

  it("the plan text never contains either person's private notes", async () => {
    const plan = JSON.stringify(SCENARIOS["party-night"].plan);
    [...DAD_PRIVATE, ...MAYA_PRIVATE, ...DAD_FRAGMENTS, ...MAYA_FRAGMENTS].forEach((t) => expect(plan).not.toContain(t));
  });

  it("the plan does not paraphrase private notes: no 4-word run is shared with any private field", () => {
    const words = (t: string) => t.toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
    const grams = (t: string) => {
      const w = words(t);
      return new Set(w.slice(0, -3).map((_, i) => w.slice(i, i + 4).join(" ")));
    };
    const { plan } = SCENARIOS["party-night"];
    // Everything in the plan both views can see. Openers are suggested lines for the speaker, so they are included too.
    const planText = [plan.intro, ...plan.parent.mightWant, plan.parent.opener, ...plan.teen.mightWant, plan.teen.opener, ...plan.questions].join(" ");
    const planGrams = grams(planText);
    for (const field of [...DAD_PRIVATE, ...MAYA_PRIVATE]) {
      const overlap = [...grams(field)].filter((g) => planGrams.has(g));
      expect(overlap, `plan overlaps a private note: ${overlap.join(" | ")}`).toEqual([]);
    }
  });

  it("every 'might want understood' line is framed as a possibility, in every scenario", () => {
    for (const sc of Object.values(SCENARIOS)) {
      for (const line of [...sc.plan.parent.mightWant, ...sc.plan.teen.mightWant]) {
        expect(line).toMatch(/^(One|Another) possibility: /);
      }
    }
  });
});

describe("explicit review-and-share", () => {
  it("a draft is not shared, stored or sent until it is reviewed and approved", async () => {
    queue(() => reply("parent answer"));
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    await goTeen(user);
    await go(user, "Plan");
    await user.type(screen.getByLabelText(/what i'd like david to know/i), "DRAFT-NOT-YET-SHARED");
    await user.click(screen.getByRole("button", { name: /review before sharing/i }));
    expect(screen.getByRole("group", { name: /review what will be shared/i })).toHaveTextContent("DRAFT-NOT-YET-SHARED");
    // still in review: not stored, not visible to Dad, not sent
    expect(window.localStorage.getItem(STORAGE_KEY) ?? "").not.toContain("DRAFT-NOT-YET-SHARED");
    await goParent(user);
    expect(onScreen()).not.toContain("DRAFT-NOT-YET-SHARED");
    await go(user, "Chat");
    await user.type(box(), "Hi{Enter}");
    await screen.findByText("parent answer");
    expect(wireAt()).not.toContain("DRAFT-NOT-YET-SHARED");
  });

  it("an approved note reaches the other view and both requests; withdrawing removes it everywhere", async () => {
    queue(
      () => reply("parent with note"),
      () => reply("teen with note"),
      () => reply("parent after withdraw"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    await goTeen(user);
    await go(user, "Plan");
    await user.type(screen.getByLabelText(/what i'd like david to know/i), "APPROVED-BY-MAYA");
    await user.click(screen.getByRole("button", { name: /review before sharing/i }));
    await user.click(screen.getByRole("button", { name: /share this with david/i }));
    expect(screen.getByText("APPROVED-BY-MAYA")).toBeInTheDocument(); // "You have shared"

    await goParent(user);
    await go(user, "Plan");
    expect(screen.getByRole("heading", { name: /shared with you by maya/i })).toBeInTheDocument();
    expect(screen.getByText("APPROVED-BY-MAYA")).toBeInTheDocument();

    await go(user, "Chat");
    await user.type(box(), "Hi{Enter}");
    await screen.findByText("parent with note");
    expect(bodyAt().family_context.shared.shared_messages).toBe("From the teen: APPROVED-BY-MAYA");
    MAYA_PRIVATE.forEach((t) => expect(wireAt()).not.toContain(t)); // only the approved words crossed

    await goTeen(user);
    await go(user, "Chat");
    await user.type(box(), "Hey{Enter}");
    await screen.findByText("teen with note");
    expect(wireAt()).toContain("APPROVED-BY-MAYA");

    await go(user, "Plan");
    await user.click(screen.getByRole("button", { name: /withdraw shared note/i }));
    await goParent(user);
    await go(user, "Plan");
    expect(onScreen()).not.toContain("APPROVED-BY-MAYA");
    await go(user, "Chat");
    await user.type(box(), "Again{Enter}");
    await screen.findByText("parent after withdraw");
    expect(wireAt()).not.toContain("APPROVED-BY-MAYA");
    expect(bodyAt().family_context.shared).not.toHaveProperty("shared_messages");
  });

  it("'Keep editing' does not share", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    await go(user, "Plan");
    await user.type(screen.getByLabelText(/what i'd like maya to know/i), "CHANGED-MY-MIND");
    await user.click(screen.getByRole("button", { name: /review before sharing/i }));
    await user.click(screen.getByRole("button", { name: /keep editing/i }));
    expect(window.localStorage.getItem(STORAGE_KEY) ?? "").not.toContain("CHANGED-MY-MIND");
  });
});

describe("Party Night: Maya chooses to tell David about the pressure she felt", () => {
  it("the demo example only fills the draft; David learns it only after Maya reviews and shares", async () => {
    queue(
      () => reply("before share"),
      () => reply("after share"),
    );
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    // David asks first: nothing about the pressure is in his request.
    await user.click(screen.getByRole("button", { name: /repair after an argument/i }));
    await screen.findByText("before share");
    expect(wireAt()).not.toMatch(/felt like I had to/i);

    await goTeen(user);
    await go(user, "Plan");
    await user.click(screen.getByRole("button", { name: /fill in demo example/i }));
    const example = SCENARIOS["party-night"].shareExample!.teen!;
    expect(screen.getByLabelText(/what i'd like david to know/i)).toHaveValue(example);
    expect(window.localStorage.getItem(STORAGE_KEY) ?? "").not.toContain(example); // still only a draft
    await user.click(screen.getByRole("button", { name: /review before sharing/i }));
    await user.click(screen.getByRole("button", { name: /share this with david/i }));

    await goParent(user);
    await go(user, "Plan");
    expect(screen.getByText(example)).toBeInTheDocument();
    await go(user, "Chat");
    await user.type(box(), "She shared something with me. How should I respond?{Enter}");
    await screen.findByText("after share");
    expect(bodyAt().family_context.shared.shared_messages).toBe(`From the teen: ${example}`);
    // only her approved words crossed: her private situation and reflections did not
    MAYA_PRIVATE.forEach((t) => expect(wireAt()).not.toContain(t));
  });
});

describe("Reset demo with Party Night", () => {
  it("restores the Party Night seed, removes shared notes, clears chats, keeps the scenario", async () => {
    queue(() => reply("an answer"));
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    await go(user, "Plan");
    await user.type(screen.getByLabelText(/what i'd like maya to know/i), "NOTE-TO-RESET");
    await user.click(screen.getByRole("button", { name: /review before sharing/i }));
    await user.click(screen.getByRole("button", { name: /share this with maya/i }));
    await go(user, /family context/i);
    const sit = screen.getByLabelText(/what's happening right now/i);
    await user.clear(sit);
    await user.type(sit, "EDITED-SITUATION");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await go(user, "Chat");
    await user.type(box(), "Hello{Enter}");
    await screen.findByText("an answer");

    await user.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(screen.queryByText("an answer")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Demo scenario")).toHaveValue("party-night");
    expect(screen.getByRole("heading", { name: /what's on your mind, david/i })).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.scenario).toBe("party-night");
    expect(stored.parent.situation).toBe(PARTY.parent.situation);
    expect(stored.shared.messages).toEqual([]);
  });

  it("switching back to the career scenario restores the original example family", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await loadParty(user);
    await user.selectOptions(screen.getByLabelText("Demo scenario"), "career");
    expect(screen.getByRole("heading", { name: /what's on your mind, alex/i })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
