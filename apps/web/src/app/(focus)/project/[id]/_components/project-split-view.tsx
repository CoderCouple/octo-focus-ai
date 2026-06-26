"use client";

import type { Canvas, Page, Project } from "@octofocus/shared";
import { ArrowLeft, Columns2, FileText, Focus, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FloatingAiLauncher } from "@/features/ai-chat";
import { CanvasPane, extractDslLanguage, extractSourceOpen } from "@/features/canvas";
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
    <div className="flex h-full flex-col">
      <header className="bg-card flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-center gap-3">
          <div className="-ml-1 flex shrink-0 items-center gap-1">
            <Link
              href="/workspace/projects"
              aria-label="OctoFocusAI"
              className="bg-foreground text-background grid size-7 place-items-center rounded-md"
            >
              <Focus className="size-3.5" />
            </Link>
            <Link
              href="/workspace/projects"
              aria-label="Back"
              className="hover:bg-accent text-muted-foreground grid size-7 place-items-center rounded"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </div>
          <EditableTitle
            value={projectName}
            onSave={handleRename}
            size="lg"
            placeholder="Untitled project"
          />
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
              initialLanguage={extractDslLanguage(canvas.diagramSchema)}
              initialSourceOpen={extractSourceOpen(canvas.diagramSchema)}
              canvasTitle={canvas.title}
              initialVisibility={canvas.visibility}
              initialPublicSlug={canvas.publicSlug}
              workspaceSlug={workspaceSlug}
              workspaceId={project.workspaceId}
            />
          </div>
        ) : null}
      </div>
      <FloatingAiLauncher
        resourceKind="project"
        resourceId={project.id}
        resourceTitle={project.name}
      />
    </div>
  );
}
