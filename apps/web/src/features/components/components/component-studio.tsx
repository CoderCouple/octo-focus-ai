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
  RefreshCcw,
  Save,
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

interface ComponentStudioProps {
  workspaceId: string;
  /** When set, the studio loads in "edit existing" mode. */
  initial?: SavedComponent;
}

/**
 * Generative UI studio — type a description, stream a fresh component
 * back from Claude, render live in a sandboxed iframe, save and get a
 * permanent embed URL (`/c/<id>`).
 *
 * Two modes:
 *   - new: no `initial` — `Save` creates a new row + navigates to the
 *     edit URL.
 *   - edit: `initial` provided — `Save` updates in place.
 */
export function ComponentStudio({ workspaceId, initial }: ComponentStudioProps) {
  const router = useRouter();
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [buffer, setBuffer] = useState("");
  const [committed, setCommitted] = useState(initial?.code ?? "");
  const [savedSnapshot, setSavedSnapshot] = useState(initial?.code ?? "");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const displayCode = committed || buffer;
  const highlighted = useMemo(() => highlightCode(displayCode), [displayCode]);
  const isDirty = savedId !== null && committed !== savedSnapshot;
  const embedUrl =
    savedId && typeof window !== "undefined"
      ? `${window.location.origin}/c/${savedId}`
      : null;

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;
    setBuffer("");
    setStreaming(true);
    setView("code");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamGeneratedComponent(
        { prompt: trimmed, ...(committed ? { currentCode: committed } : {}) },
        {
          onChunk: (delta) => setBuffer((b) => b + delta),
          onDone: (code) => {
            setCommitted(code);
            setBuffer("");
            setStreaming(false);
            setView("preview");
          },
          onError: (message) => {
            toast.error(message);
            setStreaming(false);
          },
        },
        ctrl.signal,
      );
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") {
        toast.error(err instanceof Error ? err.message : "Generation failed");
      }
      setStreaming(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleCopy = async () => {
    if (!displayCode) return;
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — check clipboard permissions.");
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
      toast.error("Couldn't copy — check clipboard permissions.");
    }
  };

  const deriveTitle = (code: string): string => {
    const titleMatch = code.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch?.[1]?.trim()) return titleMatch[1].trim().slice(0, 200);
    const fnMatch = code.match(/(?:function|const)\s+([A-Z]\w+)/);
    if (fnMatch?.[1]) return fnMatch[1].replace(/([A-Z])/g, " $1").trim();
    return "Untitled component";
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
        toast.success("Saved — embed URL ready below");
        // Update the URL bar so a reload lands back on the edit view.
        router.replace(`/workspace/components/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const hasResult = displayCode.length > 0;
  const showPreview = view === "preview" && committed.length > 0 && !streaming;

  return (
    <section className="flex h-full flex-col gap-6 p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="size-5" />
          Components
        </h1>
        <p className="text-muted-foreground text-sm">
          Describe a UI surface and Claude will emit a self-contained HTML artifact.
          Save it to get a permanent embed URL you can paste into any note.
        </p>
      </header>

      <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={committed ? "Describe the change you want…" : "What do you want to build?"}
          className="min-h-[88px] resize-none"
          disabled={streaming}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void handleGenerate();
            }
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                disabled={streaming}
                className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {streaming ? (
              <Button size="sm" variant="destructive" onClick={handleStop}>
                <Square className="size-3.5" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={handleGenerate} disabled={!prompt.trim()}>
                {committed ? (
                  <>
                    <RefreshCcw className="size-3.5" />
                    Refine
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Generate
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {embedUrl ? (
        <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4">
          <div className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
            <Link2 className="size-3.5" />
            Embed URL
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-muted/40 border-border flex-1 truncate rounded border px-2 py-1.5 font-mono text-xs">
              {embedUrl}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopyUrl}>
              {copiedUrl ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiedUrl ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Paste this URL into any note — it auto-embeds the live component.
          </p>
        </div>
      ) : null}

      <div className="border-border bg-card flex flex-1 flex-col overflow-hidden rounded-lg border">
        <header className="flex h-10 shrink-0 items-center justify-between border-b px-3">
          <div className="text-muted-foreground text-xs font-medium">
            {streaming
              ? "Streaming…"
              : committed
                ? showPreview
                  ? "Live preview"
                  : "Source"
                : "Generated component will appear here"}
          </div>
          <div className="flex items-center gap-1">
            {hasResult && committed && !streaming ? (
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
            {hasResult && committed ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setView((v) => (v === "preview" ? "code" : "preview"))}
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
            {hasResult ? (
              <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            ) : null}
          </div>
        </header>
        <div className="bg-muted/30 relative flex-1 overflow-hidden">
          {showPreview ? (
            <IframeArtifact code={committed} className="h-full" />
          ) : displayCode ? (
            <pre className="hljs h-full overflow-auto p-4 font-mono text-[0.8rem] leading-relaxed">
              <code
                className={`language-${detectLanguage(displayCode)}`}
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            </pre>
          ) : (
            <div className="text-muted-foreground grid h-full place-items-center px-6 text-center text-sm">
              {streaming ? (
                <div className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Thinking…
                </div>
              ) : (
                <div className="max-w-md space-y-2">
                  <Sparkles className="text-muted-foreground/60 mx-auto size-6" />
                  <p>Type a prompt above and hit Generate.</p>
                  <p className="text-muted-foreground/70 text-xs">
                    Save and paste the embed URL into any note for a live render.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
