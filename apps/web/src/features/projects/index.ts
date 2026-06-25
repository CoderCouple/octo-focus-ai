export { ProjectsTable } from "./components/projects-table";
export { ProjectsStats } from "./components/projects-stats";
export { CreateProjectDialog } from "./components/create-project-dialog";
export { deriveProjectsStats } from "./lib/derive-projects-stats";
export type { ProjectsStats as ProjectsStatsModel } from "./lib/derive-projects-stats";
export {
  createProjectAction,
  deleteProjectAction,
  getProjectAction,
  listProjectsAction,
  renameProjectAction,
} from "./actions/projects-actions";
// Server-only api fetchers are NOT re-exported here — barrel must stay
// client-safe. RSCs import directly from `./api/projects-api`.
export {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useRenameProject,
} from "./hooks/use-projects";
export { projectKeys } from "./constants";
export type { Project, ProjectCreate, ProjectUpdate } from "./types";
