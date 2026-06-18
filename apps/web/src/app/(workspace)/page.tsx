import { getMeApi } from "@/api/me-api";
import { ProjectsPanel } from "./_components/projects-panel";

export default async function WorkspaceHomePage() {
  const me = await getMeApi();
  const active = me.memberships[0];
  if (!active) return null;
  return <ProjectsPanel workspaceId={active.workspace.id} />;
}
