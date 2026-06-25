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
import { Loader2, Mic, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OwnerCell } from "@/components/owner-cell";
import { ReviewersCell } from "@/components/reviewers-cell";
import { VisibilityBadge } from "@/components/visibility-badge";
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
import { useCreateMeeting, useDeleteMeeting, useRenameMeeting, useWorkspaceMeetings } from "../hooks/use-meetings";
import { formatDuration } from "../lib/format-duration";
import type { WorkspaceMeetingSummary } from "../types";

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

export function MeetingsTable({
  workspaceId,
  initialData,
}: {
  workspaceId: string;
  initialData: WorkspaceMeetingSummary[];
}) {
  const router = useRouter();
  const { data: meetings = initialData } = useWorkspaceMeetings(workspaceId, initialData);
  const create = useCreateMeeting(workspaceId);
  const rename = useRenameMeeting(workspaceId);
  const remove = useDeleteMeeting(workspaceId);
  const [renameTarget, setRenameTarget] = useState<WorkspaceMeetingSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated-desc");
  const sorting = useMemo(
    () => SORT_OPTIONS.find((o) => o.key === sortKey)?.sorting ?? [],
    [sortKey],
  );
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const handleNew = () => {
    create.mutate(
      { title: "Untitled meeting" },
      {
        onSuccess: (m) => router.push(`/workspace/meetings/${m.id}`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const columns: ColumnDef<WorkspaceMeetingSummary>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Link
            href={`/workspace/meetings/${row.original.id}`}
            className="font-bold hover:underline underline-offset-4"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        id: "recording",
        header: "Recording",
        accessorFn: (row) => (row.hasAudio ? 1 : 0),
        cell: ({ row }) =>
          row.original.hasAudio ? (
            <span className="text-foreground inline-flex items-center gap-1.5 text-sm">
              <Mic className="size-3.5" />
              {formatDuration(row.original.audioDurationSec)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
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
                  <Link href={`/workspace/meetings/${row.original.id}`}>Open</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    remove.mutate(row.original.id, {
                      onSuccess: () => toast.success("Meeting deleted"),
                      onError: (e) => toast.error(e.message),
                    });
                  }}
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
    data: meetings,
    columns,
    state: { sorting, pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort";

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-end gap-2 px-4 lg:px-6">
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
        <Button size="sm" onClick={handleNew} disabled={create.isPending}>
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New meeting
        </Button>
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
                    No meetings yet. Click <span className="font-medium">New meeting</span> to start one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {meetings.length} meeting{meetings.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="meetings-rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(v) =>
                setPagination((p) => ({ ...p, pageSize: Number(v), pageIndex: 0 }))
              }
            >
              <SelectTrigger size="sm" className="w-20" id="meetings-rows-per-page">
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
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename meeting</DialogTitle>
            <DialogDescription>Pick a new title for this meeting.</DialogDescription>
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
                  { id: renameTarget.id, title: draft.trim() },
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
