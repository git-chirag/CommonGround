import type { Scope } from "@/lib/family/types";

const META: Record<Scope, { label: string; dot: string }> = {
  parent_private: { label: "Private to parent", dot: "bg-clay" },
  teen_private: { label: "Private to teen", dot: "bg-clay" },
  shared: { label: "Shared with family", dot: "bg-sage" },
};

// Every piece of profile data carries a visible scope. Text + dot, so color is never the only cue.
export default function ScopeBadge({ scope }: { scope: Scope }) {
  const m = META[scope];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-0.5 text-xs font-medium text-ink">
      <span aria-hidden="true" className={`size-2 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
