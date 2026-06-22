/**
 * Server-side fetch helper for feature `api/` files.
 *
 * Every feature's low-level api module imports `serverFetch` and uses it
 * to hit the OctoFocusAI api. Handles:
 *
 *   - attaching the Supabase JWT (when present) as a Bearer header
 *   - serializing JSON bodies
 *   - unwrapping the BaseResponse envelope into the underlying result
 *   - throwing a clear error string on non-2xx responses
 *
 * Browser-side data fetching is done through hooks → server actions →
 * this function. Client components don't call this directly.
 */
import "server-only";
import { env } from "@/env/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrapBaseResponse } from "./base-response";

export async function serverFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : `${response.status}`;
    throw new Error(`OctoFocusAI API ${path} ${response.status}: ${message}`);
  }

  return unwrapBaseResponse<T>(body, path);
}
