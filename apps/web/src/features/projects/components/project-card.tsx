"use client";

import { FileText, LayoutGrid, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDeleteProject, useRenameProject } from "../hooks/use-projects";
import type { Project } from "../types";

export function ProjectCard({ project, workspaceId }: { project: Project; workspaceId: string }) {
  const rename = useRenameProject(workspaceId);
  const remove = useDeleteProject(workspaceId);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(project.name);

  const busy = rename.isPending || remove.isPending;

  const handleRename = () => {
    const next = name.trim();
    if (!next || next === project.name) {
      setRenameOpen(false);
      return;
    }
    rename.mutate(
      { projectId: project.id, name: next },
      {
        onSuccess: () => {
          toast.success("Project renamed");
          setRenameOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm(`Delete project "${project.name}"? This removes all notes and canvases.`)) return;
    remove.mutate(project.id, {
      onSuccess: () => toast.success("Project deleted"),
      onError: (e) => toast.error(e.message),
    });
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
              <FileText className="h-3 w-3" /> 1 note
            </span>
            <span className="inline-flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" /> 1 canvas
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
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
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
            disabled={rename.isPending}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={rename.isPending}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={rename.isPending || !name.trim()}>
              {rename.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
