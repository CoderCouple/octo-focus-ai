import { getValidAccessToken } from "./auth.js";
import { loadConfig } from "./config.js";
import { CliError } from "./errors.js";

interface BaseResponse<T> {
  result: T | null;
  statusCode: number;
  message: string;
  success: boolean;
  errorCode?: string;
  extra?: Record<string, unknown>;
}

function isBaseResponse(value: unknown): value is BaseResponse<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "statusCode" in value &&
    "message" in value &&
    "result" in value
  );
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Skip auth — only for unauthenticated routes like /health. */
  anonymous?: boolean;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const cfg = await loadConfig();
  const url = new URL(path.replace(/^\//, ""), withTrailingSlash(cfg.apiUrl));
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (!opts.anonymous) {
    headers.authorization = `Bearer ${await getValidAccessToken()}`;
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const parsed = text.length > 0 ? safeJson(text) : null;

  if (isBaseResponse(parsed)) {
    if (!parsed.success) {
      const tag = parsed.errorCode ? `[${parsed.errorCode}] ` : "";
      throw new CliError(`API ${path} ${parsed.statusCode}: ${tag}${parsed.message}`);
    }
    return parsed.result as T;
  }

  if (!res.ok) {
    throw new CliError(`API ${path} ${res.status}: ${text || res.statusText}`);
  }
  return parsed as T;
}

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : url + "/";
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
