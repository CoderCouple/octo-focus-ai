import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadConfig, saveConfig, type CliSession } from "./config.js";
import { CliError } from "./errors.js";
import { startLoopback } from "./loopback.js";
import { randomBytes } from "node:crypto";

function buildSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
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

/**
 * Browser-loopback OAuth login.
 *
 * Mints a random state nonce, starts a one-shot HTTP listener on
 * 127.0.0.1:<random-port>, asks Supabase to email a magic link whose
 * redirect lands on apps/web's /cli/callback?state=…&cli_port=…&code=…,
 * waits for the browser to relay the code to the loopback, then
 * exchanges the code for a session.
 *
 * The same Supabase client instance MUST be used for signInWithOtp and
 * exchangeCodeForSession — PKCE keeps the code_verifier in memory on
 * that instance and the exchange will fail without it.
 *
 * @param onPrompt fired once the email has been sent. The caller can
 *   render "check your inbox" UX while awaiting the returned promise.
 */
export async function loginViaBrowser(opts: {
  email: string;
  webOrigin: string;
  onPrompt?: () => void;
}): Promise<CliSession> {
  const client = await supabase();
  const state = randomBytes(16).toString("hex");
  const loopback = await startLoopback({ expectedState: state });

  const base = opts.webOrigin.replace(/\/+$/, "");
  const cliCallback = `${base}/cli/callback?state=${encodeURIComponent(state)}&cli_port=${loopback.port}`;

  const { error: otpError } = await client.auth.signInWithOtp({
    email: opts.email,
    options: { shouldCreateUser: true, emailRedirectTo: cliCallback },
  });
  if (otpError) {
    loopback.close();
    throw new CliError(`Supabase rejected sign-in: ${otpError.message}`);
  }

  opts.onPrompt?.();

  let code: string;
  try {
    const result = await loopback.resultPromise;
    code = result.code;
  } finally {
    loopback.close();
  }

  const { data, error: exError } = await client.auth.exchangeCodeForSession(code);
  if (exError || !data.session) {
    throw new CliError(
      `Failed to exchange code for session: ${exError?.message ?? "no session"}`,
      "Re-run `octofocus login` to try again.",
    );
  }
  const session: CliSession = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    email: data.user?.email ?? opts.email,
  };
  await saveConfig({ session });
  return session;
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
  const envToken = process.env.OCTOFOCUS_TOKEN;
  if (envToken && envToken.length > 0) return envToken;

  const cfg = await loadConfig();
  if (!cfg.session) {
    throw new CliError(
      "Not logged in.",
      "Run `octofocus login` interactively, or set OCTOFOCUS_TOKEN for non-interactive use.",
    );
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
