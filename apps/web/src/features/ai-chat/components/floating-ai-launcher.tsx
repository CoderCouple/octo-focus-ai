"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { AiChatPanel } from "./ai-chat-panel";

type ResourceKind = "note" | "canvas" | "project";

interface FloatingAiLauncherProps {
  resourceKind: ResourceKind;
  resourceId: string;
  resourceTitle?: string;
}

/**
 * Floating "Ask AI" button pinned to the bottom-right of the viewport.
 * Closed by default; click opens the `AiChatPanel` as a fixed right-
 * dock overlay. Used by the focus note / canvas pages and the project
 * split view so the AI chat doesn't permanently steal screen real
 * estate.
 */
export function FloatingAiLauncher({
  resourceKind,
  resourceId,
  resourceTitle,
}: FloatingAiLauncherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask AI"
          className="bg-foreground text-background hover:opacity-90 fixed bottom-6 right-6 z-40 inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-lg"
        >
          <Sparkles className="size-4" />
          Ask AI
        </button>
      ) : null}
      {open ? (
        <AiChatPanel
          resourceKind={resourceKind}
          resourceId={resourceId}
          resourceTitle={resourceTitle}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
