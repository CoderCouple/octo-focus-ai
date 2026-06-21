import { getActiveWorkspaceIdCookie } from "@/actions/workspaces-action";
import { getMeApi } from "@/api/me-api";
import { listWorkspaceMembersApi } from "@/api/workspaces-api";
import { env } from "@/lib/env";
import { SettingsPanel } from "./_components/settings-panel";

const DEV_WORKSPACE_ID = "wsp_00000000-0000-0000-0000-000000000002";

export default async function SettingsPage() {
  let workspaceId: string;
  let workspaceName = "Workspace";
  let workspaceSlug = "workspace";
  let viewerRole: "OWNER" | "ADMIN" | "MEMBER" = "OWNER";

  if (env.DEV_AUTH_BYPASS) {
    workspaceId = DEV_WORKSPACE_ID;
  } else {
    const me = await getMeApi();
    const activeId = await getActiveWorkspaceIdCookie();
    const active =
      (activeId && me.memberships.find((m) => m.workspace.id === activeId)) ||
      me.memberships[0];
    if (!active) return null;
    workspaceId = active.workspace.id;
    workspaceName = active.workspace.name;
    workspaceSlug = active.workspace.slug;
    viewerRole = active.membership.role;
  }

  const members = await listWorkspaceMembersApi(workspaceId);

  return (
    <SettingsPanel
      workspaceId={workspaceId}
      initialName={workspaceName}
      initialSlug={workspaceSlug}
      viewerRole={viewerRole}
      members={members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user ?? {
          id: m.userId,
          name: m.userId,
          email: "—",
          avatarUrl: null,
        },
      }))}
    />
  );
}
