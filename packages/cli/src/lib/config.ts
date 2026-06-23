import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const CONFIG_DIR = process.env.OCTOFOCUS_CONFIG_DIR ?? join(homedir(), ".octofocus");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

// Production defaults — what an npm-installed CLI talks to out of the box.
// Local dev callers override with --api-url / --web-url or env vars.
const DEFAULT_API_URL = "https://api.octofocus.ai";
const DEFAULT_WEB_ORIGIN = "https://www.octofocus.ai";

export interface CliSession {
  accessToken: string;
  email: string | null;
}

export interface CliConfig {
  apiUrl: string;
  webOrigin: string;
  defaultWorkspaceId: string | null;
  session: CliSession | null;
}

const DEFAULT_CONFIG: CliConfig = {
  apiUrl: process.env.OCTOFOCUS_API_URL ?? DEFAULT_API_URL,
  webOrigin: process.env.OCTOFOCUS_WEB_URL ?? DEFAULT_WEB_ORIGIN,
  defaultWorkspaceId: null,
  session: null,
};

let cached: CliConfig | null = null;

// Stale URLs from the first published CLI builds, which shipped
// localhost defaults. Migrate them forward silently so users upgrading
// don't have to wipe ~/.octofocus/config.json.
const STALE_API_URLS = new Set(["http://localhost:4000"]);
const STALE_WEB_ORIGINS = new Set(["http://localhost:3000"]);

export async function loadConfig(): Promise<CliConfig> {
  if (cached) return cached;
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<CliConfig> & {
      supabaseUrl?: unknown;
      supabaseAnonKey?: unknown;
      session?: (Partial<CliSession> & { refreshToken?: unknown; expiresAt?: unknown }) | null;
    };

    // Drop legacy Supabase-session fields if present from CLI <=0.2.x.
    let session: CliSession | null = null;
    if (parsed.session && parsed.session.accessToken) {
      session = {
        accessToken: parsed.session.accessToken,
        email: parsed.session.email ?? null,
      };
    }

    cached = {
      ...DEFAULT_CONFIG,
      ...parsed,
      session,
    };
    if (cached.apiUrl && STALE_API_URLS.has(cached.apiUrl)) {
      cached.apiUrl = DEFAULT_CONFIG.apiUrl;
    }
    if (cached.webOrigin && STALE_WEB_ORIGINS.has(cached.webOrigin)) {
      cached.webOrigin = DEFAULT_CONFIG.webOrigin;
    }
  } catch {
    cached = { ...DEFAULT_CONFIG };
  }
  return cached;
}

export async function saveConfig(patch: Partial<CliConfig>): Promise<CliConfig> {
  const current = await loadConfig();
  const next: CliConfig = { ...current, ...patch };
  await mkdir(dirname(CONFIG_PATH), { recursive: true, mode: 0o700 });
  await writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), { mode: 0o600 });
  cached = next;
  return next;
}

export async function clearSession(): Promise<void> {
  await saveConfig({ session: null });
}

export async function clearConfig(): Promise<void> {
  cached = null;
  await rm(CONFIG_PATH, { force: true });
}

export function configPath(): string {
  return CONFIG_PATH;
}
