import { useRef, type ReactNode } from "react";
import type { useChat } from "@/hooks/useChat";
import ChatInput from "../ChatInput";
import Disclaimer from "../Disclaimer";
import ErrorBanner from "../ErrorBanner";
import MessageList from "../MessageList";

export type ChatVariant = "parent" | "teen";

interface Props {
  chat: ReturnType<typeof useChat>;
  variant: ChatVariant;
  /** Shown while the conversation is empty (welcome + conversation starters). */
  emptyState: (send: (q: string) => void) => ReactNode;
  /** Compact context bar shown above the composer. */
  contextBar: ReactNode;
}

// The primary surface: a full-height conversation with the composer anchored at the bottom.
// Colors come from the surrounding data-theme; `variant` only changes shape details.
export default function ChatPanel({ chat, variant, emptyState, contextBar }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, status, errorKind, send, retry, reset } = chat;
  const loading = status === "loading";
  const empty = messages.length === 0;

  return (
    <section id="chat-panel" aria-label="Chat with CommonGround" className="flex min-h-0 flex-1 flex-col">
      {empty && !loading ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6">{emptyState((q) => send(q))}</div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-3xl justify-end px-4 pt-2">
            <button
              type="button"
              onClick={() => {
                reset();
                inputRef.current?.focus();
              }}
              className="min-h-11 rounded-full border border-line bg-paper px-4 text-sm font-medium text-ink hover:bg-sand"
            >
              New conversation
            </button>
          </div>
          <MessageList messages={messages} loading={loading} variant={variant} />
        </div>
      )}

      <div className="shrink-0 border-t border-line bg-cream">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3">
          {status === "error" && errorKind && (
            <ErrorBanner
              kind={errorKind}
              onRetry={() => {
                retry();
                inputRef.current?.focus();
              }}
            />
          )}
          {contextBar}
          <ChatInput onSend={send} loading={loading} inputRef={inputRef} variant={variant} />
          <Disclaimer />
        </div>
      </div>
    </section>
  );
}
