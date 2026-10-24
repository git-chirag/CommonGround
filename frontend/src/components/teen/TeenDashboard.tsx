import { useId, useState } from "react";
import type { useChat } from "@/hooks/useChat";
import { visibleSharedGoals, STATUS_LABEL } from "@/lib/family/context";
import { PARENT_NAME, SEED_FAMILY, TEEN_NAME } from "@/lib/family/seed";
import type { FamilyState } from "@/lib/family/types";
import BoundaryPanel from "../shared/BoundaryPanel";
import ChatPanel from "../shared/ChatPanel";
import FieldGroupCard from "../shared/FieldGroupCard";
import GoalList from "../shared/GoalList";
import ScopeBadge from "../shared/ScopeBadge";

interface Props {
  state: FamilyState;
  update: (fn: (s: FamilyState) => FamilyState) => void;
  chat: ReturnType<typeof useChat>;
  ctxEnabled: boolean;
  onToggleCtx: (v: boolean) => void;
  onAsk: (text: string) => void;
  dark: boolean;
  onToggleDark: () => void;
}

// Colored "sticker" cards. Local CSS variables keep text readable on the bright backgrounds in both themes.
const card =
  "rounded-3xl border-2 border-night p-5 shadow-[5px_5px_0_0_#16112b] [--color-ink:#16112b] [--color-muted:#3b3558] [--color-line:#16112b55] [--color-paper:#ffffffe6] text-ink";
const h2 = "text-2xl font-black tracking-tight";

const FUTURE_PROMPTS = [
  "What problems do I like solving, even when they are hard?",
  "What would a great day of work look like for me?",
  "Who could I talk to who does something I'm curious about?",
];

const TALK_PROMPTS = [
  "What do I most want my parent to understand?",
  "When would be a calm time to start? What's my first sentence?",
  "What could I say if it starts to feel tense?",
];

const TALK_QUESTION = `How do I talk to my parent about my future plans without it turning into an argument?`;

function Reflections({ state, update }: Pick<Props, "state" | "update">) {
  const [text, setText] = useState("");
  const id = useId();
  const items = state.teen.reflections;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.length === 0 && <li className="text-sm text-muted">Nothing here yet.</li>}
        {items.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-2 rounded-xl border border-line bg-paper p-3 text-sm">
            <span className="whitespace-pre-wrap break-words">{r.text}</span>
            <button
              type="button"
              aria-label="Delete this reflection"
              onClick={() => update((s) => ({ ...s, teen: { ...s.teen, reflections: items.filter((x) => x.id !== r.id) } }))}
              className="min-h-11 shrink-0 px-2 text-xs underline underline-offset-2"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          const rid = `r-${Date.now().toString(36)}`;
          update((s) => ({ ...s, teen: { ...s.teen, reflections: [...items, { id: rid, text: t.slice(0, 800) }] } }));
          setText("");
        }}
      >
        <label htmlFor={`${id}-r`} className="text-sm font-medium">
          Write something for yourself
        </label>
        <textarea
          id={`${id}-r`}
          rows={2}
          maxLength={800}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="field-sizing-content min-h-14 resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm"
        />
        <button type="submit" className="min-h-11 self-start rounded-full bg-sage px-5 text-sm font-bold text-white hover:bg-sage-dark">
          Add reflection
        </button>
      </form>
    </div>
  );
}

export default function TeenDashboard({ state, update, chat, ctxEnabled, onToggleCtx, onAsk, dark, onToggleDark }: Props) {
  const t = state.teen;
  const setTeen = (patch: Partial<FamilyState["teen"]>) => update((s) => ({ ...s, teen: { ...s.teen, ...patch } }));
  const sharedGoals = visibleSharedGoals(state);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-block -rotate-2 rounded-md bg-lemon px-2 py-1 text-xs font-black uppercase tracking-widest text-night">
            Teen dashboard · example profile (fictional)
          </p>
          <h1 className="mt-3 text-5xl font-black leading-none tracking-tighter sm:text-7xl">
            Hey {TEEN_NAME}<span className="text-sage">.</span>
          </h1>
          <p className="mt-3 max-w-prose text-lg text-muted">
            Your interests, your goals, your pace. You decide what your family sees.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleDark}
          aria-pressed={dark}
          className="min-h-11 rounded-full border-2 border-ink px-5 text-sm font-bold hover:bg-sage-soft"
        >
          {dark ? "Dark theme: on" : "Dark theme: off"}
        </button>
      </header>

      <div className="grid items-start gap-4 md:grid-cols-6">
        <FieldGroupCard
          className={`${card} bg-lime md:col-span-3`}
          headingClass={h2}
          title="Interests and strengths"
          scope="teen_private"
          fields={[
            { key: "interests", label: "What are you into?" },
            { key: "strengths", label: "What are you good at?" },
          ]}
          values={{ interests: t.interests, strengths: t.strengths }}
          onSave={(v) => setTeen({ interests: v.interests, strengths: v.strengths })}
          onReset={() => setTeen({ interests: SEED_FAMILY.teen.interests, strengths: SEED_FAMILY.teen.strengths })}
        />

        <div className={`${card} bg-sky flex flex-col gap-4 md:col-span-3`}>
          <FieldGroupCard
            className=""
            headingClass={h2}
            title="Future and career exploration"
            description="Your ideas, in your words. Nobody picks them for you."
            scope="teen_private"
            fields={[
              { key: "careerIdeas", label: "Careers or paths you're curious about" },
              { key: "aspirations", label: "Where do you want to get to?" },
            ]}
            values={{ careerIdeas: t.careerIdeas, aspirations: t.aspirations }}
            onSave={(v) => setTeen({ careerIdeas: v.careerIdeas, aspirations: v.aspirations })}
            onReset={() => setTeen({ careerIdeas: SEED_FAMILY.teen.careerIdeas, aspirations: SEED_FAMILY.teen.aspirations })}
          />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide">Questions to explore</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {FUTURE_PROMPTS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </div>

        <ChatPanel
          chat={chat}
          heading="Think it through"
          intro="Ask anything about your goals or a conversation you're dreading. It won't tell your parent what you say here."
          suggestions={[
            TALK_QUESTION,
            "How can I explain why I'm excited about game design?",
            "I feel nervous about a difficult conversation. How can I prepare?",
          ]}
          className="h-[36rem] border-2 !border-ink md:col-span-4"
        />
        <div className="md:col-span-2">
          <BoundaryPanel audience="teen" state={state} enabled={ctxEnabled} onToggle={onToggleCtx} />
        </div>
        <section className={`${card} bg-lemon md:col-span-4`} aria-labelledby="goals-h">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <h2 id="goals-h" className={h2}>
              Goals and milestones
            </h2>
            <ScopeBadge scope="teen_private" />
          </div>
          <p className="mb-3 text-sm text-muted">
            Goals are private until you tick &ldquo;Share with family&rdquo;. Untick it any time to make one private again.
          </p>
          <GoalList goals={t.goals} onChange={(goals) => setTeen({ goals })} showShare addLabel="Add a goal or milestone" />
        </section>


        <section className={`${card} bg-lilac md:col-span-3`} aria-labelledby="refl-h">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
            <h2 id="refl-h" className={h2}>
              Private reflections
            </h2>
            <ScopeBadge scope="teen_private" />
          </div>
          <p className="mb-3 text-sm text-muted">
            Example entries (fictional). These stay on this device and are never sent to the assistant or shown on the parent
            view.
          </p>
          <Reflections state={state} update={update} />
        </section>

        <section className={`${card} bg-coral md:col-span-3`} aria-labelledby="talk-h">
          <h2 id="talk-h" className={`${h2} mb-3`}>
            Get ready for a tough conversation
          </h2>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
            {TALK_PROMPTS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onAsk(TALK_QUESTION)}
            className="min-h-11 rounded-full bg-night px-5 text-sm font-bold text-white hover:opacity-90"
          >
            Help me plan what to say
          </button>
        </section>

        <section className="rounded-3xl border-2 border-dashed border-ink p-5 md:col-span-2" aria-labelledby="shared-h">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h2 id="shared-h" className="text-xl font-black tracking-tight">
              What {PARENT_NAME} can see
            </h2>
            <ScopeBadge scope="shared" />
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {sharedGoals.map((g) => (
              <li key={g.id}>
                {g.text} <span className="text-muted">({STATUS_LABEL[g.status]})</span>
              </li>
            ))}
            {sharedGoals.length === 0 && <li className="text-muted">No goals shared yet.</li>}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Routines: {state.shared.routines || "none"} Commitments: {state.shared.commitments || "none"}
          </p>
        </section>

      </div>
    </main>
  );
}
