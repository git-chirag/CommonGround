import type { Audience, FamilyContextPayload, FamilyState, Goal, GoalStatus, NurturingGoal, Scope } from "./types";

export const STATUS_LABEL: Record<GoalStatus, string> = { todo: "To do", doing: "In progress", done: "Done" };

export const NURTURING_LABEL: Record<NurturingGoal, string> = {
  independence: "Independence",
  empathy: "Empathy",
  critical_thinking: "Critical thinking",
  education: "Education",
  emotional_skills: "Emotional skills",
};

/** Goals the whole family can see: agreed family goals + teen goals the teen chose to share. */
export function visibleSharedGoals(state: FamilyState): Goal[] {
  return [...state.shared.goals, ...state.teen.goals.filter((g) => g.shared)];
}

const fmtGoals = (goals: Goal[]) => goals.map((g) => `${g.text} (${STATUS_LABEL[g.status]})`).join("; ");

// Field metadata, so the boundary panel can show exactly what is sent and under which scope.
export const FIELD_META: Record<string, { label: string; scope: Scope }> = {
  intentions: { label: "Parenting intentions", scope: "parent_private" },
  values: { label: "Values and principles", scope: "parent_private" },
  hopes: { label: "Hopes", scope: "parent_private" },
  concerns: { label: "Concerns", scope: "parent_private" },
  worldview: { label: "Worldview / cultural values (self-described)", scope: "parent_private" },
  nurturing_goals: { label: "Skills to nurture", scope: "parent_private" },
  interests: { label: "Interests", scope: "teen_private" },
  strengths: { label: "Strengths", scope: "teen_private" },
  career_ideas: { label: "Career ideas", scope: "teen_private" },
  aspirations: { label: "Aspirations", scope: "teen_private" },
  personal_goals: { label: "Personal goals (not shared)", scope: "teen_private" },
  shared_goals: { label: "Shared goals", scope: "shared" },
  routines: { label: "Shared routines", scope: "shared" },
  commitments: { label: "Shared commitments", scope: "shared" },
};

const compact = (rec: Record<string, string>) =>
  Object.fromEntries(Object.entries(rec).filter(([, v]) => v.trim() !== "")) as Record<string, string>;

/**
 * THE privacy boundary. The only function that decides which profile data may leave the browser.
 * - The current audience's own private fields, plus shared fields. Nothing from the other side.
 * - Teen reflections are never included.
 * - Returns null when there is nothing to send (context is optional).
 */
export function buildFamilyContext(state: FamilyState, audience: Audience): FamilyContextPayload | null {
  const own =
    audience === "parent"
      ? compact({
          intentions: state.parent.intentions,
          values: state.parent.values,
          hopes: state.parent.hopes,
          concerns: state.parent.concerns,
          worldview: state.parent.worldview,
          nurturing_goals: state.parent.nurturingGoals.map((g) => NURTURING_LABEL[g]).join(", "),
        })
      : compact({
          interests: state.teen.interests,
          strengths: state.teen.strengths,
          career_ideas: state.teen.careerIdeas,
          aspirations: state.teen.aspirations,
          // Goals already shared appear under `shared`; only the unshared ones are teen-private.
          personal_goals: fmtGoals(state.teen.goals.filter((g) => !g.shared)),
        });
  const shared = compact({
    shared_goals: fmtGoals(visibleSharedGoals(state)),
    routines: state.shared.routines,
    commitments: state.shared.commitments,
  });
  if (Object.keys(own).length === 0 && Object.keys(shared).length === 0) return null;
  return { audience, own, shared };
}
