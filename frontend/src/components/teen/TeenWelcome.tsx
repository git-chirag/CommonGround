import type { Scenario } from "@/lib/family/scenarios";

// Bright "sticker" cards. Text stays dark on the bright fills in both themes.
const FILLS = ["bg-lime", "bg-coral", "bg-sky", "bg-lemon", "bg-lilac"];

interface Props {
  scenario: Scenario;
  onPick: (q: string) => void;
  /** Demo mode: returns true for starters that have a pre-written example answer. */
  hasExample?: (q: string) => boolean;
}

export default function TeenWelcome({ scenario, onPick, hasExample }: Props) {
  const { teenName, teenStarters } = scenario;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="inline-block -rotate-2 rounded-md bg-lemon px-2 py-1 text-xs font-black uppercase tracking-widest text-night">
          Teen · example profile · {scenario.label}
        </p>
        <h1 className="mt-3 text-5xl font-black leading-none tracking-tighter sm:text-6xl">
          Hey {teenName}
          <span className="text-sage">.</span>
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          Talk things through, figure out what you want to say, or just vent. You don&apos;t have to share anything
          you&apos;re not ready to. Your chats here aren&apos;t shown in the parent view or sent with your parent&apos;s
          questions.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {teenStarters.map((s, i) => (
          <li key={s.tag} className={i === 0 ? "sm:col-span-2" : undefined}>
            <button
              type="button"
              onClick={() => onPick(s.question)}
              className={`${FILLS[i % FILLS.length]} flex h-full min-h-11 w-full flex-col gap-1 rounded-3xl border-2 border-night p-4 text-left text-night shadow-[4px_4px_0_0_#16112b] transition hover:-translate-y-0.5`}
            >
              <span className="text-xs font-black uppercase tracking-widest">{s.tag}</span>
                {hasExample?.(s.question) && (
                  <span className="self-start rounded-full border border-current px-2 text-[11px] font-medium">
                    Pre-written example
                  </span>
                )}
              <span className="text-sm font-medium">{s.question}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
