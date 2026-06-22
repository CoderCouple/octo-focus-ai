import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type { ResourceShare } from "../types";

export function acceptResourceShareApi(shareId: string) {
  return serverFetch<ResourceShare>("/share/accept", {
    method: "POST",
    body: JSON.stringify({ shareId }),
  });
}
