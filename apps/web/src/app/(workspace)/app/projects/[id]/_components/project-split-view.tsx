"use client";

import type { Canvas, Page, Project } from "@octofocus/shared";
import { Columns2, FileText, LayoutGrid, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CanvasPane } from "@/features/canvas";
import { NotesPane } from "@/features/notes";
import {
  addCanvasToProjectAction,
  addNoteToProjectAction,
} from "@/features/projects";
import { SharePopover } from "@/features/sharing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Mode = "notes" | "both" | "canvas";

interface ProjectSplitViewProps {
  project: Project;
  page: Page | null;
  canvas: Canvas | null;
  initialDsl: string;
  workspaceSlug: string;
}

export function ProjectSplitView({
  project,
  page,
  canvas,
  initialDsl,
  workspaceSlug,
}: ProjectSplitViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Initial mode follows what the project actually has. A project with
  // only a canvas can't show notes; a project with both defaults to
  // the side-by-side view.
  const initialMode: Mode = page && canvas ? "both" : page ? "notes" : "canvas";
  const [mode, setMode] = useState<Mode>(initialMode);

  const hasBoth = Boolean(page && canvas);
  const showNotes = hasBoth ? mode === "notes" || mode === "both" : Boolean(page);
  const showCanvas = hasBoth ? mode === "canvas" || mode === "both" : Boolean(canvas);

  const handleAddNote = () => {
    startTransition(async () => {
      const result = await addNoteToProjectAction(project.id, project.name);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Note added");
      router.refresh();
    });
  };

  const handleAddCanvas = () => {
    startTransition(async () => {
      const result = await addCanvasToProjectAction(project.id, project.name);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Canvas added");
      router.refresh();
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="bg-card flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="truncate text-sm font-semibold">{project.name}</div>
          {!page ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNote}
              disabled={pending}
              className="h-7"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add note
            </Button>
          ) : null}
          {!canvas ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCanvas}
              disabled={pending}
              className="h-7"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add canvas
            </Button>
          ) : null}
        </div>

        {hasBoth ? (
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as Mode)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="notes" aria-label="Notes only">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </ToggleGroupItem>
            <ToggleGroupItem value="both" aria-label="Notes and canvas">
              <Columns2 className="h-3.5 w-3.5" />
              Both
            </ToggleGroupItem>
            <ToggleGroupItem value="canvas" aria-label="Canvas only">
              <LayoutGrid className="h-3.5 w-3.5" />
              Canvas
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}

        <div className="flex w-32 items-center justify-end">
          <SharePopover
            resourceKind="project"
            resourceId={project.id}
            resourceTitle={project.name}
            initialVisibility={project.visibility}
            initialPublicSlug={project.publicSlug}
            workspaceSlug={workspaceSlug}
          />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {/*
         * Stable keys keep tldraw + BlockNote mounted across mode toggles.
         * Without them, React reconciles by sibling index — when one pane
         * disappears the other's index shifts and React unmounts/remounts it.
         */}
        {showNotes && page ? (
          <div key="notes" className={showCanvas && canvas ? "w-1/2 border-r" : "flex-1"}>
            <NotesPane
              pageId={page.id}
              initialContent={page.document}
              initialSettings={page.settings ?? {}}
              noteTitle={page.title}
              initialVisibility={page.visibility}
              initialPublicSlug={page.publicSlug}
              workspaceSlug={workspaceSlug}
            />
          </div>
        ) : null}
        {showCanvas && canvas ? (
          <div key="canvas" className={showNotes && page ? "w-1/2" : "flex-1"}>
            <CanvasPane
              canvasId={canvas.id}
              initialDocument={canvas.document}
              initialDsl={initialDsl}
              canvasTitle={canvas.title}
              initialVisibility={canvas.visibility}
              initialPublicSlug={canvas.publicSlug}
              workspaceSlug={workspaceSlug}
            />
          </div>
        ) : null}
        {!page && !canvas ? <EmptyProject onAddNote={handleAddNote} onAddCanvas={handleAddCanvas} pending={pending} /> : null}
      </div>
    </div>
  );
}

function EmptyProject({
  onAddNote,
  onAddCanvas,
  pending,
}: {
  onAddNote: () => void;
  onAddCanvas: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="grid w-full max-w-md place-items-center gap-4 p-8 text-center">
        <div className="bg-secondary text-secondary-foreground grid h-10 w-10 place-items-center rounded-md">
          <FileText className="h-5 w-5" />
        </div>
        <div className="grid gap-1">
          <div className="text-sm font-semibold">This project is empty</div>
          <div className="text-muted-foreground text-xs">
            Add a note, a canvas, or both. You can always add the other one later.
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAddNote} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Add note
          </Button>
          <Button onClick={onAddCanvas} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutGrid className="h-4 w-4" />}
            Add canvas
          </Button>
        </div>
      </Card>
    </div>
  );
}
