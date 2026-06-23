"use server";

import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/api/server-fetch";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost"]);

interface CliTokenCreatedDto {
  id: string;
  userId: string;
  name: string;
  tokenPreview: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  plaintext: string;
}

export async function authorizeCliAction(formData: FormData): Promise<void> {
  const cb = String(formData.get("cb") ?? "");
  const state = String(formData.get("state") ?? "");

  // Validate cb again server-side — never trust the client form.
  let parsed: URL;
  try {
    parsed = new URL(cb);
  } catch {
    redirect("/cli/connect?error=invalid_callback");
  }
  if (
    parsed.protocol !== "http:" ||
    !ALLOWED_HOSTS.has(parsed.hostname) ||
    parsed.pathname !== "/cb"
  ) {
    redirect("/cli/connect?error=invalid_callback");
  }
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    redirect("/cli/connect?error=invalid_callback");
  }
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(state)) {
    redirect("/cli/connect?error=invalid_state");
  }

  // Require an authenticated session — middleware doesn't gate /cli/connect.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const created = await serverFetch<CliTokenCreatedDto>("/me/cli-tokens", {
    method: "POST",
    body: JSON.stringify({ name: "CLI (browser)" }),
  });

  const hash = new URLSearchParams({
    cb,
    state,
    token: created.plaintext,
    email: user.email ?? "",
  }).toString();

  redirect(`/cli/connect/relay#${hash}`);
}
