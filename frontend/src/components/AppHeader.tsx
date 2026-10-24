import { PARENT_NAME, TEEN_NAME } from "@/lib/family/seed";
import type { Audience } from "@/lib/family/types";

export type Section = "chat" | "context";

interface Props {
  audience: Audience;
  onAudience: (a: Audience) => void;
  section: Section;
  onSection: (s: Section) => void;
  onReset: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

const VIEWS: { id: Audience; label: string }[] = [
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

const pill = (active: boolean) =>
  `min-h-11 rounded-full px-3 text-sm font-medium sm:px-4 ${active ? "bg-sage text-white" : "text-ink hover:bg-sage-soft"}`;

// Compact header: brand, who is "signed in" for the demo, Chat / context navigation, view switch and reset.
export default function AppHeader({ audience, onAudience, section, onSection, onReset, dark, onToggleDark }: Props) {
  const name = audience === "parent" ? PARENT_NAME : TEEN_NAME;
  const contextLabel = audience === "parent" ? "Family context" : "My space";

  return (
    <header className="shrink-0 border-b border-line bg-paper text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 lg:px-6">
        <div className="flex items-center gap-2">
          <Mark />
          <span className="font-semibold">CommonGround</span>
          <span className="rounded-full bg-sand px-2 py-0.5 text-xs">
            Demo<span className="hidden sm:inline"> · {audience === "parent" ? "Parent" : "Teen"}: {name} (fictional)</span>
          </span>
        </div>

        <nav aria-label="Sections" className="order-3 flex rounded-full border border-line p-0.5 md:order-none">
          <button
            type="button"
            aria-current={section === "chat" ? "page" : undefined}
            onClick={() => onSection("chat")}
            className={pill(section === "chat")}
          >
            Chat
          </button>
          <button
            type="button"
            aria-current={section === "context" ? "page" : undefined}
            onClick={() => onSection("context")}
            className={pill(section === "context")}
          >
            {contextLabel}
          </button>
        </nav>

        <div className="order-4 ml-auto flex items-center gap-1.5 sm:gap-2 md:order-none">
          {audience === "teen" && (
            <button
              type="button"
              onClick={onToggleDark}
              aria-pressed={dark}
              aria-label="Dark theme"
              className="min-h-11 rounded-full border border-line px-3 text-sm font-medium hover:bg-sage-soft"
            >
              <span className="sm:hidden">{dark ? "Dark" : "Dark"}</span>
              <span className="hidden sm:inline">{dark ? "Dark: on" : "Dark: off"}</span>
            </button>
          )}
          <div role="group" aria-label="Demo view" className="flex rounded-full border border-line p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={audience === v.id}
                aria-label={v.label}
                onClick={() => onAudience(v.id)}
                className={pill(audience === v.id)}
              >
                {v.label.split(" ")[0]}
                <span className="hidden sm:inline"> view</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset demo"
            className="min-h-11 rounded-full border border-line px-3 text-sm font-medium hover:bg-sand sm:px-4"
          >
            Reset<span className="hidden sm:inline"> demo</span>
          </button>
        </div>
      </div>
      <p className="bg-sand px-4 py-1 text-center text-[11px] text-ink sm:text-xs">
        Prototype with fictional example profiles stored in this browser. The view switch is for demos, not a login.
      </p>
    </header>
  );
}
