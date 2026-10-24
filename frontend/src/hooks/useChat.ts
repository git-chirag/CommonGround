import { useCallback, useEffect, useRef, useState } from "react";
import { ChatError, sendChat, type ChatOptions } from "@/lib/api";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES, MAX_TOTAL_CHARS } from "@/lib/limits";
import type { ChatErrorKind, Message } from "@/lib/types";

export type ChatStatus = "idle" | "loading" | "error";

// Reasons a message is refused locally, before any network call.
export type SendProblem = "empty" | "tooLong" | "conversationFull";

/**
 * Conversation state for the current page session.
 *
 *   idle --send--> loading --reply--> idle
 *                     └────error───> error --retry/send--> loading
 *   any --reset--> idle (history cleared; a late reply is ignored)
 *
 * History lives only in memory (no storage). `options` (stage, profile context, sources switch)
 * is request metadata; the latest value is read at send time.
 */
/**
 * Demo mode: given the user's text, return a pre-written example (or null). When set, `send` never calls the network.
 */
export type DemoResponder = (text: string) => string | null;

export const DEMO_NOTICE =
  "Live AI responses are turned off in this public demo, so there is no answer to this question. Suggested questions marked \u201cPre-written example\u201d show a response written in advance.";

export function useChat(options: ChatOptions & { demo?: DemoResponder | null } = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [errorKind, setErrorKind] = useState<ChatErrorKind | null>(null);

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const inFlight = useRef(false); // blocks double submits within the same tick
  const requestId = useRef(0); // lets us ignore replies that arrive after reset

  const run = useCallback(
    async (history: Message[]) => {
      const id = ++requestId.current;
      inFlight.current = true;
      setStatus("loading");
      setErrorKind(null);
      try {
        const { reply, grounding, sources } = await sendChat(history, optionsRef.current);
        if (id !== requestId.current) return; // reset happened meanwhile
        setMessages([...history, { role: "assistant", content: reply, grounding, sources }]);
        setStatus("idle");
      } catch (err) {
        if (id !== requestId.current) return;
        setErrorKind(err instanceof ChatError ? err.kind : "failed");
        setStatus("error");
      } finally {
        if (id === requestId.current) inFlight.current = false;
      }
    },
    [],
  );

  const send = useCallback(
    (raw: string): SendProblem | null => {
      if (inFlight.current) return null; // silently ignore duplicates
      const text = raw.trim();
      if (!text) return "empty";
      if (text.length > MAX_MESSAGE_CHARS) return "tooLong";
      const total = messages.reduce((n, m) => n + m.content.length, 0) + text.length;
      if (messages.length + 1 > MAX_MESSAGES || total > MAX_TOTAL_CHARS) return "conversationFull";

      const history: Message[] = [...messages, { role: "user", content: text }];
      const demo = optionsRef.current.demo;
      if (demo) {
        // Demo mode: answer locally and synchronously. No request, no loading state.
        const example = demo(text);
        setMessages([
          ...history,
          example ? { role: "assistant", content: example, kind: "example" } : { role: "assistant", content: DEMO_NOTICE, kind: "notice" },
        ]);
        return null;
      }
      setMessages(history); // show the user's bubble immediately
      void run(history);
      return null;
    },
    [messages, run],
  );

  // Resend the same history; the user's message is already in it (no duplicate).
  const retry = useCallback(() => {
    if (inFlight.current || messages.length === 0 || optionsRef.current.demo) return;
    void run(messages);
  }, [messages, run]);

  const reset = useCallback(() => {
    requestId.current++;
    inFlight.current = false;
    setMessages([]);
    setStatus("idle");
    setErrorKind(null);
  }, []);

  return { messages, status, errorKind, send, retry, reset };
}
