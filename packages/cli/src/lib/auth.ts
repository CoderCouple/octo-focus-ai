import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadConfig, saveConfig, type CliSession } from "./config.js";
import { CliError } from "./errors.js";

function buildSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function supabase(): Promise<SupabaseClient> {
  const cfg = await loadConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    throw new CliError(
      "Supabase URL or anon key is not configured.",
      "Set OCTOFOCUS_SUPABASE_URL and OCTOFOCUS_SUPABASE_ANON_KEY in your shell, or run `octofocus configure`.",
    );
  }
  return buildSupabaseClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
}

export async function sendMagicCode(email: string): Promise<void> {
  const client = await supabase();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw new CliError(`Supabase rejected magic-link request: ${error.message}`);
}

export async function verifyMagicCode(email: string, token: string): Promise<CliSession> {
  const client = await supabase();
  const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session) {
    throw new CliError(
      `Verification failed: ${error?.message ?? "no session returned"}`,
      "Codes expire after ~5 minutes. Re-run `octofocus login` for a fresh code.",
    );
  }
  const session: CliSession = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    email: data.user?.email ?? email,
  };
  await saveConfig({ session });
  return session;
}

export async function getValidAccessToken(): Promise<string> {
  const cfg = await loadConfig();
  if (!cfg.session) {
    throw new CliError("Not logged in.", "Run `octofocus login` to authenticate.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (cfg.session.expiresAt - now > 60) return cfg.session.accessToken;

  const client = await supabase();
  const { data, error } = await client.auth.refreshSession({
    refresh_token: cfg.session.refreshToken,
  });
  if (error || !data.session) {
    throw new CliError(
      `Session refresh failed: ${error?.message ?? "no session"}`,
      "Run `octofocus login` again.",
    );
  }
  const refreshed: CliSession = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    email: cfg.session.email,
  };
  await saveConfig({ session: refreshed });
  return refreshed.accessToken;
}
