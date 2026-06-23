"use client";

/**
 * Final hop of the CLI bridge.
 *
 * The /cli/connect server action redirects here with the token in the
 * URL fragment (#cb=…&state=…&token=…&email=…). Fragments are NOT sent
 * to the server — only this client component reads them, then fetches
 * the local CLI loopback via `mode: 'no-cors'` so the token never
 * appears in any access log along the way.
 */
import { Focus } from "lucide-react";
import { useEffect, useState } from "react";

type Status =
  | { kind: "loading" }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string };

export default function CliRelayPage() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    const fragment = window.location.hash.replace(/^#/, "");
    if (!fragment) {
      setStatus({ kind: "error", message: "Missing relay payload. Re-run `octofocus login`." });
      return;
    }

    const params = new URLSearchParams(fragment);
    const cb = params.get("cb");
    const state = params.get("state");
    const token = params.get("token");
    const email = params.get("email") ?? "";

    if (!cb || !state || !token) {
      setStatus({
        kind: "error",
        message: "Relay payload is incomplete. Re-run `octofocus login`.",
      });
      return;
    }

    let cbUrl: URL;
    try {
      cbUrl = new URL(cb);
    } catch {
      setStatus({ kind: "error", message: "Invalid loopback URL in relay payload." });
      return;
    }
    if (
      cbUrl.protocol !== "http:" ||
      (cbUrl.hostname !== "127.0.0.1" && cbUrl.hostname !== "localhost")
    ) {
      setStatus({
        kind: "error",
        message: "Loopback URL must be 127.0.0.1 or localhost.",
      });
      return;
    }

    const target = `${cb}?state=${encodeURIComponent(state)}&token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // Clear the fragment so a back-button + refresh can't re-send the token.
    if (window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    fetch(target, { mode: "no-cors", method: "GET" })
      .then(() => setStatus({ kind: "done", email }))
      .catch(() => setStatus({ kind: "done", email }));
  }, []);

  return (
    <main className="bg-background relative flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md">
            <Focus className="size-3.5" strokeWidth={2.25} />
          </div>
          <div className="text-xl font-medium tracking-tight">OctoFocusAI</div>
        </div>

        {status.kind === "loading" && (
          <div className="flex flex-col gap-2">
            <h1 className="text-foreground text-lg font-medium">Sending token to your CLI…</h1>
            <p className="text-muted-foreground text-sm">
              This takes a moment.
            </p>
          </div>
        )}

        {status.kind === "done" && (
          <div className="flex flex-col gap-2">
            <h1 className="text-foreground text-lg font-medium">You can close this tab</h1>
            <p className="text-muted-foreground text-sm">
              Your CLI is signed in
              {status.email ? (
                <>
                  {" "}as <span className="font-medium">{status.email}</span>
                </>
              ) : null}
              . Return to your terminal.
            </p>
          </div>
        )}

        {status.kind === "error" && (
          <div className="flex flex-col gap-2">
            <h1 className="text-foreground text-lg font-medium">Bridge failed</h1>
            <p className="text-muted-foreground text-sm">{status.message}</p>
          </div>
        )}
      </div>
    </main>
  );
}
