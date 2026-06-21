"use client";

import { useRouter } from "next/navigation";
import { deletePageAction, renamePageAction } from "@/actions/pages-action";
import { DataTable } from "@/components/data-table";

interface RowShape {
  id: number;
  header: string;
  type: string;
  status: string;
  target: string;
  limit: string;
  reviewer: string;
  resourceId?: string;
  resourceHref?: string;
}

export function NotesTableShell({ data }: { data: RowShape[] }) {
  const router = useRouter();
  return (
    <DataTable
      data={data}
      resourceLabel="note"
      onDelete={async (pageId) => {
        await deletePageAction(pageId);
        router.refresh();
      }}
      onRename={async (pageId, title) => {
        await renamePageAction(pageId, title);
        router.refresh();
      }}
    />
  );
}
