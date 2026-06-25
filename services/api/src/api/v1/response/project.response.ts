import type { CreatorSummary, Project, Visibility } from "../../../model/project.model";

export interface CreatorDto {
  id: string;
  name: string;
  email: string;
}

export interface ProjectDto {
  id: string;
  workspaceId: string;
  createdByUserId: string;
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
  hasNote?: boolean;
  hasCanvas?: boolean;
  creator?: CreatorDto | null;
  sharedCount?: number;
}

export function projectToDto(project: Project): ProjectDto {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    createdByUserId: project.createdByUserId,
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
    ...(project.hasNote !== undefined ? { hasNote: project.hasNote } : {}),
    ...(project.hasCanvas !== undefined ? { hasCanvas: project.hasCanvas } : {}),
    ...(project.creator !== undefined ? { creator: project.creator as CreatorDto | null } : {}),
    ...(project.sharedCount !== undefined ? { sharedCount: project.sharedCount } : {}),
  };
}

// Helper so callers (services that don't currently surface CreatorSummary)
// can convert when needed without importing the model.
export function creatorToDto(c: CreatorSummary): CreatorDto {
  return { id: c.id, name: c.name, email: c.email };
}
