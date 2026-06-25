"use client";

import type { Canvas, Page, Project } from "@octofocus/shared";
import { Columns2, FileText, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AiChatPanel } from "@/features/ai-chat";
import { CanvasPane } from "@/features/canvas";
import { NotesPane } from "@/features/notes";
import { renameProjectAction } from "@/features/projects";
import { SharePopover } from "@/features/sharing";
import { EditableTitle } from "@/components/editable-title";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Mode = "notes" | "both" | "canvas";

interface ProjectSplitViewProps {
  project: Project;
  page: Page | null;
  canvas: Canvas | null;
  initialDsl: string;
  workspaceSlug: string;
  /**
   * Optional initial focus mode driven by `?mode=...` on the URL. The
   * notes/canvas list-view "New …" buttons set this so the user lands
   * on the pane that matches the button they clicked.
   */
  initialMode?: Mode;
}

export function ProjectSplitView({
  project,
  page,
  canvas,
  initialDsl,
  workspaceSlug,
  initialMode,
}: ProjectSplitViewProps) {
  // Resolve mode: explicit URL param wins, otherwise pick a sensible
  // default based on what panes exist. New projects always have both,
  // so "both" is the common case. Legacy single-pane projects fall back
  // to whichever pane is present.
  const resolvedInitialMode: Mode =
    initialMode ?? (page && canvas ? "both" : page ? "notes" : "canvas");
  const [mode, setMode] = useState<Mode>(resolvedInitialMode);
  const [projectName, setProjectName] = useState(project.name);

  const handleRename = async (next: string) => {
    setProjectName(next);
    const result = await renameProjectAction(project.id, next);
    if (!result.success) toast.error(result.message);
  };

  const hasBoth = Boolean(page && canvas);
  const showNotes = hasBoth ? mode === "notes" || mode === "both" : Boolean(page);
  const showCanvas = hasBoth ? mode === "canvas" || mode === "both" : Boolean(canvas);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="bg-card flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <EditableTitle
          value={projectName}
          onSave={handleRename}
          size="lg"
          placeholder="Untitled project"
        />


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
        </div>
        <AiChatPanel resourceKind="project" resourceId={project.id} resourceTitle={project.name} />
      </div>
    </div>
  );
}
