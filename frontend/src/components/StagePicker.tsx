import { STAGES } from "@/lib/stages";
import type { ParentingStage } from "@/lib/types";

interface Props {
  value: ParentingStage | null;
  onChange: (stage: ParentingStage | null) => void;
  legend?: string;
}

// Big, friendly radio chips for the welcome screen. Native radios give us
// arrow-key navigation and screen-reader semantics for free.
export default function StagePicker({ value, onChange, legend = "Where are you in your parenting journey?" }: Props) {
  return (
    <fieldset>
      <legend className="mb-3 text-base font-medium">
        {legend} <span className="font-normal text-muted">(optional)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <label key={s.id} className="cursor-pointer">
            <input
              type="radio"
              name="parenting-stage"
              className="peer sr-only"
              checked={value === s.id}
              onChange={() => onChange(s.id)}
            />
            <span className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-medium hover:bg-sand peer-checked:border-sage peer-checked:bg-sage peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sage">
              {s.label}
            </span>
          </label>
        ))}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-3 min-h-11 text-sm text-muted underline underline-offset-2 hover:text-ink"
        >
          Clear selection
        </button>
      )}
    </fieldset>
  );
}
