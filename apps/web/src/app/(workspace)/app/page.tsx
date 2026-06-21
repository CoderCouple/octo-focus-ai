import { getMeApi } from "@/api/me-api";
import { env } from "@/lib/env";
import { ProjectsPanel } from "../_components/projects-panel";

const DEV_WORKSPACE_ID = "wsp_00000000-0000-0000-0000-000000000002";

export default async function WorkspaceHomePage() {
  let workspaceId: string;
  if (env.DEV_AUTH_BYPASS) {
    workspaceId = DEV_WORKSPACE_ID;
  } else {
    const me = await getMeApi();
    const active = me.memberships[0];
    if (!active) return null;
    workspaceId = active.workspace.id;
  }
  return <ProjectsPanel workspaceId={workspaceId} />;
}
