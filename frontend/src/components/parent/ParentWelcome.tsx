import { PARENT_NAME, TEEN_NAME } from "@/lib/family/seed";
import { suggestionsFor } from "@/lib/stages";
import type { ParentingStage } from "@/lib/types";

// Exported so the context page and tests reuse the exact demo wording.
export const CAREER_QUESTION =
  "How can I talk with my teen about a career choice when my hopes differ from their preference?";
export const WITHDRAWN_QUESTION = "My teen has become withdrawn lately. What might be going on, and how can I check in gently?";

const STARTERS = [
  { intent: "Understand a perspective", question: WITHDRAWN_QUESTION },
  { intent: "Prepare a conversation", question: CAREER_QUESTION },
  { intent: "How might this land?", question: "How might my teen hear this: \u201cWe need to talk about your grades tonight\u201d?" },
  { intent: "Clarify my intentions", question: "I want to protect my teen without controlling them. How can I tell the difference?" },
];

interface Props {
  stage: ParentingStage | null;
  onPick: (q: string) => void;
}

// Editorial, calm empty state for the parent: serif type, quiet cards, one clear promise.
export default function ParentWelcome({ stage, onPick }: Props) {
  const more = suggestionsFor(stage).slice(0, 2);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Parent · example profile</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-forest sm:text-5xl">
          What&apos;s on your mind, {PARENT_NAME}?
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          Think through possible perspectives, get clear on what you intend, and prepare for a real conversation with{" "}
          {TEEN_NAME}. CommonGround can&apos;t tell you what {TEEN_NAME} is thinking. Only {TEEN_NAME} can.
        </p>
      </div>

      <section aria-labelledby="parent-starters">
        <h2 id="parent-starters" className="mb-3 font-serif text-xl text-forest">
          Start with a question
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {STARTERS.map((s) => (
            <li key={s.intent}>
              <button
                type="button"
                onClick={() => onPick(s.question)}
                className="flex h-full min-h-11 w-full flex-col gap-1 rounded-2xl border border-line bg-paper p-4 text-left hover:border-sage hover:bg-sage-soft"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-sage">{s.intent}</span>
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
