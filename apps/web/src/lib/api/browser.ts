import { env } from "../env";
import { createSupabaseBrowserClient } from "../supabase/browser";

export async function browserApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (session) {
    headers.set("authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${env.API_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // ignore
    }
    throw new Error(`OctoFocusAI API ${path} ${response.status}: ${detail}`);
  }

  return (await response.json()) as T;
}
