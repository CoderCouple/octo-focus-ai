import "server-only";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrapBaseResponse } from "./base-response";

export async function serverApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = await createSupabaseServerClient();
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

  const response = await fetch(`${env.API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "") || `${response.status}`;
    throw new Error(`OctoFocusAI API ${path} ${response.status}: ${message}`);
  }

  return unwrapBaseResponse<T>(body, path);
}
