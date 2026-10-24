import { useId, useState } from "react";
import type { Scope } from "@/lib/family/types";
import ScopeBadge from "./ScopeBadge";

export interface FieldDef {
  key: string;
  label: string;
  help?: string;
  placeholder?: string;
}

interface Props {
  title: string;
  description?: string;
  scope: Scope;
  fields: FieldDef[];
  values: Record<string, string>;
  onSave: (values: Record<string, string>) => void;
  onReset: () => void;
  className?: string; // card chrome, so each dashboard can style it its own way
  headingClass?: string;
}

// Editing happens on a draft; "Save" commits it, "Reset to example" restores the seeded text.
function Inner({ title, description, scope, fields, values, onSave, onReset, className = "", headingClass = "" }: Props) {
  const [draft, setDraft] = useState(values);
  const [saved, setSaved] = useState(false);
  const uid = useId();
  const dirty = fields.some((f) => (draft[f.key] ?? "") !== (values[f.key] ?? ""));

  return (
    <section className={`flex flex-col gap-4 ${className}`} aria-labelledby={`${uid}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={`${uid}-title`} className={headingClass}>
          {title}
        </h3>
        <ScopeBadge scope={scope} />
      </div>
      {description && <p className="-mt-2 text-sm text-muted">{description}</p>}
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
          setSaved(true);
        }}
      >
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label htmlFor={`${uid}-${f.key}`} className="text-sm font-medium">
              {f.label}
            </label>
            <textarea
              id={`${uid}-${f.key}`}
              rows={2}
              maxLength={800}
              value={draft[f.key] ?? ""}
              placeholder={f.placeholder}
              aria-describedby={f.help ? `${uid}-${f.key}-help` : undefined}
              onChange={(e) => {
                setDraft({ ...draft, [f.key]: e.target.value });
                setSaved(false);
              }}
              className="field-sizing-content min-h-14 resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
            />
            {f.help && (
              <span id={`${uid}-${f.key}-help`} className="text-xs text-muted">
                {f.help}
              </span>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!dirty}
            className="min-h-11 rounded-full bg-sage px-5 text-sm font-medium text-white hover:bg-sage-dark disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-full border border-line bg-paper px-4 text-sm font-medium text-ink hover:bg-sand"
          >
            Reset to example
          </button>
          <span role="status" className="text-xs text-muted">
            {saved ? "Saved on this device" : dirty ? "Unsaved changes" : ""}
          </span>
        </div>
      </form>
    </section>
  );
}

// Remount when the saved values change (e.g. after a reset) so the draft starts fresh.
export default function FieldGroupCard(props: Props) {
  return <Inner key={JSON.stringify(props.values)} {...props} />;
}
