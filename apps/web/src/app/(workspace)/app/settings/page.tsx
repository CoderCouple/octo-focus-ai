import { getActiveWorkspaceIdCookie, resolveActiveMembership } from "@/features/workspaces";
import { getMeApi, listWorkspaceMembersApi } from "@/features/workspaces/api/workspaces-api";
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
    const active = resolveActiveMembership(me.memberships, activeId);
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
