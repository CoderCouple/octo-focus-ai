import { createSupabaseServerClient } from "./supabase/server";
import { env } from "./env";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (session) {
    headers.set("authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${env.API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OctoFocusAI API ${path} failed: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}
