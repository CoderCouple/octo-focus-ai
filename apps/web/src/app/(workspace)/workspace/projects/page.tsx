import {
  deriveProjectsStats,
  ProjectsStats,
  ProjectsTable,
} from "@/features/projects";
import { listProjectsApi } from "@/features/projects/api/projects-api";
import {
  getActiveWorkspaceIdCookie,
  resolveActiveMembership,
} from "@/features/workspaces";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

export default async function ProjectsPage() {
  const me = await getMeApi();
  const activeId = await getActiveWorkspaceIdCookie();
  const active = resolveActiveMembership(me.memberships, activeId);
  if (!active) return null;
  const workspaceId = active.workspace.id;

  const projects = await listProjectsApi(workspaceId);
  const stats = deriveProjectsStats(projects);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <ProjectsStats stats={stats} />
          <ProjectsTable workspaceId={workspaceId} initialData={projects} />
        </div>
      </div>
    </div>
  );
}
