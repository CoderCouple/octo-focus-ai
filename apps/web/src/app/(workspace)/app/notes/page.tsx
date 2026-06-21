import { getMeApi } from "@/api/me-api";
import { listWorkspacePagesApi } from "@/api/pages-api";
import { env } from "@/lib/env";
import { ResourceList } from "../../_components/resource-list";

const DEV_WORKSPACE_ID = "wsp_00000000-0000-0000-0000-000000000002";

export default async function NotesPage() {
  const workspaceId = env.DEV_AUTH_BYPASS
    ? DEV_WORKSPACE_ID
    : (await getMeApi()).memberships[0]?.workspace.id;
  if (!workspaceId) return null;

  const pages = await listWorkspacePagesApi(workspaceId);
  return (
    <ResourceList
      kind="page"
      items={pages.map((p) => ({
        id: p.id,
        title: p.title,
        projectId: p.projectId,
        projectName: p.projectName,
        visibility: p.visibility,
        publicSlug: p.publicSlug,
        contentMd: p.contentMd,
        updatedAt: p.updatedAt,
      }))}
    />
  );
}
