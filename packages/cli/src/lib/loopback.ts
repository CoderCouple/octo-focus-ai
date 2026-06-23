/**
 * One-shot loopback HTTP server for the browser → token bridge.
 *
 * Bind to 127.0.0.1:0 (kernel-assigned port). The web app's
 * /cli/connect/relay client fetches
 * http://127.0.0.1:<port>/cb?state=<nonce>&token=<oft_…>&email=<…>.
 * We validate the state matches what we minted, surface the token to
 * the awaiter, and shut down.
 *
 * Bound to loopback only — never reachable off the host.
 */
import { createServer, type Server } from "node:http";

export interface LoopbackResult {
  token: string;
  email: string | null;
}

export interface LoopbackHandle {
  port: number;
  resultPromise: Promise<LoopbackResult>;
  close(): void;
}

export interface StartLoopbackOptions {
  expectedState: string;
  /** Defaults to 5 minutes. */
  timeoutMs?: number;
}

export function startLoopback({
  expectedState,
  timeoutMs = 5 * 60 * 1000,
}: StartLoopbackOptions): Promise<LoopbackHandle> {
  return new Promise((resolveHandle, rejectHandle) => {
    let resolveResult: (r: LoopbackResult) => void = () => undefined;
    let rejectResult: (e: Error) => void = () => undefined;
    const resultPromise = new Promise<LoopbackResult>((res, rej) => {
      resolveResult = res;
      rejectResult = rej;
    });

    const server: Server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const respond = (status: number, body: string) => {
        res.writeHead(status, {
          "content-type": "text/plain; charset=utf-8",
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "cache-control": "no-store",
        });
        res.end(body);
      };

      if (req.method === "OPTIONS") return respond(204, "");
      if (url.pathname !== "/cb") return respond(404, "not found");

      const state = url.searchParams.get("state");
      const token = url.searchParams.get("token");
      const email = url.searchParams.get("email");
      if (!state || state !== expectedState) return respond(400, "state mismatch");
      if (!token) return respond(400, "missing token");

      respond(200, "OK — you can close this browser tab.");
      resolveResult({ token, email: email ?? null });
    });

    server.on("error", (err) => {
      rejectHandle(err);
      rejectResult(err);
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        rejectHandle(new Error("loopback listen failed"));
        return;
      }

      const timeoutHandle = setTimeout(() => {
        rejectResult(
          new Error(
            `Login timed out after ${Math.round(timeoutMs / 1000)}s — no token was received from the browser.`,
          ),
        );
        server.close();
      }, timeoutMs);

      resolveHandle({
        port: addr.port,
        resultPromise: resultPromise.finally(() => clearTimeout(timeoutHandle)),
        close: () => server.close(),
      });
    });
  });
}
