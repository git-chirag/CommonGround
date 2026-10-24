import { useRef } from "react";
import type { useChat } from "@/hooks/useChat";
import ChatInput from "../ChatInput";
import Disclaimer from "../Disclaimer";
import ErrorBanner from "../ErrorBanner";
import MessageList from "../MessageList";
import SuggestedQuestions from "../SuggestedQuestions";

interface Props {
  chat: ReturnType<typeof useChat>;
  heading: string;
  intro: string;
  suggestions: string[];
  className?: string;
}

// The same chat UI for both dashboards; colors come from the surrounding data-theme.
export default function ChatPanel({ chat, heading, intro, suggestions, className = "" }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, status, errorKind, send, retry, reset } = chat;
  const loading = status === "loading";
  const empty = messages.length === 0;

  return (
    <section
      id="chat-panel"
      aria-label="Chat with CommonGround"
      className={`flex flex-col gap-3 overflow-hidden rounded-3xl border border-line bg-cream py-4 text-ink ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-4">
        <h2 className="text-lg font-semibold">{heading}</h2>
        {!empty && (
          <button
            type="button"
            onClick={() => {
              reset();
              inputRef.current?.focus();
            }}
            className="min-h-11 rounded-full border border-line bg-paper px-4 text-sm font-medium hover:bg-sand"
          >
            New conversation
          </button>
        )}
      </div>
      <Disclaimer />
      {empty && !loading ? (
        <div className="flex-1 overflow-y-auto px-4">
          <p className="mb-4 text-sm text-muted">{intro}</p>
          <SuggestedQuestions questions={suggestions} onPick={(q) => send(q)} disabled={loading} />
        </div>
      ) : (
        <MessageList messages={messages} loading={loading} />
      )}
      <div className="flex flex-col gap-2 px-4">
        {status === "error" && errorKind && (
          <ErrorBanner
            kind={errorKind}
            onRetry={() => {
              retry();
              inputRef.current?.focus();
            }}
          />
        )}
        <ChatInput onSend={send} loading={loading} inputRef={inputRef} />
      </div>
    </section>
  );
}
