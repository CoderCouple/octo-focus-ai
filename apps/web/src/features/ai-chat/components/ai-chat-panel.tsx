"use client";

import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ResourceKind = "note" | "canvas" | "project";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface AiChatPanelProps {
  resourceKind: ResourceKind;
  resourceId: string;
  resourceTitle?: string;
  /** Required by the launcher — closes the panel. */
  onClose: () => void;
}

const PROMPT_FOR: Record<ResourceKind, string> = {
  note: "Ask anything about this note — summarize, rewrite, extend.",
  canvas: "Ask anything about this canvas — explain diagrams, suggest blocks.",
  project: "Ask anything about this project — link notes and canvas, find references.",
};

/**
 * Placeholder AI assistant panel. Mounted by `FloatingAiLauncher` when
 * the user clicks the Ask-AI button. Backend wiring (Claude stream,
 * per-resource message persistence) is next; for now the panel echoes
 * a templated reply so the layout is reviewable end-to-end.
 */
export function AiChatPanel({
  resourceKind,
  resourceTitle,
  onClose,
}: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setDraft("");
    setPending(true);
    await new Promise((r) => setTimeout(r, 600));
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: "AI chat backend isn't wired yet. The UI is here so you can review the layout — real streaming arrives in the next commit.",
      },
    ]);
    setPending(false);
  };

  return (
    <aside className="bg-card border-border fixed right-0 top-0 z-50 flex h-screen w-96 flex-col border-l shadow-xl">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="text-muted-foreground size-4" />
        <div className="text-sm font-semibold">AI assistant</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI chat"
          className="hover:bg-accent text-muted-foreground ml-auto grid size-7 place-items-center rounded"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="text-muted-foreground grid h-full place-items-center text-center text-xs">
            <div className="space-y-2">
              <Sparkles className="mx-auto size-6 opacity-50" />
              <p className="px-2">{PROMPT_FOR[resourceKind]}</p>
              {resourceTitle ? (
                <p className="text-muted-foreground/70 italic">on &ldquo;{resourceTitle}&rdquo;</p>
              ) : null}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => (
              <li
                key={i}
                className={
                  m.role === "user"
                    ? "bg-foreground text-background ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm"
                    : "border-border bg-background max-w-[85%] rounded-lg border px-3 py-2 text-sm"
                }
              >
                {m.text}
              </li>
            ))}
            {pending ? (
              <li className="text-muted-foreground inline-flex items-center gap-2 text-xs">
                <Loader2 className="size-3 animate-spin" /> thinking…
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Message AI…"
            className="min-h-[40px] resize-none text-sm"
            rows={1}
            disabled={pending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={pending || !draft.trim()}
            className="size-9 shrink-0"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
