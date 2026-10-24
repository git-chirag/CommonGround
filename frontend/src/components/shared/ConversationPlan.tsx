import { useId, useState } from "react";
import type { Scenario } from "@/lib/family/scenarios";
import type { Audience, FamilyState, SharedMessage } from "@/lib/family/types";
import ScopeBadge from "./ScopeBadge";

interface Props {
  audience: Audience;
  scenario: Scenario;
  state: FamilyState;
  update: (fn: (s: FamilyState) => FamilyState) => void;
  onAsk: (text: string) => void;
}

const MAX_SHARE_CHARS = 400;

const newId = () => `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Review-and-share. Text starts as a local draft (never stored, never sent). Only after the person reviews
 * the exact words and confirms does it become a SharedMessage, which both people can see and which both
 * audiences' requests may include. It can be withdrawn at any time.
 */
function ShareBox({ otherName, mine, onShare, onWithdraw, example }: {
  otherName: string;
  /** Optional fictional demo text. Only fills the draft; sharing still needs review + confirm. */
  example?: string;
  mine: SharedMessage[];
  onShare: (text: string) => void;
  onWithdraw: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const id = useId();
  const text = draft.trim();

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-2xl border border-line bg-paper p-4 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-h`} className="font-semibold">
          Share something with {otherName} (optional)
        </h3>
        <ScopeBadge scope="shared" />
      </div>
      <p className="mt-1 text-sm text-muted">
        Nothing from your private notes or chats is shared automatically. Write only what you want {otherName} to see.
        You&apos;ll review it before it&apos;s shared, and you can withdraw it later.
      </p>

      {!reviewing ? (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text) setReviewing(true);
          }}
        >
          <label htmlFor={`${id}-draft`} className="text-sm font-medium">
            What I&apos;d like {otherName} to know
          </label>
          <textarea
            id={`${id}-draft`}
            rows={3}
            maxLength={MAX_SHARE_CHARS}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="field-sizing-content min-h-20 resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!text}
              className="min-h-11 rounded-full border border-line px-4 text-sm font-medium hover:bg-sage-soft disabled:opacity-50"
            >
              Review before sharing
            </button>
            {example && !text && (
              <button
                type="button"
                onClick={() => setDraft(example)}
                className="min-h-11 rounded-full px-3 text-sm text-muted underline underline-offset-2 hover:text-ink"
              >
                Fill in demo example
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Review what will be shared">
          <p className="text-sm font-medium">{otherName} will see exactly this:</p>
          <blockquote className="whitespace-pre-wrap break-words rounded-xl border-l-4 border-sage bg-sage-soft p-3 text-sm">
            {text}
          </blockquote>
          <p className="text-xs text-muted">
            It will also be included in both of your chats with CommonGround as a shared note.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onShare(text);
                setDraft("");
                setReviewing(false);
              }}
              className="min-h-11 rounded-full bg-sage px-5 text-sm font-medium text-white hover:bg-sage-dark"
            >
              Share this with {otherName}
            </button>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="min-h-11 rounded-full border border-line px-4 text-sm font-medium hover:bg-sand"
            >
              Keep editing
            </button>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium">You have shared</h4>
          <ul className="mt-1 flex flex-col gap-2">
            {mine.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-2 rounded-xl border border-line p-3 text-sm">
                <span className="whitespace-pre-wrap break-words">{m.text}</span>
                <button
                  type="button"
                  onClick={() => onWithdraw(m.id)}
                  aria-label={`Withdraw shared note: ${m.text.slice(0, 40)}`}
                  className="min-h-11 shrink-0 px-2 text-xs underline underline-offset-2"
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Side({ title, side }: { title: string; side: { mightWant: string[]; opener: string } }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 text-ink">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">Might want understood (possibilities)</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {side.mightWant.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">A possible opening line</p>
      <p className="text-sm italic">{side.opener}</p>
    </div>
  );
}

// The guided conversation plan. Static, general guidance + shared context only: it reads no private notes or chats.
export default function ConversationPlan({ audience, scenario, state, update, onAsk }: Props) {
  const { plan, parentName, teenName } = scenario;
  const messages = state.shared.messages ?? [];
  const sharedGoals = state.shared.goals;
  const otherName = audience === "parent" ? teenName : parentName;
  const fromOther = messages.filter((m) => m.from !== audience);
  const mine = messages.filter((m) => m.from === audience);
  const teen = audience === "teen";

  const share = (text: string) =>
    update((s) => ({
      ...s,
      shared: {
        ...s.shared,
        messages: [
          ...(s.shared.messages ?? []),
          { id: newId(), from: audience, text: text.slice(0, MAX_SHARE_CHARS), approvedAt: new Date().toISOString() },
        ],
      },
    }));
  const withdraw = (id: string) =>
    update((s) => ({ ...s, shared: { ...s.shared, messages: (s.shared.messages ?? []).filter((m) => m.id !== id) } }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header>
        <p className={teen ? "text-xs font-black uppercase tracking-widest text-muted" : "text-xs uppercase tracking-[0.2em] text-muted"}>
          Conversation plan · {scenario.label} · fictional example
        </p>
        <h1 className={teen ? "mt-2 text-4xl font-black tracking-tight" : "mt-2 font-serif text-4xl text-forest"}>{plan.title}</h1>
        <p className="mt-2 max-w-prose text-muted">{plan.intro}</p>
        <p className="mt-2 max-w-prose rounded-xl bg-sand p-3 text-sm text-ink">
          These are possible interpretations, not facts. CommonGround does not know what either of you feels. The best
          way to find out is to ask each other.
        </p>
      </header>

      <section aria-labelledby="plan-sides" className="flex flex-col gap-3">
        <h2 id="plan-sides" className="text-lg font-semibold">
          What each of you might want understood
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Side title={`${parentName} (parent)`} side={plan.parent} />
          <Side title={`${teenName} (teen)`} side={plan.teen} />
        </div>
      </section>

      <section aria-labelledby="plan-q" className="rounded-2xl border border-line bg-paper p-4 text-ink">
        <h2 id="plan-q" className="text-lg font-semibold">
          Open questions to ask each other
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {plan.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="plan-a" className="rounded-2xl border border-line bg-paper p-4 text-ink">
        <h2 id="plan-a" className="text-lg font-semibold">
          A simple agreement to fill in together
        </h2>
        <p className="mt-1 text-sm text-muted">
          Safety planning supports independence. It is not a punishment, and it is not tied to what anyone wears.
        </p>
        <dl className="mt-3 flex flex-col gap-3">
          {plan.agreement.map((a) => (
            <div key={a.label}>
              <dt className="text-sm font-medium">{a.label}</dt>
              <dd className="mt-1 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">{a.prompt}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="rounded-2xl border-2 border-sage p-4 text-sm font-medium text-ink">{plan.pauseReminder}</p>

      <section aria-labelledby="plan-shared" className="flex flex-col gap-3">
        <h2 id="plan-shared" className="text-lg font-semibold">
          What you&apos;ve both agreed to share
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {sharedGoals.map((g) => (
            <li key={g.id}>{g.text}</li>
          ))}
          {state.shared.commitments && <li>{state.shared.commitments}</li>}
        </ul>
        {fromOther.length > 0 && (
          <div className="rounded-2xl border border-line bg-paper p-4 text-ink">
            <h3 className="flex flex-wrap items-center gap-2 font-semibold">
              Shared with you by {otherName} <ScopeBadge scope="shared" />
            </h3>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {fromOther.map((m) => (
                <li key={m.id} className="whitespace-pre-wrap break-words rounded-xl bg-sage-soft p-3">
                  {m.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ShareBox
          otherName={otherName}
          mine={mine}
          onShare={share}
          onWithdraw={withdraw}
          example={scenario.shareExample?.[audience]}
        />
      </section>

      <button
        type="button"
        onClick={() =>
          onAsk(
            `Help me prepare for a conversation with my ${audience === "parent" ? scenario.childNoun : "parent"} using the plan: what to say first, what to ask, and how to keep it calm.`,
          )
        }
        className="min-h-11 self-start rounded-full bg-sage px-5 text-sm font-medium text-white hover:bg-sage-dark"
      >
        Talk this plan through in chat
      </button>
    </div>
  );
}
