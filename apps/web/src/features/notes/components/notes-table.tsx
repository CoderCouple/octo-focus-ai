"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconDotsVertical } from "@tabler/icons-react";
import { useDeleteNote, useRenameNote, useWorkspaceNotes } from "../hooks/use-notes";
import { noteStatusLabel } from "../lib/derive-notes-stats";
import type { WorkspacePageSummary } from "../types";

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotesTable({
  workspaceId,
  initialData,
}: {
  workspaceId: string;
  initialData: WorkspacePageSummary[];
}) {
  const { data: notes = initialData } = useWorkspaceNotes(workspaceId, initialData);
  const rename = useRenameNote(workspaceId);
  const remove = useDeleteNote(workspaceId);
  const [renameTarget, setRenameTarget] = useState<WorkspacePageSummary | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const rows = useMemo(() => notes, [notes]);

  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12 text-right">{""}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                  No notes yet. Create one from inside a project.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/workspace/projects/${note.projectId}`}
                      className="hover:underline underline-offset-4"
                    >
                      {note.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{note.projectName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-muted-foreground px-1.5">
                      {noteStatusLabel(note.visibility)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {note.visibility}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUpdated(note.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <IconDotsVertical className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setRenameTarget(note);
                            setRenameDraft(note.title);
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/workspace/projects/${note.projectId}`}>Open project</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            remove.mutate(note.id, {
                              onSuccess: () => toast.success("Note deleted"),
                              onError: (e) => toast.error(e.message),
                            });
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename note</DialogTitle>
            <DialogDescription>Pick a new title for this note.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameTarget || !renameDraft.trim() || rename.isPending}
              onClick={() => {
                if (!renameTarget) return;
                rename.mutate(
                  { pageId: renameTarget.id, title: renameDraft.trim() },
                  {
                    onSuccess: () => {
                      toast.success("Renamed");
                      setRenameTarget(null);
                    },
                    onError: (e) => toast.error(e.message),
                  },
                );
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
