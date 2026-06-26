"use client";

import hljs from "highlight.js/lib/common";
import "highlight.js/styles/atom-one-light.css";
import {
  Check,
  Code2,
  Copy,
  Eye,
  Link2,
  Loader2,
  Save,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamGeneratedComponent } from "../api/components-client-api";
import {
  createSavedComponentClientApi,
  updateSavedComponentClientApi,
} from "../api/saved-components-client-api";
import type { ComponentLanguage, SavedComponent } from "../types";
import { IframeArtifact } from "./iframe-artifact";

const EXAMPLE_PROMPTS = [
  "A flight search form with origin, destination, dates, and a results list",
  "A live currency converter with a dropdown of 8 currencies",
  "A pomodoro timer with start / pause / reset and a session counter",
  "A poll widget with 4 options that shows percentages as you vote",
];

function detectLanguage(code: string): ComponentLanguage {
  const head = code
    .replace(/^﻿/, "")
    .trimStart()
    .slice(0, 500);
  return /^(<!doctype\s+html|<html[\s>])/i.test(head) ? "html" : "tsx";
}

function highlightCode(code: string): string {
  if (!code) return "";
  try {
    return hljs.highlight(code, {
      language: detectLanguage(code),
      ignoreIllegals: true,
    }).value;
  } catch {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

function deriveTitle(code: string): string {
  const titleMatch = code.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]?.trim()) return titleMatch[1].trim().slice(0, 200);
  const fnMatch = code.match(/(?:function|const)\s+([A-Z]\w+)/);
  if (fnMatch?.[1]) return fnMatch[1].replace(/([A-Z])/g, " $1").trim();
  return "Untitled component";
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface ComponentStudioProps {
  workspaceId: string;
  /** When set, the studio loads in "edit existing" mode. */
  initial?: SavedComponent;
}

/**
 * Components studio — two-pane layout matching the in-note refine
 * overlay. Live preview on the left, AI chat sidebar on the right.
 * Same `streamGeneratedComponent` SSE pipe powers both initial
 * generation and follow-up refines; the first message in the chat
 * acts as Generate, subsequent ones refine the current code.
 */
export function ComponentStudio({ workspaceId, initial }: ComponentStudioProps) {
  const router = useRouter();
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  const [committed, setCommitted] = useState(initial?.code ?? "");
  const [savedSnapshot, setSavedSnapshot] = useState(initial?.code ?? "");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"preview" | "source">("preview");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, streaming, streamBuffer.length]);

  const highlighted = useMemo(() => highlightCode(committed), [committed]);
  const isDirty = savedId !== null && committed !== savedSnapshot;
  const embedUrl =
    savedId && typeof window !== "undefined"
      ? `${window.location.origin}/c/${savedId}`
      : null;

  const handleSend = async () => {
    const prompt = draft.trim();
    if (!prompt || streaming) return;
    setDraft("");
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setStreamBuffer("");
    setStreaming(true);
    setView("preview");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamGeneratedComponent(
        { prompt, ...(committed ? { currentCode: committed } : {}) },
        {
          onChunk: (delta) => setStreamBuffer((b) => b + delta),
          onDone: (code) => {
            setCommitted(code);
            setStreamBuffer("");
            setStreaming(false);
            setMessages((m) => [
              ...m,
              {
                role: "assistant",
                text: committed
                  ? "Updated. Preview refreshed."
                  : "Generated. Save it to get an embed URL.",
              },
            ]);
          },
          onError: (message) => {
            setMessages((m) => [...m, { role: "assistant", text: `Error: ${message}` }]);
            setStreaming(false);
          },
        },
        ctrl.signal,
      );
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: err instanceof Error ? `Error: ${err.message}` : "Generation failed",
          },
        ]);
      }
      setStreaming(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleCopyCode = async () => {
    if (!committed) return;
    try {
      await navigator.clipboard.writeText(committed);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  const handleCopyUrl = async () => {
    if (!embedUrl) return;
    try {
      await navigator.clipboard.writeText(embedUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1500);
      toast.success("Embed URL copied — paste into any note");
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  const handleSave = async () => {
    if (!committed || saving) return;
    setSaving(true);
    try {
      const language = detectLanguage(committed);
      if (savedId) {
        await updateSavedComponentClientApi(savedId, { code: committed, language });
        setSavedSnapshot(committed);
        toast.success("Component updated");
      } else {
        const created = await createSavedComponentClientApi(workspaceId, {
          title: deriveTitle(committed),
          code: committed,
          language,
        });
        setSavedId(created.id);
        setSavedSnapshot(committed);
        toast.success("Saved — embed URL ready");
        router.replace(`/workspace/components/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const hasCommitted = committed.length > 0;
  const showPreview = view === "preview" && hasCommitted;
  const showSource = view === "source" && hasCommitted;

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-4 shrink-0" />
          <span className="text-sm font-semibold">Components</span>
          {savedId ? (
            <span className="text-muted-foreground hidden font-mono text-[11px] md:inline">
              {savedId}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {embedUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleCopyUrl}
              title={embedUrl}
            >
              {copiedUrl ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
              {copiedUrl ? "Copied" : "Embed URL"}
            </Button>
          ) : null}
          {hasCommitted && !streaming ? (
            <Button
              size="sm"
              variant={savedId ? (isDirty ? "default" : "ghost") : "default"}
              onClick={handleSave}
              disabled={saving || (savedId !== null && !isDirty)}
              className="h-7"
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {savedId ? (isDirty ? "Save changes" : "Saved") : "Save"}
            </Button>
          ) : null}
          {hasCommitted ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setView((v) => (v === "preview" ? "source" : "preview"))}
              title={view === "preview" ? "View source" : "View preview"}
              disabled={streaming}
            >
              {view === "preview" ? (
                <Code2 className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          ) : null}
          {hasCommitted ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleCopyCode}
              title="Copy code"
            >
              {copiedCode ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="bg-muted/20 relative flex-1 overflow-hidden">
          {showPreview ? (
            <IframeArtifact code={committed} className="h-full" />
          ) : showSource ? (
            <pre className="hljs h-full overflow-auto p-4 font-mono text-[0.8rem] leading-relaxed">
              <code
                className={`language-${detectLanguage(committed)}`}
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            </pre>
          ) : (
            <div className="text-muted-foreground grid h-full place-items-center px-6 text-center text-sm">
              {streaming ? (
                <div className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Thinking…
                  {streamBuffer.length > 0 ? (
                    <span className="text-muted-foreground/70 ml-1 text-xs">
                      {streamBuffer.length} chars
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="max-w-md space-y-2">
                  <Sparkles className="text-muted-foreground/60 mx-auto size-7" />
                  <p>Describe a UI surface in the chat on the right and hit Send.</p>
                  <p className="text-muted-foreground/70 text-xs">
                    Save the result to get a permanent embed URL you can paste into any note.
                  </p>
                </div>
              )}
            </div>
          )}
          {streaming && hasCommitted ? (
            <div className="bg-foreground/85 text-background absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs shadow">
              <Loader2 className="size-3 animate-spin" />
              Generating new version…
            </div>
          ) : null}
        </div>

        <aside className="bg-card flex w-[380px] shrink-0 flex-col border-l">
          <div className="text-muted-foreground border-b px-4 py-2 text-xs font-medium uppercase tracking-wider">
            AI assistant
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-auto p-4"
            aria-live="polite"
          >
            {messages.length === 0 && !streaming ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs">
                  Describe what you want to build. Claude emits a complete
                  HTML artifact rendered live on the left.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setDraft(ex)}
                      className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 rounded-full border px-2.5 py-1 text-left text-[11px] leading-tight transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "bg-foreground text-background ml-auto max-w-[90%] rounded-lg px-3 py-2 text-sm"
                    : "border-border bg-background max-w-[95%] rounded-lg border px-3 py-2 text-sm"
                }
              >
                {m.text}
              </div>
            ))}

            {streaming ? (
              <div className="text-muted-foreground inline-flex items-center gap-2 text-xs">
                <Loader2 className="size-3 animate-spin" />
                {streamBuffer.length > 0
                  ? `${streamBuffer.length} chars…`
                  : "Thinking…"}
              </div>
            ) : null}
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
                placeholder={committed ? "Describe a change…" : "What do you want to build?"}
                className="min-h-[60px] resize-none text-sm"
                rows={3}
                disabled={streaming}
              />
              {streaming ? (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={handleStop}
                  className="size-9 shrink-0"
                >
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="size-9 shrink-0"
                >
                  <Send className="size-4" />
                </Button>
              )}
            </div>
            <p className="text-muted-foreground mt-2 text-[10px]">
              Enter to send, Shift+Enter for newline.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
