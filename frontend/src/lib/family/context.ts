import type {
  Audience,
  FamilyContextPayload,
  FamilyState,
  Goal,
  GoalStatus,
  NurturingGoal,
  ParentPrivate,
  Scope,
  SharedMessage,
  TeenPrivate,
} from "./types";

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
  situation: { label: "What's happening (in my words)", scope: "parent_private" },
  shared_goals: { label: "Shared goals", scope: "shared" },
  routines: { label: "Shared routines", scope: "shared" },
  commitments: { label: "Shared commitments", scope: "shared" },
  shared_messages: { label: "Notes approved for sharing", scope: "shared" },
};

/** The label of "situation" depends on whose it is. */
export function fieldMeta(key: string, audience: Audience) {
  if (key === "situation") {
    return { label: "What's happening (in my words)", scope: audience === "parent" ? "parent_private" : "teen_private" } as const;
  }
  return FIELD_META[key];
}

// Explicit allow-lists. They mirror backend/app/family_context.py; a key not listed here is never sent.
export const PARENT_OWN_KEYS = [
  "intentions",
  "values",
  "hopes",
  "concerns",
  "worldview",
  "nurturing_goals",
  "situation",
] as const;
export const TEEN_OWN_KEYS = ["interests", "strengths", "career_ideas", "aspirations", "personal_goals", "situation"] as const;
export const SHARED_KEYS = ["shared_goals", "routines", "commitments", "shared_messages"] as const;

/** Keep only allow-listed, non-blank string values. The final filter on everything that leaves the browser. */
function pick(allowed: readonly string[], rec: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of allowed) {
    const v = rec[key];
    if (typeof v === "string" && v.trim() !== "") out[key] = v.trim();
  }
  return out;
}

/**
 * What the family has agreed to share, as seen by EITHER side: agreed family goals, teen goals the teen
 * ticked "share", routines and commitments. This projection is the only route by which anything crosses.
 */
export interface SharedView {
  goals: Goal[];
  routines: string;
  commitments: string;
  /** Only notes someone explicitly approved with the review-and-share action. */
  messages: SharedMessage[];
}

export function sharedView(state: FamilyState): SharedView {
  return {
    goals: visibleSharedGoals(state),
    routines: state.shared.routines,
    commitments: state.shared.commitments,
    messages: state.shared.messages ?? [],
  };
}

const WHO: Record<Audience, string> = { parent: "the parent", teen: "the teen" };

function sharedFields(shared: SharedView) {
  return pick(SHARED_KEYS, {
    shared_goals: fmtGoals(shared.goals),
    routines: shared.routines,
    commitments: shared.commitments,
    shared_messages: shared.messages.map((m) => `From ${WHO[m.from]}: ${m.text}`).join(" | "),
  });
}

const payload = (audience: Audience, own: Record<string, string>, shared: Record<string, string>) =>
  Object.keys(own).length === 0 && Object.keys(shared).length === 0 ? null : { audience, own, shared };

/**
 * Parent-facing context. Takes ONLY the parent's own profile and the shared projection, so it has no way to
 * read the teen's private fields, reflections, unshared goals or chat.
 */
export function buildParentContext(parent: ParentPrivate, shared: SharedView): FamilyContextPayload | null {
  const own = pick(PARENT_OWN_KEYS, {
    intentions: parent.intentions,
    values: parent.values,
    hopes: parent.hopes,
    concerns: parent.concerns,
    worldview: parent.worldview,
    nurturing_goals: (parent.nurturingGoals ?? []).map((g) => NURTURING_LABEL[g]).join(", "),
    situation: parent.situation,
  });
  return payload("parent", own, sharedFields(shared));
}

/**
 * Teen-facing context. Takes ONLY the teen's own profile and the shared projection, so it cannot read the
 * parent's private notes. Reflections are never read. Shared teen goals arrive via `shared`, not `own`.
 */
export function buildTeenContext(teen: TeenPrivate, shared: SharedView): FamilyContextPayload | null {
  const own = pick(TEEN_OWN_KEYS, {
    interests: teen.interests,
    strengths: teen.strengths,
    career_ideas: teen.careerIdeas,
    aspirations: teen.aspirations,
    personal_goals: fmtGoals((teen.goals ?? []).filter((g) => !g.shared)),
    situation: teen.situation,
  });
  return payload("teen", own, sharedFields(shared));
}

/**
 * THE privacy boundary: the only way the app turns profile data into request context.
 * Each audience gets its own builder; only the shared projection is common to both.
 * Returns null when there is nothing to send (context is optional).
 */
export function buildFamilyContext(state: FamilyState, audience: Audience): FamilyContextPayload | null {
  const shared = sharedView(state);
  return audience === "parent" ? buildParentContext(state.parent, shared) : buildTeenContext(state.teen, shared);
}
