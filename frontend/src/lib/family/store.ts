import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SCENARIO, isScenarioId, SCENARIOS, type Scenario, type ScenarioId } from "./scenarios";
import { SEED_FAMILY } from "./seed";
import type { FamilyState } from "./types";

/**
 * Browser-local store for the FICTIONAL demo profiles. Only the example profiles are kept in
 * localStorage (conversations never are). It is not secure storage and not account isolation.
 */
export const STORAGE_KEY = "commonground-demo-family-v1";

const DEFAULT_STATE: FamilyState = { ...SEED_FAMILY, scenario: DEFAULT_SCENARIO };

let cache: { raw: string | null; state: FamilyState } = { raw: null, state: DEFAULT_STATE };
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
  let state = DEFAULT_STATE;
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
    cache = { raw: cache.raw, state: state ?? DEFAULT_STATE }; // in-memory fallback
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A fresh copy of a scenario's fictional seed, so edits never mutate the template. */
export function seedFor(id: ScenarioId): FamilyState {
  return { ...structuredClone(SCENARIOS[id].seed), scenario: id };
}

export function useFamily() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);
  const scenarioId: ScenarioId = isScenarioId(state.scenario) ? state.scenario : DEFAULT_SCENARIO;
  const scenario: Scenario = SCENARIOS[scenarioId];
  const update = useCallback((fn: (s: FamilyState) => FamilyState) => write(fn(getSnapshot())), []);
  /** Restore the CURRENT scenario's fictional seed (the default scenario is stored as "nothing"). */
  const reset = useCallback(() => {
    const id = isScenarioId(getSnapshot().scenario) ? getSnapshot().scenario! : DEFAULT_SCENARIO;
    write(id === DEFAULT_SCENARIO ? null : seedFor(id));
  }, []);
  /** Load a scenario's fictional seed, replacing the current example profiles. */
  const loadScenario = useCallback((id: ScenarioId) => write(id === DEFAULT_SCENARIO ? null : seedFor(id)), []);
  return { state, update, reset, scenario, loadScenario };
}
