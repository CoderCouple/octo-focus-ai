import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface GenerateComponentRequest {
  prompt: string;
  currentCode?: string;
}

export interface ComponentStreamCallbacks {
  onChunk: (delta: string) => void;
  onDone: (code: string) => void;
  onError: (message: string) => void;
}

/**
 * Browser-side consumer of POST /v1/components/generate/stream. Same
 * SSE shape as the from-code stream: `chunk` deltas, then a single
 * `done` frame with the cleaned full code (fence-stripped server side).
 */
export async function streamGeneratedComponent(
  body: GenerateComponentRequest,
  cb: ComponentStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "text/event-stream",
  };
  if (session) headers.authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`${env.API_URL}/components/generate/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    cb.onError(text || `Server error (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Lines are separated by \n; SSE frames by \n\n.
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!raw.startsWith("data:")) continue;
      const json = raw.slice(5).trim();
      if (!json) continue;
      try {
        const payload = JSON.parse(json) as {
          chunk?: string;
          done?: boolean;
          code?: string;
          error?: string;
        };
        if (payload.error) {
          cb.onError(payload.error);
          return;
        }
        if (payload.done && payload.code !== undefined) {
          cb.onDone(payload.code);
          return;
        }
        if (typeof payload.chunk === "string") {
          cb.onChunk(payload.chunk);
        }
      } catch {
        // Ignore malformed frame; continue reading.
      }
    }
  }
}
