import type {
  CreatorSummary,
  Page,
  PageCreate,
  PageUpdate,
  Visibility,
} from "@octofocus/shared";

export type { CreatorSummary, Page, PageCreate, PageUpdate, Visibility };

/**
 * Row shape returned by `GET /workspaces/:id/pages` — joined with project
 * name so the workspace-level table doesn't need a second roundtrip per row.
 */
export interface WorkspacePageSummary {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  contentMd: string;
  publicSlug: string | null;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  creator: CreatorSummary | null;
  sharedCount: number;
}
