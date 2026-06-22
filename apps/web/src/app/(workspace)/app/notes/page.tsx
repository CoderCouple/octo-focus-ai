import {
  deriveNotesStats,
  NotesStats,
  NotesTable,
  listWorkspaceNotesAction,
} from "@/features/notes";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";
import { env } from "@/lib/env";

const DEV_WORKSPACE_ID = "wsp_00000000-0000-0000-0000-000000000002";

export default async function NotesPage() {
  const workspaceId = env.DEV_AUTH_BYPASS
    ? DEV_WORKSPACE_ID
    : (await getMeApi()).memberships[0]?.workspace.id;
  if (!workspaceId) return null;

  const result = await listWorkspaceNotesAction(workspaceId);
  const notes = result.success ? result.data : [];
  const stats = deriveNotesStats(notes);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <NotesStats stats={stats} />
          <NotesTable workspaceId={workspaceId} initialData={notes} />
        </div>
      </div>
    </div>
  );
}
