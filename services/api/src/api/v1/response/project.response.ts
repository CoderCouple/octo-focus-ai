import type { Project, Visibility } from "../../../model/project.model";

export interface ProjectDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  icon: string | null;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export function projectToDto(project: Project): ProjectDto {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    icon: project.icon,
    publicSlug: project.publicSlug,
    visibility: project.visibility,
    publishedAt: project.publishedAt ? project.publishedAt.toISOString() : null,
    lastPublishedAt: project.lastPublishedAt ? project.lastPublishedAt.toISOString() : null,
    settings: project.settings,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    archivedAt: project.archivedAt ? project.archivedAt.toISOString() : null,
  };
}
