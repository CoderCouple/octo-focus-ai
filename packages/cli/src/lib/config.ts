import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const CONFIG_DIR = process.env.OCTOFOCUS_CONFIG_DIR ?? join(homedir(), ".octofocus");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_API_URL = "http://localhost:4000";
const DEFAULT_SUPABASE_URL =
  process.env.OCTOFOCUS_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEFAULT_SUPABASE_ANON_KEY =
  process.env.OCTOFOCUS_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export interface CliSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string | null;
}

export interface CliConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  defaultWorkspaceId: string | null;
  session: CliSession | null;
}

const DEFAULT_CONFIG: CliConfig = {
  apiUrl: process.env.OCTOFOCUS_API_URL ?? DEFAULT_API_URL,
  supabaseUrl: DEFAULT_SUPABASE_URL,
  supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
  defaultWorkspaceId: null,
  session: null,
};

let cached: CliConfig | null = null;

export async function loadConfig(): Promise<CliConfig> {
  if (cached) return cached;
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<CliConfig>;
    cached = { ...DEFAULT_CONFIG, ...parsed };
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
