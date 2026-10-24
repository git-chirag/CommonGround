import type { Audience } from "@/lib/family/types";

interface Props {
  audience: Audience;
  onAudience: (a: Audience) => void;
  onReset: () => void;
}

const OPTIONS: { id: Audience; label: string }[] = [
  { id: "parent", label: "Parent view" },
  { id: "teen", label: "Teen view" },
];

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="12" cy="16" r="9" fill="#2f6f6a" />
      <circle cx="20" cy="16" r="9" fill="#e8c27a" fillOpacity="0.85" />
    </svg>
  );
}

// Demo-only controls: the switcher picks which example profile is on screen. It is NOT a login.
export default function DemoBar({ audience, onAudience, onReset }: Props) {
  return (
    <div className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 lg:px-8">
        <div className="flex items-center gap-2 text-ink">
          <Mark />
          <span className="font-semibold">CommonGround</span>
          <span className="hidden rounded-full bg-sand px-2 py-0.5 text-xs text-ink sm:inline">Prototype demo</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Demo view" className="flex rounded-full border border-line p-0.5">
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={audience === o.id}
                onClick={() => onAudience(o.id)}
                className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                  audience === o.id ? "bg-sage text-white" : "text-ink hover:bg-sage-soft"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-full border border-line px-4 text-sm font-medium text-ink hover:bg-sand"
          >
            Reset demo
          </button>
        </div>
      </div>
      <p className="bg-sand px-4 py-1 text-center text-xs text-ink">
        Example profiles with fictional data, stored only in this browser. The view switch is for demos, not a login.
      </p>
    </div>
  );
}
