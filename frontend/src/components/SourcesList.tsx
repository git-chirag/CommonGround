import type { Grounding, Source } from "@/lib/types";

interface Props {
  grounding: Grounding;
  sources: Source[];
}

// Shows ONLY what the backend actually retrieved. Wording is deliberately modest:
// retrieved passages are related reading, not proof that every sentence of the answer is supported.
export default function SourcesList({ grounding, sources }: Props) {
  if (grounding === "none" || sources.length === 0) {
    return (
      <p className="mt-2 max-w-[85%] rounded-xl bg-sand px-3 py-2 text-xs text-ink">
        No sourced guidance matched this question, so this answer is general and is not tied to a source.
      </p>
    );
  }
  return (
    <aside aria-label="Sources" className="mt-2 max-w-[85%] rounded-xl border border-line bg-paper px-3 py-2 text-xs">
      <h4 className="font-semibold">Sources retrieved for this question</h4>
      <p className="mt-1 text-muted">
        Related passages found in CommonGround&apos;s small curated library (our own condensed summaries of these pages).
        Labels like [S1] in the answer point here. Check the original page before relying on it.
      </p>
      <p className="mt-1 text-muted">
        This is general guidance. It can&apos;t tell you what a particular person in your family is thinking or feeling.
      </p>
      <ol className="mt-2 flex flex-col gap-2">
        {sources.map((s) => (
          <li key={s.id}>
            <span className="font-medium">
              [S{s.n}] {s.title}
            </span>{" "}
            <span className="text-muted">
              {s.publisher} · {s.published ? `Published ${s.published}` : `Accessed ${s.accessed}`}
            </span>
            {s.cited && <span className="ml-1 rounded bg-sage-soft px-1.5 py-0.5">Referenced in answer</span>}
            <div className="text-muted">Basis: {s.verifiedVia}</div>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-medium text-sage underline underline-offset-2"
            >
              Open original page<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
