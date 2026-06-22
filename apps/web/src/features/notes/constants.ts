export const noteKeys = {
  all: ["notes"] as const,
  workspaceList: (workspaceId: string) =>
    [...noteKeys.all, "workspace", workspaceId] as const,
  projectList: (projectId: string) => [...noteKeys.all, "project", projectId] as const,
  detail: (pageId: string) => [...noteKeys.all, "detail", pageId] as const,
};

/**
 * Visibility values that count as "Published" in the notes list filter.
 * Anything else is "Draft".
 */
export const PUBLISHED_VISIBILITIES = new Set(["public", "unlisted"]);
