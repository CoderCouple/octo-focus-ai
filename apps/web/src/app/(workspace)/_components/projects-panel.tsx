"use client";

import type { Project } from "@octofocus/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, LayoutGrid, Loader2, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  createProjectAction,
  deleteProjectAction,
  listProjectsAction,
  renameProjectAction,
} from "@/actions/projects-action";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface ProjectsPanelProps {
  workspaceId: string;
}

interface QuickActionProps {
  icon: typeof FileText;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

function ProjectCard({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);

  const handleRename = async () => {
    if (!name.trim() || name === project.name) {
      setRenameOpen(false);
      return;
    }
    setBusy(true);
    try {
      await renameProjectAction(project.id, name.trim());
      onChanged();
      setRenameOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"? This removes all notes and canvases.`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteProjectAction(project.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <Link href={`/app/projects/${project.id}`}>
        <Card className="hover:border-foreground/30 hover:bg-accent/40 group flex h-full flex-col gap-3 p-5 transition-colors">
          <div className="flex items-start gap-3">
            <div className="bg-secondary text-secondary-foreground grid h-9 w-9 shrink-0 place-items-center rounded-md">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <div className="truncate text-sm font-semibold">{project.name}</div>
              <div className="text-muted-foreground text-xs">
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          {project.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{project.description}</p>
          )}
          <div className="text-muted-foreground/80 mt-auto flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> 0 pages
            </span>
            <span className="inline-flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" /> 0 canvases
            </span>
          </div>
        </Card>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 size-7 p-0 opacity-60 hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
            aria-label="Project actions"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-3.5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="size-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="size-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            disabled={busy}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickAction({ icon: Icon, label, description, onClick, disabled }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-border hover:border-foreground/30 hover:bg-accent group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-card"
    >
      <div className="bg-secondary text-secondary-foreground grid h-8 w-8 place-items-center rounded-md">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-muted-foreground text-xs">{description}</div>
      </div>
    </button>
  );
}

export function ProjectsPanel({ workspaceId }: ProjectsPanelProps) {
  const queryClient = useQueryClient();
  const projectsKey = ["projects", workspaceId] as const;

  const projectsQuery = useQuery<Project[]>({
    queryKey: projectsKey,
    queryFn: () => listProjectsAction(workspaceId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      return createProjectAction(workspaceId, {
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
    <section className="flex h-full flex-col gap-8 p-8">
      <div className="grid gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Quick start
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction
            icon={Plus}
            label="New project"
            description="Group notes, canvases, and agents."
            onClick={() => setDialogOpen(true)}
          />
          <QuickAction
            icon={FileText}
            label="New page"
            description="Pick a project first."
            onClick={() => {}}
            disabled
          />
          <QuickAction
            icon={Sparkles}
            label="Ask OctoFocusAI"
            description="Generate a diagram from a prompt."
            onClick={() => {}}
            disabled
          />
        </div>
      </div>

      <div className="grid gap-4">
        <header className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Projects
          </h2>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setFormError(null);
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
                {formError && <p className="text-destructive text-xs">{formError}</p>}
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
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
          </div>
        ) : projectsQuery.isError ? (
          <Card className="text-destructive p-4 text-sm">
            Couldn&apos;t load projects: {(projectsQuery.error as Error).message}
          </Card>
        ) : projectsQuery.data && projectsQuery.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projectsQuery.data.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onChanged={() => queryClient.invalidateQueries({ queryKey: projectsKey })}
              />
            ))}
          </div>
        ) : (
          <Card className="grid place-items-center gap-3 p-10 text-center">
            <div className="bg-secondary text-secondary-foreground grid h-10 w-10 place-items-center rounded-md">
              <FileText className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <div className="text-sm font-semibold">No projects yet</div>
              <div className="text-muted-foreground text-xs">
                Create your first project to start writing notes and drawing canvases.
              </div>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Card>
        )}
      </div>
    </section>
  );
}
