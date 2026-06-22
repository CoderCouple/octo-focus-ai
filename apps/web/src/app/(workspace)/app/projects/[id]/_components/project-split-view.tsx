"use client";

import type { Canvas, Page, Project } from "@octofocus/shared";
import { FileText, LayoutGrid, Columns2 } from "lucide-react";
import { useState } from "react";
import { CanvasPane } from "@/features/canvas";
import { NotesPane } from "@/components/notes-pane";
import { SharePopover } from "@/features/sharing";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Mode = "notes" | "both" | "canvas";

interface ProjectSplitViewProps {
  project: Project;
  page: Page;
  canvas: Canvas;
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
  const [mode, setMode] = useState<Mode>("both");

  const showNotes = mode === "notes" || mode === "both";
  const showCanvas = mode === "canvas" || mode === "both";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="bg-card flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="text-sm font-semibold">{project.name}</div>
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
        {showNotes && (
          <div key="notes" className={showCanvas ? "w-1/2 border-r" : "flex-1"}>
            <NotesPane
              pageId={page.id}
              initialContent={page.document}
              initialSettings={page.settings ?? {}}
            />
          </div>
        )}
        {showCanvas && (
          <div key="canvas" className={showNotes ? "w-1/2" : "flex-1"}>
            <CanvasPane
              canvasId={canvas.id}
              initialDocument={canvas.document}
              initialDsl={initialDsl}
            />
          </div>
        )}
      </div>
    </div>
  );
}
