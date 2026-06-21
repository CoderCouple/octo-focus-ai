"use client";

import { useRouter } from "next/navigation";
import { deleteCanvasAction } from "@/actions/canvases-action";
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

export function CanvasTableShell({ data }: { data: RowShape[] }) {
  const router = useRouter();
  return (
    <DataTable
      data={data}
      resourceLabel="canvas"
      onDelete={async (canvasId) => {
        await deleteCanvasAction(canvasId);
        router.refresh();
      }}
    />
  );
}
