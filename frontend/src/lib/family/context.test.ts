import { describe, expect, it } from "vitest";
import {
  buildFamilyContext,
  buildParentContext,
  buildTeenContext,
  PARENT_OWN_KEYS,
  SHARED_KEYS,
  sharedView,
  TEEN_OWN_KEYS,
  visibleSharedGoals,
} from "./context";
import { SEED_FAMILY } from "./seed";
import type { FamilyState, ParentPrivate, TeenPrivate } from "./types";

// Unique markers so we can prove nothing leaks across scopes.
const P = "PARENT-ONLY-MARKER";
const T = "TEEN-ONLY-MARKER";
const REFLECTION = "REFLECTION-MARKER";

function state(): FamilyState {
  return {
    parent: { ...SEED_FAMILY.parent, hopes: P, worldview: P + "-worldview" },
    teen: {
      ...SEED_FAMILY.teen,
      careerIdeas: T,
      reflections: [{ id: "x", text: REFLECTION }],
      goals: [
        { id: "a", text: "SHARED-TEEN-GOAL", status: "doing", shared: true },
        { id: "b", text: "PRIVATE-TEEN-GOAL", status: "todo", shared: false },
      ],
    },
    shared: { goals: [{ id: "s", text: "FAMILY-GOAL", status: "todo", shared: true }], routines: "R", commitments: "C" },
  };
}
const json = (v: unknown) => JSON.stringify(v);

describe("buildFamilyContext", () => {
  it("parent payload has parent-private + shared, never teen-private or reflections", () => {
    const out = json(buildFamilyContext(state(), "parent"));
    expect(out).toContain(P);
    expect(out).toContain("FAMILY-GOAL");
    expect(out).toContain("SHARED-TEEN-GOAL"); // the teen chose to share it
    expect(out).not.toContain(T);
    expect(out).not.toContain("PRIVATE-TEEN-GOAL");
    expect(out).not.toContain(REFLECTION);
    expect(out).not.toContain(SEED_FAMILY.teen.interests);
  });

  it("teen payload has teen-private + shared, never parent-private or reflections", () => {
    const ctx = buildFamilyContext(state(), "teen")!;
    const out = json(ctx);
    expect(out).toContain(T);
    expect(out).toContain("PRIVATE-TEEN-GOAL");
    expect(out).toContain("FAMILY-GOAL");
    expect(out).not.toContain(P);
    expect(out).not.toContain(SEED_FAMILY.parent.values);
    expect(out).not.toContain(REFLECTION);
    // a shared teen goal is listed once, under `shared`, not as a private goal
    expect(ctx.own.personal_goals).not.toContain("SHARED-TEEN-GOAL");
    expect(ctx.shared.shared_goals).toContain("SHARED-TEEN-GOAL");
  });

  it("un-sharing a teen goal removes it from the parent's view and payload", () => {
    const s = state();
    s.teen.goals[0].shared = false;
    expect(visibleSharedGoals(s).map((g) => g.text)).toEqual(["FAMILY-GOAL"]);
    expect(json(buildFamilyContext(s, "parent"))).not.toContain("SHARED-TEEN-GOAL");
  });

  it("omits empty fields and returns null when there is nothing to send", () => {
    const empty: FamilyState = {
      parent: { ...SEED_FAMILY.parent, intentions: "", values: "", hopes: "", concerns: "", worldview: "", nurturingGoals: [] },
      teen: { ...SEED_FAMILY.teen, interests: "", strengths: "", careerIdeas: "", aspirations: "", goals: [] },
      shared: { goals: [], routines: " ", commitments: "" },
    };
    expect(buildFamilyContext(empty, "parent")).toBeNull();
    expect(buildFamilyContext(empty, "teen")).toBeNull();
    const s = state();
    s.parent.worldview = "";
    expect(buildFamilyContext(s, "parent")!.own).not.toHaveProperty("worldview");
  });

  it("only uses keys the backend allows for each audience", () => {
    const parentKeys = ["intentions", "values", "hopes", "concerns", "worldview", "nurturing_goals"];
    const teenKeys = ["interests", "strengths", "career_ideas", "aspirations", "personal_goals"];
    const sharedKeys = ["shared_goals", "routines", "commitments"];
    const p = buildFamilyContext(SEED_FAMILY, "parent")!;
    const t = buildFamilyContext(SEED_FAMILY, "teen")!;
    expect(Object.keys(p.own).every((k) => parentKeys.includes(k))).toBe(true);
    expect(Object.keys(t.own).every((k) => teenKeys.includes(k))).toBe(true);
    expect(Object.keys(p.shared).every((k) => sharedKeys.includes(k))).toBe(true);
  });

  it("seed data tells the demo story: teen's career ideas stay private", () => {
    const p = json(buildFamilyContext(SEED_FAMILY, "parent"));
    expect(p).toContain("Build and release a small game");
    expect(p).not.toContain("Game design or software engineering");
    expect(p).not.toContain("nervous bringing up");
  });
});

describe("audience-scoped builders", () => {
  it("each builder only accepts its own profile plus the shared projection", () => {
    const s = state();
    const shared = sharedView(s);
    expect(JSON.stringify(buildParentContext(s.parent, shared))).not.toContain(T);
    expect(JSON.stringify(buildTeenContext(s.teen, shared))).not.toContain(P);
  });

  it("runtime allow-lists drop fields that were smuggled into a profile object", () => {
    const s = state();
    const shared = sharedView(s);
    const dirtyParent = { ...s.parent, careerIdeas: T, reflections: [{ id: "x", text: REFLECTION }] } as unknown as ParentPrivate;
    const dirtyTeen = { ...s.teen, hopes: P, concerns: P, worldview: P } as unknown as TeenPrivate;
    const p = buildParentContext(dirtyParent, shared)!;
    const t = buildTeenContext(dirtyTeen, shared)!;
    expect(JSON.stringify(p)).not.toContain(T);
    expect(JSON.stringify(p)).not.toContain(REFLECTION);
    expect(JSON.stringify(t)).not.toContain(P);
    expect(Object.keys(p.own).every((k) => (PARENT_OWN_KEYS as readonly string[]).includes(k))).toBe(true);
    expect(Object.keys(t.own).every((k) => (TEEN_OWN_KEYS as readonly string[]).includes(k))).toBe(true);
    expect(Object.keys(p.shared).every((k) => (SHARED_KEYS as readonly string[]).includes(k))).toBe(true);
  });

  it("the shared projection holds only family goals and goals the teen ticked to share", () => {
    const v = sharedView(state());
    expect(v.goals.map((g) => g.text)).toEqual(["FAMILY-GOAL", "SHARED-TEEN-GOAL"]);
    expect(JSON.stringify(v)).not.toContain("PRIVATE-TEEN-GOAL");
    expect(JSON.stringify(v)).not.toContain(REFLECTION);
  });

  it("a goal the parent adds to the shared list reaches the teen; parent-private edits do not", () => {
    const s = state();
    s.shared.goals.push({ id: "p", text: "PARENT-ADDED-SHARED-GOAL", status: "todo", shared: true });
    s.parent.concerns = "PARENT-PRIVATE-EDIT";
    const t = JSON.stringify(buildFamilyContext(s, "teen"));
    expect(t).toContain("PARENT-ADDED-SHARED-GOAL");
    expect(t).not.toContain("PARENT-PRIVATE-EDIT");
  });
});
