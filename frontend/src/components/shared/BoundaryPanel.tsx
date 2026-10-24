import { buildFamilyContext, FIELD_META } from "@/lib/family/context";
import type { Audience, FamilyState } from "@/lib/family/types";
import ScopeBadge from "./ScopeBadge";

interface Props {
  audience: Audience;
  state: FamilyState;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** Show the field list expanded (default) or collapsed behind a summary. */
  defaultOpen?: boolean;
  className?: string;
}

const clip = (s: string) => (s.length > 90 ? `${s.slice(0, 90)}…` : s);

// Renders exactly what buildFamilyContext() returns, i.e. what would be sent with the next message.
export default function BoundaryPanel({ audience, state, enabled, onToggle, defaultOpen = true, className = "" }: Props) {
  const ctx = enabled ? buildFamilyContext(state, audience) : null;
  const entries = ctx ? [...Object.entries(ctx.own), ...Object.entries(ctx.shared)] : [];
  const other = audience === "parent" ? "teen" : "parent";

  return (
    <section aria-labelledby="boundary-title" className={`rounded-2xl border border-line bg-paper p-4 text-ink ${className}`}>
      <h3 id="boundary-title" className="text-sm font-semibold">
        What the assistant can see in this chat
      </h3>
      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-5 accent-sage"
        />
        Use my profile notes in this chat
      </label>

      <details {...(defaultOpen ? { open: true } : {})} className="mt-1">
        <summary className="min-h-11 cursor-pointer py-2 text-xs font-medium">
          {enabled ? `Sending ${entries.length} profile note${entries.length === 1 ? "" : "s"} (show details)` : "No profile notes are sent"}
        </summary>
      {entries.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2 text-xs">
          {entries.map(([key, value]) => (
            <li key={key} className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{FIELD_META[key]?.label ?? key}</span>
                {FIELD_META[key] && <ScopeBadge scope={FIELD_META[key].scope} />}
              </span>
              <span className="text-muted">{clip(value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">
          {enabled ? "There are no profile notes to send." : "Your messages are still sent, without any profile notes."}
        </p>
      )}

      <p className="mt-3 text-xs text-muted">
        Never sent: the {other}&apos;s private notes. The teen&apos;s private reflections are never sent from either view.
      </p>
      </details>

      <p className="mt-2 rounded-lg bg-sand p-2 text-xs text-ink">
        <strong>Prototype:</strong> both example profiles are stored in this browser and a demo switch picks the view.
        This controls what is sent to the assistant. It is not secure isolation between real accounts.
      </p>
    </section>
  );
}
