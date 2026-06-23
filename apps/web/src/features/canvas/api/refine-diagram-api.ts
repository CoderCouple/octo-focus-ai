/**
 * Browser-side fetcher for /v1/canvases/refine-diagram. Same pattern as
 * code-to-diagram-api.ts — auth via Supabase JWT, unwrap BaseResponse,
 * throw with the api error message on non-2xx.
 */
import { env } from "@/lib/env";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type RefineDiagramHint =
  | "auto"
  | "architecture"
  | "sequence"
  | "er"
  | "flowchart";

export interface RefineDiagramRequest {
  currentDsl: string;
  instruction: string;
  hint?: RefineDiagramHint;
}

export interface RefineDiagramResponse {
  dsl: string;
}

async function clientFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (session) headers.set("authorization", `Bearer ${session.access_token}`);
  const res = await fetch(`${env.API_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : `${res.status}`;
    throw new Error(`OctoFocusAI API ${path} ${res.status}: ${message}`);
  }
  return unwrapBaseResponse<T>(body, path);
}

export function refineDiagramApi(body: RefineDiagramRequest) {
  return clientFetch<RefineDiagramResponse>("/canvases/refine-diagram", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
