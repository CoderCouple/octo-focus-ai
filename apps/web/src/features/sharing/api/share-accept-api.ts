import "server-only";
import type { ResourceShare } from "@octofocus/shared";
import { serverApiFetch } from "./server-client";

export function acceptResourceShareApi(shareId: string) {
  return serverApiFetch<ResourceShare>("/share/accept", {
    method: "POST",
    body: JSON.stringify({ shareId }),
  });
}
