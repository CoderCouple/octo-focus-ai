"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { IconDotsVertical } from "@tabler/icons-react";
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
import { useDeleteCanvas, useRenameCanvas, useWorkspaceCanvases } from "../hooks/use-canvases";
import { canvasStatusLabel } from "../lib/derive-canvas-stats";
import type { WorkspaceCanvasSummary } from "../types";

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CanvasesTable({
  workspaceId,
  initialData,
}: {
  workspaceId: string;
  initialData: WorkspaceCanvasSummary[];
}) {
  const { data: canvases = initialData } = useWorkspaceCanvases(workspaceId, initialData);
  const rename = useRenameCanvas(workspaceId);
  const remove = useDeleteCanvas(workspaceId);
  const [renameTarget, setRenameTarget] = useState<WorkspaceCanvasSummary | null>(null);
  const [draft, setDraft] = useState("");

  const rows = useMemo(() => canvases, [canvases]);

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
                  No canvases yet. Open a project to draw one.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((canvas) => (
                <TableRow key={canvas.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/workspace/projects/${canvas.projectId}`}
                      className="hover:underline underline-offset-4"
                    >
                      {canvas.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{canvas.projectName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-muted-foreground px-1.5">
                      {canvasStatusLabel(canvas.visibility)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {canvas.visibility}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUpdated(canvas.updatedAt)}
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
                            setRenameTarget(canvas);
                            setDraft(canvas.title);
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/workspace/projects/${canvas.projectId}`}>Open project</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            remove.mutate(canvas.id, {
                              onSuccess: () => toast.success("Canvas deleted"),
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

      <Dialog open={Boolean(renameTarget)} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename canvas</DialogTitle>
            <DialogDescription>Pick a new title for this canvas.</DialogDescription>
          </DialogHeader>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameTarget || !draft.trim() || rename.isPending}
              onClick={() => {
                if (!renameTarget) return;
                rename.mutate(
                  { canvasId: renameTarget.id, title: draft.trim() },
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
