import { ProjectsPanel } from "@/features/projects";
import {
  getActiveWorkspaceIdCookie,
  resolveActiveMembership,
} from "@/features/workspaces";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

export default async function WorkspaceHomePage() {
  // Respect the active-workspace cookie set by the workspace switcher —
  // without this, every workspace tab landed on the first membership's
  // projects regardless of what the user picked.
  const me = await getMeApi();
  const activeId = await getActiveWorkspaceIdCookie();
  const active = resolveActiveMembership(me.memberships, activeId);
  if (!active) return null;
  return <ProjectsPanel workspaceId={active.workspace.id} />;
}
