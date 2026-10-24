import type { Message } from "@/lib/types";
import FormattedText from "./FormattedText";
import SourcesList from "./SourcesList";

const STYLE = {
  parent: {
    user: "rounded-2xl rounded-br-md bg-sage text-white",
    assistant: "rounded-2xl rounded-bl-md border border-line bg-paper text-ink",
    name: "font-serif text-sm text-muted",
  },
  teen: {
    user: "rounded-3xl rounded-br-lg border-2 border-ink bg-sage font-medium text-white",
    assistant: "rounded-3xl rounded-bl-lg border-2 border-ink bg-paper text-ink shadow-[4px_4px_0_0_var(--color-ink)]",
    name: "text-xs font-black uppercase tracking-wider text-muted",
  },
};

// Content is rendered as plain text (React escapes it); never as HTML.
export default function MessageBubble({ message, variant = "parent" }: { message: Message; variant?: "parent" | "teen" }) {
  const isUser = message.role === "user";
  const s = STYLE[variant];
  if (!isUser && message.kind === "notice") {
    return (
      <div role="note" className="flex flex-col items-start">
        <span className={`mb-1 ml-1 ${s.name}`}>Demo notice</span>
        <p className="max-w-[88%] rounded-2xl border border-dashed border-line bg-sand px-4 py-3 text-sm text-ink sm:max-w-[80%]">
          {message.content}
        </p>
      </div>
    );
  }
  const example = !isUser && message.kind === "example";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <span className={isUser ? "sr-only" : `mb-1 ml-1 ${s.name}`}>
        {isUser ? "You said:" : example ? "Pre-written example · not a live AI response" : "CommonGround"}
      </span>
      <p
        className={`max-w-[88%] whitespace-pre-wrap break-words px-4 py-3 leading-relaxed sm:max-w-[80%] ${
          isUser ? s.user : s.assistant
        }`}
      >
        {isUser ? message.content : <FormattedText text={message.content} />}
      </p>
      {!isUser && message.grounding && <SourcesList grounding={message.grounding} sources={message.sources ?? []} />}
    </div>
  );
}
