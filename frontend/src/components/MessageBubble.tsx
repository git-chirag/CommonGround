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
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <span className={isUser ? "sr-only" : `mb-1 ml-1 ${s.name}`}>{isUser ? "You said:" : "CommonGround"}</span>
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
