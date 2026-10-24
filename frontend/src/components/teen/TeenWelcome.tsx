import { TEEN_NAME } from "@/lib/family/seed";

export const TALK_QUESTION = "How do I talk to my parent about my future plans without it turning into an argument?";

// Bright "sticker" cards. Local CSS variables keep text dark on the bright fills in both themes.
const STARTERS = [
  { tag: "Put it into words", bg: "bg-lime", question: "I feel annoyed and I'm not sure why. Can you help me figure out what I'm feeling?" },
  { tag: "Prepare for a hard talk", bg: "bg-coral", question: TALK_QUESTION },
  { tag: "Explore what I'm into", bg: "bg-sky", question: "How can I explain to my family why I'm excited about game design?" },
  { tag: "Decide what to share", bg: "bg-lemon", question: "How do I decide what to tell my parents and what to keep to myself?" },
  { tag: "Just need support", bg: "bg-lilac", question: "Today was rough and I don't want advice yet. Can we just talk?" },
];

export default function TeenWelcome({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="inline-block -rotate-2 rounded-md bg-lemon px-2 py-1 text-xs font-black uppercase tracking-widest text-night">
          Teen · example profile
        </p>
        <h1 className="mt-3 text-5xl font-black leading-none tracking-tighter sm:text-6xl">
          Hey {TEEN_NAME}
          <span className="text-sage">.</span>
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          Talk things through, figure out what you want to say, or just vent. You don&apos;t have to share anything
          you&apos;re not ready to. Your chats here aren&apos;t shown in the parent view or sent with your parent&apos;s
          questions.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {STARTERS.map((s, i) => (
          <li key={s.tag} className={i === 0 ? "sm:col-span-2" : undefined}>
            <button
              type="button"
              onClick={() => onPick(s.question)}
              className={`${s.bg} flex h-full min-h-11 w-full flex-col gap-1 rounded-3xl border-2 border-night p-4 text-left text-night shadow-[4px_4px_0_0_#16112b] transition hover:-translate-y-0.5`}
            >
              <span className="text-xs font-black uppercase tracking-widest">{s.tag}</span>
              <span className="text-sm font-medium">{s.question}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
