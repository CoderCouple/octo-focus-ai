import type { CreatorSummary, Visibility } from "@octofocus/shared";

export type { CreatorSummary, Visibility };

export type ComponentLanguage = "html" | "tsx";

export interface SavedComponent {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  code: string;
  language: ComponentLanguage;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  creator?: CreatorSummary | null;
  sharedCount?: number;
}

export interface WorkspaceComponentSummary {
  id: string;
  title: string;
  description: string | null;
  language: ComponentLanguage;
  visibility: Visibility;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  creator: CreatorSummary | null;
  sharedCount: number;
}

/** Public payload returned by `GET /v1/public/components/:id`. */
export interface PublicComponent {
  id: string;
  title: string;
  code: string;
  language: ComponentLanguage;
  visibility: Visibility;
}

export interface SavedComponentCreate {
  title?: string;
  description?: string | null;
  code: string;
  language?: ComponentLanguage;
}

export interface SavedComponentUpdate {
  title?: string;
  description?: string | null;
  code?: string;
  language?: ComponentLanguage;
}
