import { listWorkspacePagesApi } from "@/api/pages-api";
import { getMeApi } from "@/api/me-api";
import { SectionCards, type SectionMetric } from "@/components/section-cards";
import { env } from "@/lib/env";
import { NotesTableShell } from "./_components/notes-table-shell";

const DEV_WORKSPACE_ID = "wsp_00000000-0000-0000-0000-000000000002";

function summarize(updatedAt: string): string {
  const d = new Date(updatedAt);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusOf(visibility: string): string {
  return visibility === "public" || visibility === "unlisted" ? "Published" : "Draft";
}

export default async function NotesPage() {
  const workspaceId = env.DEV_AUTH_BYPASS
    ? DEV_WORKSPACE_ID
    : (await getMeApi()).memberships[0]?.workspace.id;
  if (!workspaceId) return null;

  const pages = await listWorkspacePagesApi(workspaceId);

  const draftCount = pages.filter((p) => statusOf(p.visibility) === "Draft").length;
  const publishedCount = pages.length - draftCount;
  const last7d = pages.filter(
    (p) => Date.now() - new Date(p.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length;

  const metrics: SectionMetric[] = [
    {
      description: "Notes",
      value: pages.length.toLocaleString(),
      trend: { direction: "up", value: pages.length === 0 ? "—" : `${pages.length}` },
      headline: "Across your projects",
      subtext: "Total live notes",
    },
    {
      description: "Drafts",
      value: draftCount.toLocaleString(),
      trend: { direction: "up", value: `${draftCount}` },
      headline: "Private + workspace-only",
      subtext: "Notes not yet shared publicly",
    },
    {
      description: "Published",
      value: publishedCount.toLocaleString(),
      trend: { direction: "up", value: `${publishedCount}` },
      headline: "Public or unlisted",
      subtext: "Anyone with the link can view",
    },
    {
      description: "Updated 7d",
      value: last7d.toLocaleString(),
      trend: { direction: "up", value: `${last7d}` },
      headline: "Recent activity",
      subtext: "Notes touched in the last week",
    },
  ];

  const tableData = pages.map((page, index) => ({
    id: index + 1,
    header: page.title,
    type: page.projectName,
    status: statusOf(page.visibility),
    target: summarize(page.updatedAt),
    limit: page.visibility,
    reviewer: "—",
    resourceId: page.id,
    resourceHref: `/app/projects/${page.projectId}`,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards metrics={metrics} />
          <NotesTableShell data={tableData} />
        </div>
      </div>
    </div>
  );
}
