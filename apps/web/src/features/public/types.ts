export interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  publicSlug: string;
  visibility: string;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
}

export interface PageData {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  contentMd: string;
  publicSlug: string;
  visibility: string;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: { font?: "sans" | "serif" | "mono"; lineWidth?: string };
}

export interface CanvasData {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  diagramSchema: unknown;
  publicSlug: string;
  visibility: string;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
}

export type PublicResource =
  | {
      kind: "project";
      workspaceSlug: string;
      data: ProjectData;
      page: PageData | null;
      canvas: CanvasData | null;
    }
  | { kind: "page"; workspaceSlug: string; data: PageData }
  | { kind: "canvas"; workspaceSlug: string; data: CanvasData };

export interface ShareTokenResource {
  kind: "project" | "page" | "canvas";
  permission: "viewer" | "commenter" | "editor" | "admin";
  data: ProjectData | PageData | CanvasData;
}
