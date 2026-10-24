"use client";

import { useState } from "react";
import { useChat } from "@/hooks/useChat";
import { buildFamilyContext } from "@/lib/family/context";
import { useFamily } from "@/lib/family/store";
import type { Audience } from "@/lib/family/types";
import DemoBar from "./DemoBar";
import ParentDashboard from "./parent/ParentDashboard";
import TeenDashboard from "./teen/TeenDashboard";

// Composition root. Each audience has its OWN chat history and its own request context, so nothing
// from one conversation or profile can end up in the other's request.
export default function AppShell() {
  const { state, update, reset } = useFamily();
  const [audience, setAudience] = useState<Audience>("parent");
  const [dark, setDark] = useState(false);
  const [ctxEnabled, setCtxEnabled] = useState<Record<Audience, boolean>>({ parent: true, teen: true });

  const parentChat = useChat({
    stage: state.parent.stage,
    familyContext: ctxEnabled.parent ? buildFamilyContext(state, "parent") : null,
    retrieveSources: true,
  });
  const teenChat = useChat({
    familyContext: ctxEnabled.teen ? buildFamilyContext(state, "teen") : null,
    retrieveSources: true,
  });

  const chat = audience === "parent" ? parentChat : teenChat;
  const ask = (text: string) => {
    chat.send(text);
    document.getElementById("chat-panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };
  const resetDemo = () => {
    reset();
    parentChat.reset();
    teenChat.reset();
    setCtxEnabled({ parent: true, teen: true });
  };
  const toggle = (a: Audience) => (v: boolean) => setCtxEnabled((c) => ({ ...c, [a]: v }));

  const theme = audience === "parent" ? "parent" : dark ? "teen-dark" : "teen";

  return (
    <div data-theme={theme} className="min-h-dvh bg-cream text-ink">
      <DemoBar audience={audience} onAudience={setAudience} onReset={resetDemo} />
      <button
        type="button"
        onClick={() => document.getElementById("chat-panel")?.scrollIntoView?.({ behavior: "smooth", block: "start" })}
        className="fixed bottom-4 right-4 z-20 min-h-12 rounded-full bg-sage px-5 text-sm font-semibold text-white shadow-lg hover:bg-sage-dark lg:hidden"
      >
        Chat
      </button>
      {audience === "parent" ? (
        <ParentDashboard
          state={state}
          update={update}
          chat={parentChat}
          ctxEnabled={ctxEnabled.parent}
          onToggleCtx={toggle("parent")}
          onAsk={ask}
        />
      ) : (
        <TeenDashboard
          state={state}
          update={update}
          chat={teenChat}
          ctxEnabled={ctxEnabled.teen}
          onToggleCtx={toggle("teen")}
          onAsk={ask}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
        />
      )}
    </div>
  );
}
