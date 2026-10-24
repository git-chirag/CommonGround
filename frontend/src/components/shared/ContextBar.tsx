import { buildFamilyContext, FIELD_META } from "@/lib/family/context";
import type { Audience, FamilyState } from "@/lib/family/types";
import ScopeBadge from "./ScopeBadge";

interface Props {
  audience: Audience;
  state: FamilyState;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
}

const clip = (s: string) => (s.length > 120 ? `${s.slice(0, 120)}…` : s);

// Compact, expandable view of exactly what buildFamilyContext() will send with the next message.
export default function ContextBar({ audience, state, enabled, onToggle, onEdit }: Props) {
  const ctx = enabled ? buildFamilyContext(state, audience) : null;
  const own = ctx ? Object.entries(ctx.own) : [];
  const shared = ctx ? Object.entries(ctx.shared) : [];
  const entries = [...own, ...shared];
  const other = audience === "parent" ? "teen" : "parent";

  const summary = !enabled
    ? "Profile notes off: only your messages are sent"
    : entries.length === 0
      ? "No profile notes to send"
      : `Personalised with ${own.length} private note${own.length === 1 ? "" : "s"} + ${shared.length} shared`;

  return (
    <section
      aria-label="What the assistant can see"
      className="rounded-2xl border border-line bg-paper px-3 py-1 text-xs text-ink"
    >
      <div className="flex flex-wrap items-center gap-x-3">
        <label className="flex min-h-11 items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="size-5 accent-sage"
          />
          Use my profile notes
        </label>
        <details className="group min-w-0 flex-1">
          <summary className="flex min-h-11 cursor-pointer items-center gap-1 text-muted marker:content-none">
            <span aria-hidden="true" className="transition group-open:rotate-90">
              ▸
            </span>
            {summary} <span className="sr-only">(show what is sent)</span>
          </summary>
          <div className="max-h-56 overflow-y-auto pb-2">
            {entries.length > 0 && (
              <ul className="flex flex-col gap-2">
                {entries.map(([key, value]) => (
                  <li key={key} className="flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{FIELD_META[key]?.label ?? key}</span>
                      {FIELD_META[key] && <ScopeBadge scope={FIELD_META[key].scope} />}
                    </span>
                    <span className="text-muted">{clip(value)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-muted">
              Never sent: the {other}&apos;s private notes, the {other}&apos;s chats, and the teen&apos;s private reflections.
              Sources are general reading, never anyone&apos;s personal data.
            </p>
            <p className="mt-2 rounded-lg bg-sand p-2">
              <strong>Prototype:</strong> both example profiles live in this browser and a demo switch picks the view.
              This controls what is sent to the assistant. It is not secure isolation between real accounts.
            </p>
            <button
              type="button"
              onClick={onEdit}
              className="mt-1 min-h-11 font-medium text-sage underline underline-offset-2"
            >
              Edit {audience === "parent" ? "family context" : "my space"}
            </button>
          </div>
        </details>
      </div>
    </section>
  );
}
