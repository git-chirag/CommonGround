import type { Message } from "@/lib/types";
import SourcesList from "./SourcesList";

// Content is rendered as plain text (React escapes it); never as HTML.
export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <span className={isUser ? "sr-only" : "mb-1 ml-1 text-xs text-muted"}>
        {isUser ? "You said:" : "CommonGround"}
      </span>
      <p
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 leading-relaxed ${
          isUser ? "rounded-br-md bg-sage text-white" : "rounded-bl-md border border-line bg-paper text-ink"
        }`}
      >
        {message.content}
      </p>
      {!isUser && message.grounding && <SourcesList grounding={message.grounding} sources={message.sources ?? []} />}
    </div>
  );
}
