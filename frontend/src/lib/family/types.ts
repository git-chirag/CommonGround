import type { ParentingStage } from "../types";

export type Audience = "parent" | "teen";

// Where a piece of information may be seen. This drives badges AND what is sent to the assistant.
export type Scope = "parent_private" | "teen_private" | "shared";

export type GoalStatus = "todo" | "doing" | "done";

export interface Goal {
  id: string;
  text: string;
  status: GoalStatus;
  /** Only meaningful on a teen's personal goal: true = the teen chose to share it with the family. */
  shared: boolean;
}

export type NurturingGoal = "independence" | "empathy" | "critical_thinking" | "education" | "emotional_skills";

export interface ParentPrivate {
  stage: ParentingStage | null;
  intentions: string;
  values: string;
  hopes: string;
  concerns: string;
  /** Optional, self-described. Never inferred by the app. */
  worldview: string;
  nurturingGoals: NurturingGoal[];
  /** Optional: what is happening right now, in the parent's words. Private. */
  situation?: string;
}

export interface Reflection {
  id: string;
  text: string;
}

export interface TeenPrivate {
  interests: string;
  strengths: string;
  careerIdeas: string;
  aspirations: string;
  goals: Goal[];
  /** Optional: what is happening right now, in the teen's words. Private. */
  situation?: string;
  /** Never sent to the assistant and never shown on the parent dashboard. */
  reflections: Reflection[];
}

/** A note one person reviewed and explicitly approved for the other person to see. */
export interface SharedMessage {
  id: string;
  from: Audience;
  text: string;
  /** ISO timestamp of the approval. */
  approvedAt: string;
}

export interface SharedContext {
  goals: Goal[];
  routines: string;
  commitments: string;
  /** Only filled by an explicit review-and-share action. Older saved states may lack it. */
  messages?: SharedMessage[];
}

export interface FamilyState {
  /** Which fictional demo scenario this state came from. Older saved states may lack it. */
  scenario?: "career" | "party-night";
  parent: ParentPrivate;
  teen: TeenPrivate;
  shared: SharedContext;
}

// What goes over the wire (matches backend/app/family_context.py).
export interface FamilyContextPayload {
  audience: Audience;
  own: Record<string, string>;
  shared: Record<string, string>;
}
