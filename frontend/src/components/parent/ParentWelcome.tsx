import type { Scenario } from "@/lib/family/scenarios";
import { suggestionsFor } from "@/lib/stages";
import type { ParentingStage } from "@/lib/types";

interface Props {
  scenario: Scenario;
  stage: ParentingStage | null;
  onPick: (q: string) => void;
  /** Demo mode: returns true for starters that have a pre-written example answer. */
  hasExample?: (q: string) => boolean;
}

// Editorial, calm empty state for the parent: serif type, quiet cards, one clear promise.
export default function ParentWelcome({ scenario, stage, onPick, hasExample }: Props) {
  const { parentName, teenName, parentStarters } = scenario;
  const more = suggestionsFor(stage).slice(0, 2);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Parent · example profile · {scenario.label}</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-forest sm:text-5xl">
          What&apos;s on your mind, {parentName}?
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          Think through possible perspectives, get clear on what you intend, and prepare for a real conversation with{" "}
          {teenName}. CommonGround can&apos;t tell you what {teenName} is thinking. Only {teenName} can.
        </p>
      </div>

      <section aria-labelledby="parent-starters">
        <h2 id="parent-starters" className="mb-3 font-serif text-xl text-forest">
          Start with a question
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {parentStarters.map((s) => (
            <li key={s.tag}>
              <button
                type="button"
                onClick={() => onPick(s.question)}
                className="flex h-full min-h-11 w-full flex-col gap-1 rounded-2xl border border-line bg-paper p-4 text-left hover:border-sage hover:bg-sage-soft"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-sage">{s.tag}</span>
                {hasExample?.(s.question) && (
                  <span className="self-start rounded-full border border-current px-2 text-[11px] font-medium">
                    Pre-written example
                  </span>
                )}
                <span className="text-sm text-ink">{s.question}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {more.length > 0 && (
        <section aria-labelledby="parent-more">
          <h2 id="parent-more" className="mb-2 text-sm font-medium text-muted">
            {stage ? "Also common at this stage" : "Other places to start"}
          </h2>
          <ul className="flex flex-col gap-1">
            {more.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => onPick(q)}
                  className="min-h-11 text-left text-sm text-sage underline underline-offset-4 hover:text-sage-dark"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
