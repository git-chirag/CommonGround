import { Fragment } from "react";

const BOLD = /\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*/g; // markdown-style: no space just inside the markers

/**
 * Renders model text as plain text, except `**bold**` spans, which become <strong>.
 * It builds React elements from string pieces, so no HTML from the model is ever interpreted.
 */
export default function FormattedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(BOLD)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(<strong key={at}>{m[1]}</strong>);
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((p, i) => (typeof p === "string" ? <Fragment key={`t${i}`}>{p}</Fragment> : p))}</>;
}
