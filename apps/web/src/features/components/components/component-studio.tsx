"use client";

import hljs from "highlight.js/lib/common";
import "highlight.js/styles/atom-one-light.css";
import { Check, Copy, Loader2, RefreshCcw, Sparkles, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamGeneratedComponent } from "../api/components-client-api";

const EXAMPLE_PROMPTS = [
  "A flight search form with origin, destination, dates, and a results list",
  "A live currency converter with a dropdown of 8 currencies",
  "A pomodoro timer with start / pause / reset and a session counter",
  "A poll widget with 4 options that shows percentages as you vote",
];

function highlightTsx(code: string): string {
  if (!code) return "";
  try {
    return hljs.highlight(code, { language: "tsx", ignoreIllegals: true }).value;
  } catch {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

/**
 * Generative UI studio — type a description, stream a fresh React
 * component back from Claude, copy or refine. Inspired by CopilotKit's
 * AG-UI / A2UI flow: the agent emits a self-contained interactive UI
 * surface that the user can drop into any modern React app.
 *
 * No persistence in this iteration. Every prompt produces a fresh
 * component; saving + a sandboxed live preview land next.
 */
export function ComponentStudio() {
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [buffer, setBuffer] = useState("");
  const [committed, setCommitted] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const displayCode = committed || buffer;
  const highlighted = useMemo(() => highlightTsx(displayCode), [displayCode]);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;
    setBuffer("");
    setCommitted("");
    setStreaming(true);
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

  return (
    <section className="flex h-full flex-col gap-6 p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="size-5" />
          Components
        </h1>
        <p className="text-muted-foreground text-sm">
          Describe an interactive UI surface and Claude will emit a self-contained
          React + TypeScript component. Inspired by CopilotKit&apos;s AG-UI / A2UI
          protocols — generative UI you can drop into any modern React app.
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

      <div className="border-border bg-card flex flex-1 flex-col overflow-hidden rounded-lg border">
        <header className="flex h-10 shrink-0 items-center justify-between border-b px-3">
          <div className="text-muted-foreground text-xs font-medium">
            {committed
              ? "Component"
              : streaming
                ? "Streaming…"
                : "Generated component will appear here"}
          </div>
          {displayCode ? (
            <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          ) : null}
        </header>
        <div className="bg-muted/30 relative flex-1 overflow-auto">
          {displayCode ? (
            <pre className="hljs h-full overflow-auto p-4 font-mono text-[0.8rem] leading-relaxed">
              <code
                className="language-tsx"
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
                    A live in-browser preview is the next iteration — for now the
                    studio returns the source so you can copy it into your own
                    React project.
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
