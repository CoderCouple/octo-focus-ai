"use client";

import type { Canvas, Page, Project } from "@octofocus/shared";
import { ChevronDown, Columns2, FileText, LayoutGrid, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCanvasAction } from "@/actions/canvases-action";
import { createPageAction } from "@/actions/pages-action";
import { CanvasPane } from "@/components/canvas-pane";
import { NotesPane } from "@/components/notes-pane";
import { SharePopover } from "@/components/share-popover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Mode = "notes" | "both" | "canvas";

interface ProjectSplitViewProps {
  project: Project;
  page: Page;
  canvas: Canvas;
  pages: Array<{ id: string; title: string }>;
  canvases: Array<{ id: string; title: string }>;
  initialDsl: string;
  workspaceSlug: string;
}

export function ProjectSplitView({
  project,
  page,
  canvas,
  pages,
  canvases,
  initialDsl,
  workspaceSlug,
}: ProjectSplitViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("both");
  const [creatingPage, setCreatingPage] = useState(false);
  const [creatingCanvas, setCreatingCanvas] = useState(false);

  const showNotes = mode === "notes" || mode === "both";
  const showCanvas = mode === "canvas" || mode === "both";

  const navigate = (next: { page?: string; canvas?: string }) => {
    const params = new URLSearchParams();
    params.set("page", next.page ?? page.id);
    params.set("canvas", next.canvas ?? canvas.id);
    router.push(`/app/projects/${project.id}?${params.toString()}`);
  };

  const handleNewPage = async () => {
    setCreatingPage(true);
    try {
      const created = await createPageAction(project.id, { title: "Untitled" });
      navigate({ page: created.id });
    } finally {
      setCreatingPage(false);
    }
  };

  const handleNewCanvas = async () => {
    setCreatingCanvas(true);
    try {
      const created = await createCanvasAction(project.id, { title: "Untitled canvas" });
      navigate({ canvas: created.id });
    } finally {
      setCreatingCanvas(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="bg-card flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <div className="text-sm font-semibold">{project.name}</div>
        <ResourceSelector
          icon={<FileText className="size-3.5" />}
          label={page.title}
          items={pages}
          activeId={page.id}
          busy={creatingPage}
          onSelect={(id) => navigate({ page: id })}
          onCreate={handleNewPage}
          createLabel="New note"
        />
        <ResourceSelector
          icon={<LayoutGrid className="size-3.5" />}
          label={canvas.title}
          items={canvases}
          activeId={canvas.id}
          busy={creatingCanvas}
          onSelect={(id) => navigate({ canvas: id })}
          onCreate={handleNewCanvas}
          createLabel="New canvas"
        />
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as Mode)}
          variant="outline"
          size="sm"
          className="ml-auto"
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
        <SharePopover
          resourceKind="project"
          resourceId={project.id}
          resourceTitle={project.name}
          initialVisibility={project.visibility}
          initialPublicSlug={project.publicSlug}
          workspaceSlug={workspaceSlug}
        />
      </header>
      <div className="flex flex-1 overflow-hidden">
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

interface ResourceSelectorProps {
  icon: React.ReactNode;
  label: string;
  items: Array<{ id: string; title: string }>;
  activeId: string;
  busy: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  createLabel: string;
}

function ResourceSelector({
  icon,
  label,
  items,
  activeId,
  busy,
  onSelect,
  onCreate,
  createLabel,
}: ResourceSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-xs"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : icon}
          <span className="max-w-[140px] truncate">{label || "Untitled"}</span>
          <ChevronDown className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={item.id === activeId ? "bg-accent" : ""}
          >
            <span className="truncate">{item.title || "Untitled"}</span>
          </DropdownMenuItem>
        ))}
        {items.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem onClick={onCreate}>
          <Plus className="size-3.5" />
          {createLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
