export const canvasKeys = {
  all: ["canvases"] as const,
  workspaceList: (workspaceId: string) =>
    [...canvasKeys.all, "workspace", workspaceId] as const,
  projectList: (projectId: string) => [...canvasKeys.all, "project", projectId] as const,
  detail: (canvasId: string) => [...canvasKeys.all, "detail", canvasId] as const,
  exports: (canvasId: string) => [...canvasKeys.all, "exports", canvasId] as const,
};

/**
 * Visibility values that count as "Published" in the canvas list filter.
 * Anything else is "Draft".
 */
export const PUBLISHED_VISIBILITIES = new Set(["public", "unlisted"]);
