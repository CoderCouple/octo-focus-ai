export { ProjectsPanel } from "./components/projects-panel";
export { ProjectCard } from "./components/project-card";
export { CreateProjectDialog } from "./components/create-project-dialog";
export {
  addCanvasToProjectAction,
  addNoteToProjectAction,
  createCanvasProjectAction,
  createNoteProjectAction,
  createProjectAction,
  createProjectWithBothAction,
  deleteProjectAction,
  getProjectAction,
  listProjectsAction,
  renameProjectAction,
} from "./actions/projects-actions";
// Server-only api fetchers are NOT re-exported here — barrel must stay
// client-safe. RSCs import directly from `./api/projects-api`.
export {
  useCreateProject,
  useCreateProjectShape,
  useDeleteProject,
  useProjects,
  useRenameProject,
} from "./hooks/use-projects";
export type { ProjectShape } from "./hooks/use-projects";
export { projectKeys } from "./constants";
export type { Project, ProjectCreate, ProjectUpdate } from "./types";
