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
import { useDeleteProject, useProjects, useRenameProject } from "../hooks/use-projects";
import { projectStatusLabel } from "../lib/derive-projects-stats";
import type { Project } from "../types";
import { CreateProjectDialog } from "./create-project-dialog";

type StatusFilter = "all" | "draft" | "published";
type SortKey = "updated-desc" | "updated-asc" | "name-asc" | "name-desc";

const SORT_OPTIONS: { key: SortKey; label: string; sorting: SortingState }[] = [
  { key: "updated-desc", label: "Updated (newest)", sorting: [{ id: "updatedAt", desc: true }] },
  { key: "updated-asc", label: "Updated (oldest)", sorting: [{ id: "updatedAt", desc: false }] },
  { key: "name-asc", label: "Name (A → Z)", sorting: [{ id: "name", desc: false }] },
  { key: "name-desc", label: "Name (Z → A)", sorting: [{ id: "name", desc: true }] },
];

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function matchesStatus(p: Project, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  return projectStatusLabel(p.visibility).toLowerCase() === filter;
}

export function ProjectsTable({
  workspaceId,
  initialData,
}: {
  workspaceId: string;
  initialData: Project[];
}) {
  const { data: projects = initialData } = useProjects(workspaceId, initialData);
  const rename = useRenameProject(workspaceId);
  const remove = useDeleteProject(workspaceId);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [draft, setDraft] = useState("");
  // Type-to-confirm modal for project deletion — replaces the
  // platform `confirm()` so users have to re-type the project name
  // before the destructive action fires.
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated-desc");
  const sorting = useMemo(
    () => SORT_OPTIONS.find((o) => o.key === sortKey)?.sorting ?? [],
    [sortKey],
  );
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const filtered = useMemo(
    () => projects.filter((p) => matchesStatus(p, status)),
    [projects, status],
  );

  const counts = useMemo(
    () => ({
      all: projects.length,
      draft: projects.filter((p) => projectStatusLabel(p.visibility) === "Draft").length,
      published: projects.filter((p) => projectStatusLabel(p.visibility) === "Published").length,
    }),
    [projects],
  );

  const columns: ColumnDef<Project>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/project/${row.original.id}`}
            className="font-bold hover:underline underline-offset-4"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => projectStatusLabel(row.visibility),
        cell: ({ row }) => (
          <StatusBadge status={projectStatusLabel(row.original.visibility)} />
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
        cell: ({ row }) => <OwnerCell creator={row.original.creator ?? null} />,
      },
      {
        id: "reviewers",
        header: "Reviewers",
        accessorFn: (row) => row.sharedCount ?? 0,
        cell: ({ row }) => <ReviewersCell count={row.original.sharedCount ?? 0} />,
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
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  onSelect={() => {
                    setRenameTarget(row.original);
                    setDraft(row.original.name);
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/project/${row.original.id}`}>Open</Link>
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
        meta: { width: "w-12" },
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
        <Label htmlFor="projects-status-selector" className="sr-only">
          Status
        </Label>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="projects-status-selector">
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
          <CreateProjectDialog workspaceId={workspaceId} label="New project" />
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
                    No projects to show.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {filtered.length} of {projects.length} project{projects.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(v) =>
                setPagination((p) => ({ ...p, pageSize: Number(v), pageIndex: 0 }))
              }
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
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
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>Pick a new name for this project.</DialogDescription>
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
                  { projectId: renameTarget.id, name: draft.trim() },
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
          deleteTarget ? `Delete project "${deleteTarget.name}"?` : "Delete project?"
        }
        description="This removes the project, its note, and its canvas. This action can't be undone."
        actionLabel="Delete project"
        typeToConfirm={
          deleteTarget
            ? { value: deleteTarget.name, label: "project name" }
            : undefined
        }
        onConfirm={() => {
          if (!deleteTarget) return;
          return new Promise<void>((resolve) => {
            remove.mutate(deleteTarget.id, {
              onSuccess: () => {
                toast.success("Project deleted");
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
