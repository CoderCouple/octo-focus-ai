import { listWorkspaceCanvasesApi } from "@/api/canvases-api";
import { getMeApi } from "@/api/me-api";
import { SectionCards, type SectionMetric } from "@/components/section-cards";
import { env } from "@/lib/env";
import { CanvasTableShell } from "./_components/canvas-table-shell";

const DEV_WORKSPACE_ID = "wsp_00000000-0000-0000-0000-000000000002";

function summarize(updatedAt: string): string {
  const d = new Date(updatedAt);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusOf(visibility: string): string {
  return visibility === "public" || visibility === "unlisted" ? "Published" : "Draft";
}

export default async function CanvasListPage() {
  const workspaceId = env.DEV_AUTH_BYPASS
    ? DEV_WORKSPACE_ID
    : (await getMeApi()).memberships[0]?.workspace.id;
  if (!workspaceId) return null;

  const canvases = await listWorkspaceCanvasesApi(workspaceId);

  const draftCount = canvases.filter((c) => statusOf(c.visibility) === "Draft").length;
  const publishedCount = canvases.length - draftCount;
  const last7d = canvases.filter(
    (c) => Date.now() - new Date(c.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length;

  const metrics: SectionMetric[] = [
    {
      description: "Canvases",
      value: canvases.length.toLocaleString(),
      trend: { direction: "up", value: `${canvases.length}` },
      headline: "Across your projects",
      subtext: "Total live canvases",
    },
    {
      description: "Drafts",
      value: draftCount.toLocaleString(),
      trend: { direction: "up", value: `${draftCount}` },
      headline: "Private + workspace-only",
      subtext: "Canvases not yet shared publicly",
    },
    {
      description: "Published",
      value: publishedCount.toLocaleString(),
      trend: { direction: "up", value: `${publishedCount}` },
      headline: "Public or unlisted",
      subtext: "Anyone with the link can view",
    },
    {
      description: "Edited 7d",
      value: last7d.toLocaleString(),
      trend: { direction: "up", value: `${last7d}` },
      headline: "Recent activity",
      subtext: "Canvases touched in the last week",
    },
  ];

  const tableData = canvases.map((canvas, index) => ({
    id: index + 1,
    header: canvas.title,
    type: canvas.projectName,
    status: statusOf(canvas.visibility),
    target: summarize(canvas.updatedAt),
    limit: canvas.visibility,
    reviewer: "—",
    resourceId: canvas.id,
    resourceHref: `/app/projects/${canvas.projectId}`,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards metrics={metrics} />
          <CanvasTableShell data={tableData} />
        </div>
      </div>
    </div>
  );
}
