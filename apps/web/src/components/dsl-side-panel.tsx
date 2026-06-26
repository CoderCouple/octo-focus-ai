/**
 * Persistent side-panel diagram-as-code editor — same textarea +
 * gutter + live error list as `DslDrawer`, but rendered as a left
 * column inside the canvas pane instead of a bottom drawer.
 *
 * Used by `CanvasPane` when the user toggles "Source" in the header.
 * Lives next to the canvas so DSL edits stream into the diagram in
 * real time (the canvas pane debounce-parses on every keystroke).
 */
"use client";

import { parseDsl } from "@octofocus/diagrams";
import { AlertCircle, Code2, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DslLanguage } from "@/features/canvas";

const LANGUAGE_OPTIONS: { value: DslLanguage; label: string }[] = [
  { value: "octo", label: "OctoFocusAI" },
  { value: "mermaid", label: "Mermaid" },
];

const PLACEHOLDER = `# OctoFocusAI DSL — Eraser-style with figure groups
# Try editing this; the canvas updates as you type.
direction right

figure "Frontend" {
  Web [icon: globe]
  Mobile
}

figure "Backend" {
  API [icon: server]
  DB [icon: database]
  Cache [icon: redis]
}

Web > API: HTTPS
Mobile > API
API > DB
API > Cache`;

interface DslSidePanelProps {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
  language: DslLanguage;
  onLanguageChange: (next: DslLanguage) => void;
  /**
   * Width in pixels. Defaults to 380 — wide enough for a comfortable
   * line of DSL without crowding the canvas.
   */
  width?: number;
}

export function DslSidePanel({
  value,
  onChange,
  onClose,
  language,
  onLanguageChange,
  width = 380,
}: DslSidePanelProps) {
  // Errors come from our parser — only meaningful when the OctoFocusAI
  // flavour is active. For Mermaid we skip the parse so the inline
  // error list doesn't flag perfectly valid Mermaid as broken.
  const errors = useMemo(
    () => (language === "octo" ? parseDsl(value).errors : []),
    [value, language],
  );

  const lineCount = Math.max(value.split("\n").length, 1);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1),
    [lineCount],
  );

  return (
    <aside
      className="bg-card flex shrink-0 flex-col border-r"
      style={{ width: `${width}px` }}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b px-2">
        <Code2 className="ml-1 size-3.5" />
        <span className="text-xs font-medium">Source</span>
        <Select value={language} onValueChange={(v) => onLanguageChange(v as DslLanguage)}>
          <SelectTrigger
            size="sm"
            className="h-6 gap-1 border-0 bg-transparent px-1.5 text-[11px] shadow-none hover:bg-accent focus:ring-0 focus-visible:ring-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 gap-1 px-1.5 text-[11px]"
          onClick={onClose}
          aria-label="Close source panel"
          title="Close source panel"
        >
          <X className="size-3" />
        </Button>
      </header>
      {language === "mermaid" ? (
        <div className="bg-muted/40 border-b px-3 py-1.5 text-[10px] text-muted-foreground">
          Mermaid is saved but doesn't render on the canvas yet —
          rendering for this flavour is on the roadmap.
        </div>
      ) : null}
      <div className="flex flex-1 overflow-hidden">
        <pre
          aria-hidden
          className="text-muted-foreground/60 bg-background/40 select-none border-r px-2 py-2 text-right font-mono text-xs leading-[1.65]"
          style={{ minWidth: "2.25rem" }}
        >
          {lineNumbers.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </pre>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder={PLACEHOLDER}
          className="placeholder:text-muted-foreground/60 flex-1 resize-none border-0 bg-transparent px-3 py-2 font-mono text-xs leading-[1.65] shadow-none outline-none focus:ring-0"
        />
      </div>
      {errors.length > 0 ? (
        <div className="bg-destructive/5 max-h-32 shrink-0 overflow-auto border-t">
          {errors.map((err, i) => (
            <div
              key={i}
              className="text-destructive flex items-start gap-2 px-3 py-1 text-[11px]"
            >
              <AlertCircle className="mt-0.5 size-3 shrink-0" />
              <span className="text-muted-foreground tabular-nums">L{err.line}</span>
              <span>{err.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
