import { SCENARIO_ORDER, SCENARIOS, type ScenarioId } from "@/lib/family/scenarios";

interface Props {
  current: ScenarioId;
  onPick: (id: ScenarioId) => void;
}

// Demo control: loads a fictional example family. Replaces the example profiles and clears both chats.
export default function ScenarioPicker({ current, onPick }: Props) {
  return (
    <div className="shrink-0 border-b border-line bg-paper text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-1.5 text-xs lg:px-6">
        <label htmlFor="scenario" className="font-medium">
          Demo scenario
        </label>
        <select
          id="scenario"
          value={current}
          onChange={(e) => onPick(e.target.value as ScenarioId)}
          className="min-h-11 rounded-full border border-line bg-paper px-3 text-sm"
        >
          {SCENARIO_ORDER.map((id) => (
            <option key={id} value={id}>
              {SCENARIOS[id].label}
            </option>
          ))}
        </select>
        <span className="hidden text-muted md:inline">{SCENARIOS[current].blurb} All people and details are fictional.</span>
      </div>
    </div>
  );
}
