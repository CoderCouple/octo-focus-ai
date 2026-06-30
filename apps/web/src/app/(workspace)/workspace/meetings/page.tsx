import { listWorkspaceMeetingsApi } from "@/features/meetings/api/meetings-api";
import { MeetingsTable } from "@/features/meetings/components/meetings-table";
import {
  getActiveWorkspaceIdCookie,
  resolveActiveMembership,
} from "@/features/workspaces";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

export default async function MeetingsPage() {
  const me = await getMeApi();
  const activeId = await getActiveWorkspaceIdCookie();
  const active = resolveActiveMembership(me.memberships, activeId);
  if (!active) return null;

  let meetings: Awaited<ReturnType<typeof listWorkspaceMeetingsApi>>;
  try {
    meetings = await listWorkspaceMeetingsApi(active.workspace.id);
  } catch {
    meetings = [];
  }

  return (
    <section className="flex h-full flex-col gap-6 p-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Meetings</h1>
        <p className="text-muted-foreground text-sm">
          Record + transcribe meetings. Click any meeting to view its
          recording, transcript, and AI summary.
        </p>
      </header>
      <MeetingsTable workspaceId={active.workspace.id} initialData={meetings} />
    </section>
  );
}
