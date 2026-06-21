import { listWorkspaceCanvasesApi } from "@/api/canvases-api";
import { getMeApi } from "@/api/me-api";
import { env } from "@/lib/env";
import { ResourceList } from "../../_components/resource-list";

const DEV_WORKSPACE_ID = "wsp_00000000-0000-0000-0000-000000000002";

export default async function CanvasListPage() {
  const workspaceId = env.DEV_AUTH_BYPASS
    ? DEV_WORKSPACE_ID
    : (await getMeApi()).memberships[0]?.workspace.id;
  if (!workspaceId) return null;

  const canvases = await listWorkspaceCanvasesApi(workspaceId);
  return (
    <ResourceList
      kind="canvas"
      items={canvases.map((c) => ({
        id: c.id,
        title: c.title,
        projectId: c.projectId,
        projectName: c.projectName,
        visibility: c.visibility,
        publicSlug: c.publicSlug,
        updatedAt: c.updatedAt,
      }))}
    />
  );
}
