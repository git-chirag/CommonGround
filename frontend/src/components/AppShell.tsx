"use client";

import { useState } from "react";
import { useChat } from "@/hooks/useChat";
import { buildFamilyContext } from "@/lib/family/context";
import { useFamily } from "@/lib/family/store";
import type { Audience } from "@/lib/family/types";
import AppHeader, { type Section } from "./AppHeader";
import ParentContextPage from "./parent/ParentContextPage";
import ParentWelcome from "./parent/ParentWelcome";
import ChatPanel from "./shared/ChatPanel";
import ContextBar from "./shared/ContextBar";
import TeenSpace from "./teen/TeenSpace";
import TeenWelcome from "./teen/TeenWelcome";

/**
 * Composition root. Chat is the primary section; profile editors are secondary.
 *
 * Privacy: each audience has its OWN useChat (its own history) and its own context built by an
 * audience-scoped builder. A request only ever contains the active audience's chat history,
 * that audience's private notes (if enabled) and the shared projection.
 */
export default function AppShell() {
  const { state, update, reset } = useFamily();
  const [audience, setAudience] = useState<Audience>("parent");
  const [section, setSection] = useState<Section>("chat");
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

  const switchAudience = (a: Audience) => {
    setAudience(a);
    setSection("chat"); // each view opens on its own conversation
  };
  const ask = (text: string) => {
    setSection("chat");
    chat.send(text);
  };
  const resetDemo = () => {
    reset();
    parentChat.reset();
    teenChat.reset();
    setCtxEnabled({ parent: true, teen: true });
    setSection("chat");
  };

  const theme = audience === "parent" ? "parent" : dark ? "teen-dark" : "teen";
  const contextBar = (
    <ContextBar
      audience={audience}
      state={state}
      enabled={ctxEnabled[audience]}
      onToggle={(v) => setCtxEnabled((c) => ({ ...c, [audience]: v }))}
      onEdit={() => setSection("context")}
    />
  );

  return (
    <div data-theme={theme} className="flex h-dvh flex-col bg-cream text-ink">
      <AppHeader
        audience={audience}
        onAudience={switchAudience}
        section={section}
        onSection={setSection}
        onReset={resetDemo}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        {section === "chat" ? (
          <ChatPanel
            // key: a separate component instance per audience, so no UI state is shared either
            key={audience}
            chat={chat}
            variant={audience}
            contextBar={contextBar}
            emptyState={(send) =>
              audience === "parent" ? (
                <ParentWelcome stage={state.parent.stage} onPick={send} />
              ) : (
                <TeenWelcome onPick={send} />
              )
            }
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {audience === "parent" ? (
              <ParentContextPage state={state} update={update} onAsk={ask} />
            ) : (
              <TeenSpace state={state} update={update} onAsk={ask} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
