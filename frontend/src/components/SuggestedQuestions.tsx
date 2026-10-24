interface Props {
  questions: string[];
  onPick: (question: string) => void;
  disabled: boolean;
  title?: string;
}

export default function SuggestedQuestions({
  questions,
  onPick,
  disabled,
  title = "Not sure where to start? Try one of these",
}: Props) {
  return (
    <section aria-labelledby="suggestions-title">
      <h3 id="suggestions-title" className="mb-3 text-sm font-medium">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <li key={q}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(q)}
              className="min-h-11 w-full rounded-2xl border border-line bg-paper px-4 py-2 text-left text-sm hover:bg-sage-soft disabled:opacity-60"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
