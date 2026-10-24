import { useState, type KeyboardEvent, type Ref } from "react";
import type { SendProblem } from "@/hooks/useChat";
import { MAX_MESSAGE_CHARS } from "@/lib/limits";

const PROBLEM_TEXT: Record<SendProblem, string> = {
  empty: "Please type a message first.",
  tooLong: `That message is too long. Please keep it under ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`,
  conversationFull: "This conversation has gotten long. Please start a new conversation to continue.",
};

interface Props {
  onSend: (text: string) => SendProblem | null;
  loading: boolean;
  inputRef: Ref<HTMLTextAreaElement>;
}

export default function ChatInput({ onSend, loading, inputRef }: Props) {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<SendProblem | null>(null);

  const submit = () => {
    if (loading) return;
    const result = onSend(text);
    setProblem(result);
    if (result === null) setText(""); // accepted: clear; refused: keep the text
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter newline; ignore Enter while an IME is composing.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const nearLimit = text.length > MAX_MESSAGE_CHARS * 0.8;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-1"
    >
      <label htmlFor="message" className="sr-only">
        Your message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="message"
          ref={inputRef}
          value={text}
          rows={2}
          onChange={(e) => {
            setText(e.target.value);
            if (problem) setProblem(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="Share what's on your mind…"
          aria-describedby="message-hint"
          aria-invalid={problem !== null}
          className="field-sizing-content max-h-40 min-h-14 flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-3"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-14 rounded-2xl bg-sage px-5 font-medium text-white hover:bg-sage-dark disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </div>
      <div id="message-hint" className="flex justify-between gap-2 px-1 text-xs text-muted">
        <span role={problem ? "alert" : undefined} className={problem ? "text-clay" : undefined}>
          {problem ? PROBLEM_TEXT[problem] : "Enter to send, Shift+Enter for a new line"}
        </span>
        {nearLimit && (
          <span className={text.length > MAX_MESSAGE_CHARS ? "text-clay" : undefined}>
            {text.length.toLocaleString()} / {MAX_MESSAGE_CHARS.toLocaleString()}
          </span>
        )}
      </div>
    </form>
  );
}
