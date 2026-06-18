"use client";

import type { Project } from "@octofocus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject, listProjects } from "@/lib/api/projects";

interface ProjectsPanelProps {
  workspaceId: string;
}

export function ProjectsPanel({ workspaceId }: ProjectsPanelProps) {
  const queryClient = useQueryClient();
  const projectsKey = ["projects", workspaceId] as const;

  const projectsQuery = useQuery<Project[]>({
    queryKey: projectsKey,
    queryFn: () => listProjects(workspaceId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      return createProject(workspaceId, {
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKey });
      setName("");
      setDescription("");
      setFormError(null);
      setDialogOpen(false);
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : "Could not create project.");
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <section className="flex h-full flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Projects
          </h2>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">Your workspace</h3>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setFormError(null);
            }
          }}
        >
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>
                Projects group pages and canvases. Start with a name; you can edit the rest later.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Name</Label>
                <Input
                  id="project-name"
                  required
                  maxLength={120}
                  placeholder="Architecture Notes"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  maxLength={2000}
                  placeholder="What goes in this project?"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
              {formError && <p className="text-xs text-destructive">{formError}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    "Create project"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {projectsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
        </div>
      ) : projectsQuery.isError ? (
        <Card className="p-4 text-sm text-destructive">
          Couldn&apos;t load projects: {(projectsQuery.error as Error).message}
        </Card>
      ) : projectsQuery.data && projectsQuery.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projectsQuery.data.map((project) => (
            <Card key={project.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {project.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="grid place-items-center gap-3 p-10 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-secondary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div className="grid gap-1">
            <div className="text-sm font-semibold">No projects yet</div>
            <div className="text-xs text-muted-foreground">
              Create your first project to start writing notes and drawing canvases.
            </div>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Card>
      )}
    </section>
  );
}
