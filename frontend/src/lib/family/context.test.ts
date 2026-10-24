import { describe, expect, it } from "vitest";
import { buildFamilyContext, visibleSharedGoals } from "./context";
import { SEED_FAMILY } from "./seed";
import type { FamilyState } from "./types";

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
