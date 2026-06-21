/**
 * Diagram-as-code editor.
 *
 * UX: a bottom drawer ~30% of the canvas height with a resizable top edge.
 * Visually code-editor-y: monospace, line numbers in a gutter, monochrome
 * theme that matches the rest of the app. Live error list at the bottom
 * shows line + message coming from packages/diagrams' parseDsl.
 */
"use client";

import { parseDsl } from "@octofocus/diagrams";
import { ChevronDown, ChevronUp, Code2, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const PLACEHOLDER = `# Eraser-style: 'A > B' or 'A > B: label'
Client > Server: HTTP
Server > Database: SQL`;

const MIN_HEIGHT = 140;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 240;

interface DslDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (next: string) => void;
}

export function DslDrawer({ open, onOpenChange, value, onChange }: DslDrawerProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Recompute errors as the user types — same parser the canvas uses.
  const errors = useMemo(() => parseDsl(value).errors, [value]);

  // Line numbers track the current value.
  const lineCount = Math.max(value.split("\n").length, 1);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1),
    [lineCount],
  );

  // Resize handle: pointer-drag the top edge of the drawer.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragStartRef.current;
      if (!drag) return;
      const delta = drag.startY - e.clientY;
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, drag.startHeight + delta));
      setHeight(next);
    }
    function onUp() {
      dragStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const startResize = (e: React.PointerEvent) => {
    dragStartRef.current = { startY: e.clientY, startHeight: height };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  if (!open) {
    return (
      <div className="bg-card flex h-9 shrink-0 items-center gap-2 border-t px-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => onOpenChange(true)}
        >
          <Code2 className="size-3.5" />
          Diagram as code
          <ChevronUp className="size-3" />
        </Button>
        {errors.length > 0 ? (
          <span className="text-destructive flex items-center gap-1 text-[11px]">
            <AlertCircle className="size-3" />
            {errors.length} error{errors.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="bg-card flex shrink-0 flex-col border-t"
      style={{ height: `${height}px` }}
    >
      <div
        className="hover:bg-accent/40 group flex h-1.5 cursor-ns-resize items-center justify-center"
        onPointerDown={startResize}
        aria-label="Resize editor"
        role="separator"
      >
        <div className="bg-border group-hover:bg-foreground/40 h-0.5 w-12 rounded-full" />
      </div>
      <header className="flex h-8 shrink-0 items-center gap-2 border-b px-3">
        <Code2 className="size-3.5" />
        <span className="text-xs font-medium">Diagram as code</span>
        <span className="text-muted-foreground text-[10px]">
          live preview · saves on pause
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 gap-1 px-2 text-[11px]"
          onClick={() => onOpenChange(false)}
          aria-label="Collapse editor"
        >
          <ChevronDown className="size-3" />
          Collapse
        </Button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <pre
          aria-hidden
          className="text-muted-foreground/60 select-none border-r bg-background/40 px-2 py-2 text-right font-mono text-xs leading-[1.65]"
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
          className="flex-1 resize-none border-0 bg-transparent px-3 py-2 font-mono text-xs leading-[1.65] shadow-none outline-none placeholder:text-muted-foreground/60 focus:ring-0"
        />
      </div>
      {errors.length > 0 ? (
        <div className="bg-destructive/5 max-h-24 shrink-0 overflow-auto border-t">
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
    </div>
  );
}
