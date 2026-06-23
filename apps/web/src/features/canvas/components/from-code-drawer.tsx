/**
 * "From code" drawer for the canvas pane.
 *
 * Paste a code snippet (docker-compose, terraform, package.json, OpenAPI,
 * SQL, Prisma/Drizzle schema, or raw TS/Py/Go) → click Generate → Claude
 * returns OctoFocusAI DSL → we write it into the canvas' DSL drawer state
 * and the existing dsl-to-tldraw sync renders the diagram.
 *
 * No persistence here. Input code is ephemeral; only the resulting DSL
 * gets saved (debounced by the existing canvas autosave).
 */
"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { codeToDiagramApi, type CodeToDiagramHint } from "../api/code-to-diagram-api";
import { CODE_EXAMPLES } from "../lib/code-examples";

interface FromCodeDrawerProps {
  /** the current DSL — passed so Claude can refine it instead of starting over */
  currentDsl: string;
  /** called with the new DSL when the user clicks Generate */
  onGenerated: (nextDsl: string) => void;
}

const HINT_OPTIONS: Array<{ value: CodeToDiagramHint; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  { value: "architecture", label: "Architecture" },
  { value: "sequence", label: "Sequence" },
  { value: "er", label: "Entity-relationship" },
  { value: "flowchart", label: "Flowchart" },
];

const PLACEHOLDER = `# Paste any of:
#   docker-compose.yml
#   terraform plan / .tf files
#   package.json / Cargo.toml / requirements.txt
#   OpenAPI / Swagger / GraphQL schema
#   SQL DDL / Prisma / Drizzle schema
#   raw TypeScript / Python / Go

services:
  web:
    image: nginx
    ports: ["80:80"]
  api:
    image: node:20
    depends_on: [postgres]
  postgres:
    image: postgres:16`;

export function FromCodeDrawer({ currentDsl, onGenerated }: FromCodeDrawerProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [hint, setHint] = useState<CodeToDiagramHint>("auto");
  const [refine, setRefine] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const result = await codeToDiagramApi({
        code: code.trim(),
        hint,
        ...(refine && currentDsl ? { currentDsl } : {}),
      });
      onGenerated(result.dsl);
      toast.success(`Generated ${result.detectedKind} diagram`);
      setOpen(false);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const canRefine = currentDsl.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Sparkles className="size-3.5" />
          From code
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-4 p-0 sm:max-w-xl">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            From code
          </SheetTitle>
          <SheetDescription>
            Paste source code or config. Claude reads it and emits diagram DSL — the
            canvas re-renders from the result.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden px-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground mr-1 text-[11px]">Try with:</span>
            {CODE_EXAMPLES.map((ex) => (
              <Button
                key={ex.id}
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={busy}
                onClick={() => {
                  setCode(ex.code);
                  setHint(ex.hint);
                }}
                title={ex.description}
              >
                {ex.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Diagram type</span>
            <Select value={hint} onValueChange={(v) => setHint(v as CodeToDiagramHint)}>
              <SelectTrigger className="h-8 w-44 text-xs" disabled={busy}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HINT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canRefine ? (
              <label className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={refine}
                  onChange={(e) => setRefine(e.target.checked)}
                  disabled={busy}
                  className="size-3"
                />
                Refine current DSL
              </label>
            ) : null}
          </div>

          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            disabled={busy}
            className="flex-1 resize-none font-mono text-xs leading-[1.65]"
          />
        </div>

        <SheetFooter className="border-t bg-card px-6 py-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="mr-auto"
          >
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={busy || !code.trim()}>
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Generate diagram
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
