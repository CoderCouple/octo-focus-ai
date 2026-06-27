"use client";

import { formatDistanceToNow } from "date-fns";
import { Frame, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listSavedFiguresClientApi } from "../api/saved-figures-client-api";
import type { WorkspaceFigureSummary } from "../types";

interface FigurePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  /** Called with the chosen figure's id; the dialog closes itself first. */
  onPick: (figureId: string) => void;
}

/**
 * Workspace figures picker — surfaced from the `/Figure` slash menu
 * in the notes editor. Lists every non-deleted figure in the active
 * workspace so the user can browse + click instead of copy-pasting a
 * URL. Search filters by title.
 */
export function FigurePickerDialog({
  open,
  onOpenChange,
  workspaceId,
  onPick,
}: FigurePickerDialogProps) {
  const [figures, setFigures] = useState<WorkspaceFigureSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setFigures(null);
    setError(null);
    setQuery("");
    listSavedFiguresClientApi(workspaceId)
      .then((rows) => {
        if (!alive) return;
        setFigures(rows);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load figures.");
      });
    return () => {
      alive = false;
    };
  }, [open, workspaceId]);

  const filtered = useMemo(() => {
    if (!figures) return [];
    const q = query.trim().toLowerCase();
    if (!q) return figures;
    return figures.filter((f) => f.title.toLowerCase().includes(q));
  }, [figures, query]);

  function handlePick(id: string) {
    onOpenChange(false);
    onPick(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Frame className="size-4" />
            Insert a figure
          </DialogTitle>
          <DialogDescription>
            Pick a saved canvas figure to embed in this note.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-3.5" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title…"
            className="pl-8"
            autoFocus
          />
        </div>
        <div className="max-h-[320px] overflow-auto rounded border">
          {figures === null && !error ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading figures…
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {figures && figures.length > 0
                ? "No figures match that search."
                : "No saved figures yet. Save one from the canvas to embed it here."}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((fig) => (
                <li key={fig.id}>
                  <button
                    type="button"
                    className="hover:bg-accent flex w-full items-start gap-3 px-3 py-2 text-left"
                    onClick={() => handlePick(fig.id)}
                  >
                    <Frame className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate text-sm font-medium">{fig.title}</div>
                      <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                        <span className="font-mono">{fig.id}</span>
                        <span>·</span>
                        <span>
                          updated {formatDistanceToNow(new Date(fig.updatedAt))} ago
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
