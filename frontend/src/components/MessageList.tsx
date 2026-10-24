import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import ThinkingIndicator from "./ThinkingIndicator";

interface Props {
  messages: Message[];
  loading: boolean;
}

const NEAR_BOTTOM_PX = 80;

export default function MessageList({ messages, loading }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  const onScroll = () => {
    const el = scroller.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  // Follow new content only if the reader is already at the bottom (or just sent
  // a message). If they scrolled up to re-read, leave them where they are.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const justSent = messages[messages.length - 1]?.role === "user";
    if (nearBottom.current || justSent) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
    >
      <div className="flex flex-col gap-4">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {loading && <ThinkingIndicator />}
      </div>
    </div>
  );
}
