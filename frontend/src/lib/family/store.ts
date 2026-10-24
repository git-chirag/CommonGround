import { useCallback, useSyncExternalStore } from "react";
import { SEED_FAMILY } from "./seed";
import type { FamilyState } from "./types";

/**
 * Browser-local store for the FICTIONAL demo profiles. Only the example profiles are kept in
 * localStorage (conversations never are). It is not secure storage and not account isolation.
 */
export const STORAGE_KEY = "commonground-demo-family-v1";

let cache: { raw: string | null; state: FamilyState } = { raw: null, state: SEED_FAMILY };
const listeners = new Set<() => void>();

function isFamilyState(v: unknown): v is FamilyState {
  const s = v as Partial<FamilyState> | null;
  return !!s && typeof s === "object" && !!s.parent && !!s.teen && !!s.shared && Array.isArray(s.teen.goals);
}

function getSnapshot(): FamilyState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cache.state; // storage blocked: keep working in memory
  }
  if (raw === cache.raw) return cache.state; // stable reference between calls
  let state = SEED_FAMILY;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isFamilyState(parsed)) state = parsed;
    } catch {
      /* corrupt value: fall back to the example data */
    }
  }
  cache = { raw, state };
  return state;
}

function write(state: FamilyState | null) {
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    cache = { raw: cache.raw, state: state ?? SEED_FAMILY }; // in-memory fallback
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFamily() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SEED_FAMILY);
  const update = useCallback((fn: (s: FamilyState) => FamilyState) => write(fn(getSnapshot())), []);
  const reset = useCallback(() => write(null), []);
  return { state, update, reset };
}
