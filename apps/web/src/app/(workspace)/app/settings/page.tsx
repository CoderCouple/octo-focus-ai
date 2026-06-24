import {
  getActiveWorkspaceIdCookie,
  resolveActiveMembership,
} from "@/features/workspaces";
import { getMeApi, listWorkspaceMembersApi } from "@/features/workspaces/api/workspaces-api";
import { SettingsPanel } from "./_components/settings-panel";

export default async function SettingsPage() {
  const me = await getMeApi();
  const activeId = await getActiveWorkspaceIdCookie();
  const active = resolveActiveMembership(me.memberships, activeId);
  if (!active) return null;

  const workspaceId = active.workspace.id;
  const workspaceName = active.workspace.name;
  const workspaceSlug = active.workspace.slug;
  const viewerRole = active.membership.role;

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
