import { NURTURING_LABEL, visibleSharedGoals } from "@/lib/family/context";
import type { Scenario } from "@/lib/family/scenarios";
import type { FamilyState, NurturingGoal } from "@/lib/family/types";
import { RESOURCES } from "@/lib/resources";
import StagePicker from "../StagePicker";
import FieldGroupCard from "../shared/FieldGroupCard";
import GoalList from "../shared/GoalList";
import ScopeBadge from "../shared/ScopeBadge";

interface Props {
  state: FamilyState;
  update: (fn: (s: FamilyState) => FamilyState) => void;
  scenario: Scenario;
  /** Switch to the chat and send this question. */
  onAsk: (text: string) => void;
}


const PREP_PROMPTS = [
  "What am I hoping for, and what is underneath that hope?",
  "How might my words land for them, compared with what I intend?",
  "What do I actually know about their view, and what am I assuming?",
  "What could I ask before I say anything about my own opinion?",
];

const h2 = "font-serif text-2xl text-forest";
const section = "border-t border-line pt-6";

// Secondary page: the detailed, optional notes that personalise the parent's chat.
export default function ParentContextPage({ state, update, scenario, onAsk }: Props) {
  const { parentName: PARENT_NAME, teenName: TEEN_NAME, seed: SEED_FAMILY } = scenario;
  const p = state.parent;
  const setParent = (patch: Partial<FamilyState["parent"]>) => update((s) => ({ ...s, parent: { ...s.parent, ...patch } }));
  const toggleGoal = (g: NurturingGoal) =>
    setParent({ nurturingGoals: p.nurturingGoals.includes(g) ? p.nurturingGoals.filter((x) => x !== g) : [...p.nurturingGoals, g] });
  const sharedFromTeen = state.teen.goals.filter((g) => g.shared);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <div className="flex flex-col gap-8">
        <header>
          <p className="text-sm uppercase tracking-widest text-muted">
            Family context · {PARENT_NAME}&apos;s example profile (fictional)
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-forest sm:text-5xl">Your family context</h1>
          <p className="mt-3 max-w-prose text-lg text-muted">
            Optional notes that personalise your chats. Your private notes are never sent with {TEEN_NAME}&apos;s
            chats, and you only see what {TEEN_NAME} chooses to share. You can switch personalisation off in the chat.
          </p>
        </header>

        <section className={section} aria-labelledby="profile-h">
          <h2 id="profile-h" className={`${h2} mb-4`}>
            1. Your family profile and intentions
          </h2>
          <FieldGroupCard
            title="What you want for your family"
            description="Used only to personalise suggestions. Edit anything, or clear it."
            scope="parent_private"
            headingClass="font-semibold"
            fields={[
              { key: "intentions", label: "Parenting intentions" },
              { key: "values", label: "Values and principles" },
              { key: "hopes", label: "Hopes", help: "Your hopes are yours. Your teen's own aspirations stay their own." },
              { key: "concerns", label: "Concerns" },
              {
                key: "situation",
                label: "What's happening right now (optional)",
                help: "In your own words. Private to you.",
              },
            ]}
            values={{
              intentions: p.intentions,
              values: p.values,
              hopes: p.hopes,
              concerns: p.concerns,
              situation: p.situation ?? "",
            }}
            onSave={(v) =>
              setParent({
                intentions: v.intentions,
                values: v.values,
                hopes: v.hopes,
                concerns: v.concerns,
                situation: v.situation,
              })
            }
            onReset={() =>
              setParent({
                intentions: SEED_FAMILY.parent.intentions,
                values: SEED_FAMILY.parent.values,
                hopes: SEED_FAMILY.parent.hopes,
                concerns: SEED_FAMILY.parent.concerns,
                situation: SEED_FAMILY.parent.situation ?? "",
              })
            }
          />
        </section>

        <section className={section} aria-labelledby="stage-h">
          <h2 id="stage-h" className={`${h2} mb-4`}>
            2. Your child&apos;s stage and what you want to nurture
          </h2>
          <div className="flex flex-col gap-6">
            <StagePicker
              legend="Your child's developmental stage"
              value={p.stage}
              onChange={(stage) => setParent({ stage })}
            />
            <fieldset>
              <legend className="mb-3 text-base font-medium">Skills you want to nurture</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(NURTURING_LABEL) as NurturingGoal[]).map((g) => (
                  <label key={g} className="cursor-pointer">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={p.nurturingGoals.includes(g)}
                      onChange={() => toggleGoal(g)}
                    />
                    <span className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-medium hover:bg-sand peer-checked:border-sage peer-checked:bg-sage peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sage">
                      {NURTURING_LABEL[g]}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                <ScopeBadge scope="parent_private" />
              </p>
            </fieldset>
          </div>
        </section>

        <section className={section} aria-labelledby="world-h">
          <h2 id="world-h" className={`${h2} mb-4`}>
            3. Family worldview (optional)
          </h2>
          <FieldGroupCard
            title="Faith, worldview or cultural values"
            description="Entirely optional and in your own words. CommonGround never guesses or assumes any of this."
            scope="parent_private"
            headingClass="font-semibold"
            fields={[{ key: "worldview", label: "In your words", placeholder: "Leave blank if you prefer" }]}
            values={{ worldview: p.worldview }}
            onSave={(v) => setParent({ worldview: v.worldview })}
            onReset={() => setParent({ worldview: SEED_FAMILY.parent.worldview })}
          />
        </section>

        <section className={section} aria-labelledby="shared-h">
          <h2 id="shared-h" className={`${h2} mb-1`}>
            4. Shared family goals and progress
          </h2>
          <p className="mb-4 text-sm text-muted">
            What you and {TEEN_NAME} have agreed to, plus anything {TEEN_NAME} has chosen to share.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                Agreed goals <ScopeBadge scope="shared" />
              </h3>
              <GoalList
                goals={state.shared.goals}
                onChange={(goals) => update((s) => ({ ...s, shared: { ...s.shared, goals } }))}
                addLabel="Add a shared goal"
              />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                Shared by {TEEN_NAME} <ScopeBadge scope="shared" />
              </h3>
              {sharedFromTeen.length === 0 ? (
                <p className="text-sm text-muted">{TEEN_NAME} hasn&apos;t shared any personal goals.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {sharedFromTeen.map((g) => (
                    <li key={g.id} className="rounded-xl border border-line bg-paper p-3 text-sm">
                      {g.text}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted">
                You see only what {TEEN_NAME} chooses to share. Everything else is private to them.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <FieldGroupCard
              title="Routines and commitments"
              scope="shared"
              headingClass="font-semibold"
              fields={[
                { key: "routines", label: "Shared routines" },
                { key: "commitments", label: "Shared commitments" },
              ]}
              values={{ routines: state.shared.routines, commitments: state.shared.commitments }}
              onSave={(v) => update((s) => ({ ...s, shared: { ...s.shared, routines: v.routines, commitments: v.commitments } }))}
              onReset={() =>
                update((s) => ({
                  ...s,
                  shared: { ...s.shared, routines: SEED_FAMILY.shared.routines, commitments: SEED_FAMILY.shared.commitments },
                }))
              }
            />
          </div>
          <p className="sr-only">{visibleSharedGoals(state).length} shared goals in total</p>
        </section>

        <section className={section} aria-labelledby="prep-h">
          <h2 id="prep-h" className={`${h2} mb-1`}>
            5. Prepare for a conversation
          </h2>
          <p className="mb-4 text-sm text-muted">Take a minute with these before you talk, or ask CommonGround to help.</p>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm">
            {PREP_PROMPTS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onAsk(scenario.parentDemoPrompt)}
            className="min-h-11 rounded-full bg-sage px-5 text-sm font-medium text-white hover:bg-sage-dark"
          >
            {scenario.prepareLabel}
          </button>
        </section>

        <section className={section} aria-labelledby="res-h">
          <h2 id="res-h" className={`${h2} mb-4`}>
            6. Recommended reading
          </h2>
          <ul className="flex flex-col gap-3">
            {RESOURCES.map((r) => (
              <li key={r.url} className="text-sm">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sage underline underline-offset-2"
                >
                  {r.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <span className="text-muted"> · {r.publisher}</span>
                <p className="text-muted">{r.note}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Links go to the original publishers. We have not reviewed them clinically.</p>
        </section>
      </div>

    </div>
  );
}
