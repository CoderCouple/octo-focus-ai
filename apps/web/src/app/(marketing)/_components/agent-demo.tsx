"use client";

import { Bot, Check, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const PROMPT_PRESETS = [
  "Add a Redis cache between Server and Database",
  "Rename Server to API and add an Auth Service",
  "Add a load balancer in front of Server",
];

const RESPONSE_LINES = [
  "Reviewing your current diagram…",
  "Found 3 nodes: Client, Server, Database.",
  "Proposing a typed patch:",
];

const PATCH_LINES = [
  "+ node:    Redis (cache)",
  "+ edge:    Server > Redis (read)",
  "~ edge:    Server > Database (label: \"on miss\")",
];

type Phase = "idle" | "thinking" | "reviewing" | "applied" | "rejected";

export function AgentDemo() {
  const [prompt, setPrompt] = useState(PROMPT_PRESETS[0]!);
  const [phase, setPhase] = useState<Phase>("idle");
  const [streamed, setStreamed] = useState<string[]>([]);
  const [patch, setPatch] = useState<string[]>([]);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    return () => {
      for (const t of timers.current) clearTimeout(t);
    };
  }, []);

  function clearTimers() {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }

  function run() {
    clearTimers();
    setStreamed([]);
    setPatch([]);
    setPhase("thinking");

    let cursor = 0;
    RESPONSE_LINES.forEach((line, i) => {
      cursor += 480 + i * 220;
      timers.current.push(
        setTimeout(() => {
          setStreamed((prev) => [...prev, line]);
        }, cursor),
      );
    });

    PATCH_LINES.forEach((line, i) => {
      cursor += 320;
      timers.current.push(
        setTimeout(() => {
          setPatch((prev) => [...prev, line]);
        }, cursor),
      );
    });

    timers.current.push(
      setTimeout(() => {
        setPhase("reviewing");
      }, cursor + 200),
    );
  }

  function approve() {
    setPhase("applied");
  }

  function reject() {
    setPhase("rejected");
  }

  function reset() {
    clearTimers();
    setStreamed([]);
    setPatch([]);
    setPhase("idle");
  }

  return (
    <div className="border-border/60 bg-card/40 flex flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur">
      {/* Prompt input */}
      <div className="border-border/60 flex flex-col gap-2 border-b p-4">
        <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Ask OctoFocusAI
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a change…"
            disabled={phase === "thinking"}
            className="text-foreground placeholder:text-muted-foreground/60 border-border/60 bg-background/60 min-w-0 flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
          />
          <Button
            size="sm"
            onClick={run}
            disabled={phase === "thinking" || !prompt.trim()}
            className="gap-2"
          >
            <Sparkles className="size-3.5" />
            {phase === "idle" ? "Propose" : phase === "thinking" ? "Thinking…" : "Re-run"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setPrompt(preset);
              }}
              disabled={phase === "thinking"}
              className="border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
            >
              {preset.length > 38 ? preset.slice(0, 38) + "…" : preset}
            </button>
          ))}
        </div>
      </div>

      {/* Response stream */}
      <div className="flex min-h-[200px] flex-1 flex-col gap-3 p-4">
        {streamed.length === 0 && phase === "idle" && (
          <div className="text-muted-foreground/70 grid flex-1 place-items-center text-center text-xs">
            <div className="flex flex-col items-center gap-2">
              <Bot className="size-5 opacity-60" />
              Propose a change — the agent will draft a patch.
            </div>
          </div>
        )}
        {streamed.map((line, i) => (
          <div key={i} className="text-foreground/80 flex gap-2 text-sm">
            <Bot className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
            <span>{line}</span>
          </div>
        ))}

        {patch.length > 0 && (
          <div className="border-border/60 bg-background/40 mt-2 overflow-hidden rounded-lg border">
            <div className="border-border/60 text-muted-foreground border-b px-3 py-1.5 text-xs font-medium tracking-wider uppercase">
              Proposed patch
            </div>
            <pre className="text-foreground/85 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {patch.join("\n")}
            </pre>
            {phase === "reviewing" && (
              <div className="border-border/60 bg-muted/20 flex justify-end gap-2 border-t p-3">
                <Button size="sm" variant="outline" onClick={reject} className="gap-1.5">
                  <X className="size-3.5" />
                  Reject
                </Button>
                <Button size="sm" onClick={approve} className="gap-1.5">
                  <Check className="size-3.5" />
                  Approve
                </Button>
              </div>
            )}
            {phase === "applied" && (
              <div className="border-border/60 text-foreground/80 flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="text-foreground size-3.5" />
                  Applied · recorded in audit log
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
            {phase === "rejected" && (
              <div className="border-border/60 text-foreground/80 flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <X className="text-muted-foreground size-3.5" />
                  Rejected · nothing changed
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
