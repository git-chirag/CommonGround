import type { ChatErrorKind } from "@/lib/types";

// Client-owned copy. We never show server text, URLs or codes.
const COPY: Record<ChatErrorKind, string> = {
  unavailable: "CommonGround's assistant isn't available right now. Please try again in a bit.",
  timeout: "That took too long. Please try again.",
  failed: "I couldn't put a response together. Please try again.",
  invalid: "Please check your message and try again.",
  network: "Can't reach CommonGround right now. Check your connection and try again.",
  disabled: "Live AI responses are turned off in this demo.",
};

interface Props {
  kind: ChatErrorKind;
  onRetry: () => void;
}

export default function ErrorBanner({ kind, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-clay-soft px-4 py-3 text-sm text-clay"
    >
      <span>{COPY[kind]}</span>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-full bg-clay px-4 font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
