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

/**
 * Streaming variant — calls /canvases/from-code/stream and yields
 * incremental output via the callbacks below. Returns the final
 * cleaned DSL on completion.
 *
 * SSE frame shape (matches the controller):
 *   {chunk: "..."}                         repeated per delta
 *   {done: true, dsl: "...", detectedKind} terminal success
 *   {error: "..."}                          terminal failure
 */
export async function streamCodeToDiagramApi(
  body: CodeToDiagramRequest,
  cb: {
    onChunk: (chunk: string) => void;
    /** Receives the cleaned DSL once the stream terminates successfully. */
    onComplete: (dsl: string, detectedKind: CodeToDiagramResponse["detectedKind"]) => void;
    onError: (message: string) => void;
  },
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers({
    "content-type": "application/json",
    accept: "text/event-stream",
  });
  if (session) headers.set("authorization", `Bearer ${session.access_token}`);
  const res = await fetch(`${env.API_URL}/canvases/from-code/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    cb.onError(`Stream failed (${res.status})`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // SSE frames are delimited by `\n\n`.
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = line.slice("data: ".length);
      try {
        const parsed = JSON.parse(payload) as {
          chunk?: string;
          done?: boolean;
          dsl?: string;
          detectedKind?: CodeToDiagramResponse["detectedKind"];
          error?: string;
        };
        if (parsed.error) {
          cb.onError(parsed.error);
          return;
        }
        if (parsed.done && parsed.dsl !== undefined) {
          cb.onComplete(parsed.dsl, parsed.detectedKind ?? "architecture");
          return;
        }
        if (parsed.chunk) cb.onChunk(parsed.chunk);
      } catch {
        // Skip malformed frames; the stream may continue.
      }
    }
  }
}
