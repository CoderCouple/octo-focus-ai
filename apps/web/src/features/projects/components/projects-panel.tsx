"use client";

import { Columns2, FileText, LayoutGrid, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useProjects } from "../hooks/use-projects";
import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectCard } from "./project-card";

function QuickAction({
  icon: Icon,
  label,
  description,
}: {
  icon: typeof FileText;
  label: string;
  description: string;
}) {
  // Rendered as the dialog's <DialogTrigger asChild> child, so the
  // dialog wires the onClick automatically. We render a non-button
  // <div role="button"> because the trigger forwards the click + a11y
  // props to its child and a nested <button> inside <button> would be
  // invalid HTML.
  return (
    <div
      role="button"
      tabIndex={0}
      className="border-border hover:border-foreground/30 hover:bg-accent group flex cursor-pointer flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="border-border text-foreground grid h-8 w-8 place-items-center rounded-md border">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-muted-foreground text-xs">{description}</div>
      </div>
    </div>
  );
}

export function ProjectsPanel({ workspaceId }: { workspaceId: string }) {
  const projects = useProjects(workspaceId);

  return (
    <section className="flex h-full flex-col gap-8 p-8">
      <div className="grid gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Quick start
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CreateProjectDialog
            workspaceId={workspaceId}
            fixedShape="note"
            trigger={
              <QuickAction
                icon={FileText}
                label="New note"
                description="A project with just a note."
              />
            }
          />
          <CreateProjectDialog
            workspaceId={workspaceId}
            fixedShape="canvas"
            trigger={
              <QuickAction
                icon={LayoutGrid}
                label="New canvas"
                description="A project with just a canvas."
              />
            }
          />
          <CreateProjectDialog
            workspaceId={workspaceId}
            trigger={
              <QuickAction
                icon={Columns2}
                label="New project"
                description="Pick what's inside — note, canvas, or both."
              />
            }
          />
        </div>
      </div>

      <div className="grid gap-4">
        <header className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Projects
          </h2>
          <CreateProjectDialog workspaceId={workspaceId} />
        </header>

        {projects.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
          </div>
        ) : projects.isError ? (
          <Card className="text-destructive p-4 text-sm">
            Couldn&apos;t load projects: {(projects.error as Error).message}
          </Card>
        ) : projects.data && projects.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.data.map((project) => (
              <ProjectCard key={project.id} project={project} workspaceId={workspaceId} />
            ))}
          </div>
        ) : (
          <Card className="grid place-items-center gap-3 p-10 text-center">
            <div className="border-border text-foreground grid h-10 w-10 place-items-center rounded-md border">
              <FileText className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <div className="text-sm font-semibold">No projects yet</div>
              <div className="text-muted-foreground text-xs">
                Create your first project to start writing notes and drawing canvases.
              </div>
            </div>
            <CreateProjectDialog workspaceId={workspaceId} />
          </Card>
        )}
      </div>
    </section>
  );
}
