import { useId, useState } from "react";
import { STATUS_LABEL } from "@/lib/family/context";
import type { Goal, GoalStatus } from "@/lib/family/types";

const NEXT: Record<GoalStatus, GoalStatus> = { todo: "doing", doing: "done", done: "todo" };

interface Props {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
  /** Teen goals: show a "share with family" switch per goal. */
  showShare?: boolean;
  addLabel: string;
}

const newId = () => `g-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default function GoalList({ goals, onChange, showShare = false, addLabel }: Props) {
  const [text, setText] = useState("");
  const uid = useId();

  const patch = (id: string, change: Partial<Goal>) =>
    onChange(goals.map((g) => (g.id === id ? { ...g, ...change } : g)));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {goals.length === 0 && <li className="text-sm text-muted">No goals yet.</li>}
        {goals.map((g) => (
          <li key={g.id} className="flex flex-col gap-2 rounded-xl border border-line bg-paper p-3 text-ink">
            <span className="text-sm">{g.text}</span>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => patch(g.id, { status: NEXT[g.status] })}
                aria-label={`${g.text}: ${STATUS_LABEL[g.status]}. Change status`}
                className="min-h-11 rounded-full border border-line px-3 font-medium hover:bg-sage-soft"
              >
                {STATUS_LABEL[g.status]}
              </button>
              {showShare && (
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={g.shared}
                    onChange={(e) => patch(g.id, { shared: e.target.checked })}
                    className="size-5 accent-sage"
                  />
                  <span>Share with family</span>
                </label>
              )}
              <button
                type="button"
                onClick={() => onChange(goals.filter((x) => x.id !== g.id))}
                aria-label={`Remove goal: ${g.text}`}
                className="ml-auto min-h-11 px-2 text-muted underline underline-offset-2 hover:text-ink"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          onChange([...goals, { id: newId(), text: t.slice(0, 200), status: "todo", shared: false }]);
          setText("");
        }}
      >
        <label htmlFor={`${uid}-new`} className="sr-only">
          {addLabel}
        </label>
        <input
          id={`${uid}-new`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={addLabel}
          maxLength={200}
          className="min-h-11 flex-1 rounded-xl border border-line bg-paper px-3 text-sm text-ink"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-sage px-4 text-sm font-medium text-white hover:bg-sage-dark"
        >
          Add
        </button>
      </form>
    </div>
  );
}
