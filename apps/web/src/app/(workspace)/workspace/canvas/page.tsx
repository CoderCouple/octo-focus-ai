import {
  CanvasesStats,
  CanvasesTable,
  deriveCanvasStats,
  listWorkspaceCanvasesAction,
} from "@/features/canvas";
import {
  getActiveWorkspaceIdCookie,
  resolveActiveMembership,
} from "@/features/workspaces";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

export default async function CanvasListPage() {
  const me = await getMeApi();
  const activeId = await getActiveWorkspaceIdCookie();
  const active = resolveActiveMembership(me.memberships, activeId);
  if (!active) return null;
  const workspaceId = active.workspace.id;

  const result = await listWorkspaceCanvasesAction(workspaceId);
  const canvases = result.success ? result.data : [];
  const stats = deriveCanvasStats(canvases);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <CanvasesStats stats={stats} />
          <CanvasesTable workspaceId={workspaceId} initialData={canvases} />
        </div>
      </div>
    </div>
  );
}
