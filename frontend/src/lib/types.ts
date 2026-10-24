export type Role = "user" | "assistant";

// A source the backend retrieved for an answer. Shown to the user as-is.
export interface Source {
  n: number; // the [S<n>] label in the reply
  id: string;
  title: string;
  publisher: string;
  url: string;
  published: string | null;
  accessed: string;
  kind: string;
  verifiedVia: string;
  cited: boolean;
}

export type Grounding = "retrieved" | "none";

export interface Message {
  role: Role;
  content: string;
  // Assistant messages only, and only when sources were requested.
  grounding?: Grounding;
  sources?: Source[];
}

// Must match the backend enum `ParentingStage` (backend/app/prompts.py).
export type ParentingStage =
  | "preparing"
  | "pregnancy_infancy"
  | "early_childhood"
  | "school_age"
  | "adolescence"
  | "adult_relationships";

// What went wrong, in terms the UI cares about (not raw HTTP details).
export type ChatErrorKind =
  | "unavailable" // 503
  | "timeout" // 504 or client-side timeout
  | "failed" // 502 / other server errors
  | "invalid" // 422
  | "network"; // no response, CORS failure, unreadable body
