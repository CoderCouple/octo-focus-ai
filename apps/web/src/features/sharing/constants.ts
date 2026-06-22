import type { SharePermission, Visibility } from "./types";

export const shareKeys = {
  all: ["shares"] as const,
  shares: (kind: string, id: string) => [...shareKeys.all, "shares", kind, id] as const,
  links: (kind: string, id: string) => [...shareKeys.all, "links", kind, id] as const,
};

export const PERMISSION_LABEL: Record<SharePermission, string> = {
  viewer: "Viewer",
  commenter: "Commenter",
  editor: "Editor",
  admin: "Admin",
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: "Private",
  workspace: "Workspace",
  unlisted: "Anyone with link",
  public: "Public",
};
