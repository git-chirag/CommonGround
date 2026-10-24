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
  /** Never sent to the assistant and never shown on the parent dashboard. */
  reflections: Reflection[];
}

export interface SharedContext {
  goals: Goal[];
  routines: string;
  commitments: string;
}

export interface FamilyState {
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
