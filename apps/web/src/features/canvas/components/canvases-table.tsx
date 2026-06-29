"use client";

import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
} from "@tabler/icons-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateProjectDialog } from "@/features/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { OwnerCell } from "@/components/owner-cell";
import { ReviewersCell } from "@/components/reviewers-cell";
import { StatusBadge } from "@/components/status-badge";
import { VisibilityBadge } from "@/components/visibility-badge";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteCanvas, useRenameCanvas, useWorkspaceCanvases } from "../hooks/use-canvases";
import { canvasStatusLabel } from "../lib/derive-canvas-stats";
import type { WorkspaceCanvasSummary } from "../types";

type StatusFilter = "all" | "draft" | "published";
type SortKey = "updated-desc" | "updated-asc" | "title-asc" | "title-desc";

const SORT_OPTIONS: { key: SortKey; label: string; sorting: SortingState }[] = [
  { key: "updated-desc", label: "Updated (newest)", sorting: [{ id: "updatedAt", desc: true }] },
  { key: "updated-asc", label: "Updated (oldest)", sorting: [{ id: "updatedAt", desc: false }] },
  { key: "title-asc", label: "Title (A → Z)", sorting: [{ id: "title", desc: false }] },
  { key: "title-desc", label: "Title (Z → A)", sorting: [{ id: "title", desc: true }] },
];

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function matchesStatus(c: WorkspaceCanvasSummary, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  return canvasStatusLabel(c.visibility).toLowerCase() === filter;
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
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceCanvasSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated-desc");
  const sorting = useMemo(
    () => SORT_OPTIONS.find((o) => o.key === sortKey)?.sorting ?? [],
    [sortKey],
  );
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const filtered = useMemo(
    () => canvases.filter((c) => matchesStatus(c, status)),
    [canvases, status],
  );

  const counts = useMemo(
    () => ({
      all: canvases.length,
      draft: canvases.filter((c) => canvasStatusLabel(c.visibility) === "Draft").length,
      published: canvases.filter((c) => canvasStatusLabel(c.visibility) === "Published").length,
    }),
    [canvases],
  );

  const columns: ColumnDef<WorkspaceCanvasSummary>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Link
            href={`/canvas/${row.original.id}`}
            className="font-bold hover:underline underline-offset-4"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: "projectName",
        header: "Project",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.projectName}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => canvasStatusLabel(row.visibility),
        cell: ({ row }) => (
          <StatusBadge status={canvasStatusLabel(row.original.visibility)} />
        ),
      },
      {
        accessorKey: "visibility",
        header: "Visibility",
        cell: ({ row }) => <VisibilityBadge visibility={row.original.visibility} />,
      },
      {
        id: "owner",
        header: "Owner",
        accessorFn: (row) => row.creator?.name ?? "",
        cell: ({ row }) => <OwnerCell creator={row.original.creator} />,
      },
      {
        id: "reviewers",
        header: "Reviewers",
        accessorFn: (row) => row.sharedCount,
        cell: ({ row }) => <ReviewersCell count={row.original.sharedCount} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatUpdated(row.original.updatedAt)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground size-7">
                  <IconDotsVertical className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onSelect={() => {
                    setRenameTarget(row.original);
                    setDraft(row.original.title);
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/canvas/${row.original.id}`}>
                    Open
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteTarget(row.original)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [remove],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort";

  return (
    <Tabs
      value={status}
      onValueChange={(v) => setStatus(v as StatusFilter)}
      className="w-full flex-col justify-start gap-4"
    >
      <div className="flex items-center justify-between gap-2 px-4 lg:px-6">
        <Label htmlFor="canvases-status-selector" className="sr-only">
          Status
        </Label>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="canvases-status-selector">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.all})</SelectItem>
            <SelectItem value="draft">Drafts ({counts.draft})</SelectItem>
            <SelectItem value="published">Published ({counts.published})</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="all">
            All <Badge variant="secondary">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts <Badge variant="secondary">{counts.draft}</Badge>
          </TabsTrigger>
          <TabsTrigger value="published">
            Published <Badge variant="secondary">{counts.published}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconArrowsSort />
                <span className="hidden lg:inline">{currentSortLabel}</span>
                <span className="lg:hidden">Sort</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onSelect={() => setSortKey(opt.key)}
                  className={sortKey === opt.key ? "bg-accent font-medium" : ""}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <CreateProjectDialog workspaceId={workspaceId} label="New canvas" mode="canvas" />
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-foreground/5 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={header.column.id === "actions" ? "w-12 text-right" : ""}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cell.column.id === "actions" ? "w-12 text-right" : ""}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                    No canvases yet. Create one above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {filtered.length} of {canvases.length} canvas{canvases.length === 1 ? "" : "es"}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="canvases-rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(v) =>
                setPagination((p) => ({ ...p, pageSize: Number(v), pageIndex: 0 }))
              }
            >
              <SelectTrigger size="sm" className="w-20" id="canvases-rows-per-page">
                <SelectValue placeholder={pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">First page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Previous</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Next</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
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

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={
          deleteTarget ? `Delete canvas "${deleteTarget.title}"?` : "Delete canvas?"
        }
        description="The canvas and all its shapes are removed. This action can't be undone."
        actionLabel="Delete canvas"
        typeToConfirm={
          deleteTarget
            ? { value: deleteTarget.title, label: "canvas title" }
            : undefined
        }
        onConfirm={() => {
          if (!deleteTarget) return;
          return new Promise<void>((resolve) => {
            remove.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success("Canvas deleted");
                resolve();
              },
              onError: (e) => {
                toast.error(e.message);
                resolve();
              },
            });
          });
        }}
      />
    </Tabs>
  );
}
