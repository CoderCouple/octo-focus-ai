"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateProject } from "../hooks/use-projects";

interface CreateProjectDialogProps {
  workspaceId: string;
  /** Button label, e.g. "New project" / "New note" / "New canvas". */
  label?: string;
  /**
   * Which focus view to land on right after creation.
   * - `notes`  → `/note/<noteId>`         (focus note editor)
   * - `canvas` → `/canvas/<canvasId>`     (focus canvas editor)
   * - undefined → `/project/<projectId>` (split view, both panes)
   *
   * For `notes` / `canvas` we have the project id but not the child
   * resource id directly; the router-side createProjectAction returns
   * the project so we navigate to the standalone child's URL via the
   * project's id-to-resource lookup performed server-side (the focus
   * pages resolve note/canvas by id).
   *
   * The single-click "no modal" UX is intentional — every project comes
   * with a default name like "Untitled" and the user renames inline on
   * the resource page if they want.
   */
  mode?: "notes" | "canvas" | "both";
}

const DEFAULT_NAME: Record<NonNullable<CreateProjectDialogProps["mode"]>, string> = {
  notes: "Untitled note",
  canvas: "Untitled canvas",
  both: "Untitled project",
};

/**
 * Despite the name, this is no longer a dialog — clicking the button
 * creates a project (with the project always auto-seeding a note + a
 * canvas) with a default "Untitled …" name and immediately navigates
 * the user to the resource. The user can rename the title inline on
 * the resource page.
 *
 * Kept as `CreateProjectDialog` for now so existing call sites in
 * notes/canvas/projects tables don't need to change names.
 */
export function CreateProjectDialog({
  workspaceId,
  label = "New project",
  mode,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const create = useCreateProject(workspaceId);
  const [pending, setPending] = useState(false);

  const handleClick = () => {
    const defaultName = DEFAULT_NAME[mode ?? "both"];
    setPending(true);
    create.mutate(
      { name: defaultName },
      {
        onSuccess: async (project) => {
          // For "notes" / "canvas" land-on-focus modes we need the child
          // resource id, not the project id. The list endpoints for the
          // project return both children — fetch them and route to the
          // appropriate one.
          if (mode === "notes" || mode === "canvas") {
            try {
              const { listProjectNotesAction } = await import(
                "@/features/notes/actions/notes-actions"
              );
              const { listProjectCanvasesAction } = await import(
                "@/features/canvas/actions/canvases-actions"
              );
              if (mode === "notes") {
                const r = await listProjectNotesAction(project.id);
                if (r.success && r.data[0]) {
                  router.push(`/note/${r.data[0].id}`);
                  return;
                }
              } else {
                const r = await listProjectCanvasesAction(project.id);
                if (r.success && r.data[0]) {
                  router.push(`/canvas/${r.data[0].id}`);
                  return;
                }
              }
            } catch {
              // Fall through to project view on any lookup failure.
            }
          }
          router.push(`/project/${project.id}`);
        },
        onError: (e) => {
          toast.error(e.message);
          setPending(false);
        },
      },
    );
  };

  return (
    <Button size="sm" onClick={handleClick} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      {label}
    </Button>
  );
}
