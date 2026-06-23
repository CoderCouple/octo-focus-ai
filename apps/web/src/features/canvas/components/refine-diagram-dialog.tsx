/**
 * Refine the existing canvas DSL via a natural-language instruction.
 *
 *   "Add a CDN in front of S3"
 *   "Use Redis instead of Memcached"
 *   "Make the API → DB call async"
 *   "Group the AWS resources"
 *
 * Lives next to the "From code" sheet on the canvas pane header. Only
 * surfaces when there's a current DSL to refine — Claude needs that to
 * do anything useful.
 */
"use client";

import { Loader2, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { refineDiagramApi } from "../api/refine-diagram-api";

interface RefineDiagramDialogProps {
  currentDsl: string;
  onRefined: (nextDsl: string) => void;
}

const QUICK_PROMPTS = [
  "Add a CDN in front of S3",
  "Group the AWS resources",
  "Make the queue async",
  "Show only the auth flow",
  "Use Postgres instead of MySQL",
];

export function RefineDiagramDialog({ currentDsl, onRefined }: RefineDiagramDialogProps) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRefine = async () => {
    const trimmed = instruction.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const result = await refineDiagramApi({
        currentDsl,
        instruction: trimmed,
      });
      onRefined(result.dsl);
      toast.success("Diagram refined");
      setOpen(false);
      setInstruction("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refine failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setInstruction("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" disabled={!currentDsl.trim()}>
          <Wand2 className="size-3.5" />
          Refine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="size-4" />
            Refine diagram
          </DialogTitle>
          <DialogDescription>
            Describe what should change. Claude will edit the current DSL — keeping
            existing nodes and styling where the instruction doesn't change them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Add a CloudFront CDN in front of S3"
            disabled={busy}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && instruction.trim() && !busy) {
                e.preventDefault();
                void handleRefine();
              }
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            <span className="text-muted-foreground mr-1 text-[11px]">Try:</span>
            {QUICK_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                disabled={busy}
                onClick={() => setInstruction(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleRefine} disabled={busy || !instruction.trim()}>
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Refining…
              </>
            ) : (
              <>
                <Wand2 className="size-3.5" />
                Refine
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
