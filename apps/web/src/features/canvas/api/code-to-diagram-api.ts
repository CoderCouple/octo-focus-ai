/**
 * Browser-side fetcher for the code → diagram endpoint. Called from the
 * From-code drawer during a click handler. No `server-only` — this is
 * intentionally in the client bundle.
 */
import { env } from "@/lib/env";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type CodeToDiagramHint =
  | "auto"
  | "architecture"
  | "sequence"
  | "er"
  | "flowchart";

export interface CodeToDiagramRequest {
  code: string;
  hint?: CodeToDiagramHint;
  currentDsl?: string;
}

export interface CodeToDiagramResponse {
  dsl: string;
  detectedKind: "architecture" | "sequence" | "er" | "flowchart";
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

export function codeToDiagramApi(body: CodeToDiagramRequest) {
  return clientFetch<CodeToDiagramResponse>("/canvases/from-code", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
