import "server-only";
import { serverApiFetch } from "./server-client";

export interface MeResponse {
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  memberships: Array<{
    membership: { id: string; role: "OWNER" | "ADMIN" | "MEMBER"; workspaceId: string };
    workspace: { id: string; name: string; slug: string };
  }>;
}

export function getMeApi() {
  return serverApiFetch<MeResponse>("/me");
}
