/**
 * Loopback bridge for `octofocus login`.
 *
 * The CLI starts an HTTP listener on 127.0.0.1:<random-port>, then asks
 * Supabase to email a magic-link whose redirect_to is this page with
 * ?state=<nonce>&cli_port=<port>. Supabase appends ?code=<auth-code>
 * after verifying the link. This page validates the params, then relays
 * the code back to the loopback via a no-cors fetch; the CLI exchanges
 * the code for a session locally (PKCE flow keeps the code_verifier in
 * the CLI process, never in this browser tab).
 */
import { Focus } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    state?: string;
    cli_port?: string;
    code?: string;
    error?: string;
    error_description?: string;
  }>;
}

export default async function CliCallbackPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { state, cli_port, code, error, error_description } = params;

  if (error) {
    return (
      <Screen
        title="Sign-in failed"
        body={error_description ?? error}
        tone="error"
      />
    );
  }

  if (!state || !cli_port || !code) {
    return (
      <Screen
        title="Missing parameters"
        body="This sign-in link is incomplete or expired. Re-run `octofocus login` to start over."
        tone="error"
      />
    );
  }

  const portNum = Number(cli_port);
  if (!Number.isInteger(portNum) || portNum < 1024 || portNum > 65535) {
    return (
      <Screen
        title="Invalid CLI port"
        body="The sign-in link references a port outside the valid range. Re-run `octofocus login`."
        tone="error"
      />
    );
  }

  // state and code are URL-encoded for safety even though they should be
  // hex / Supabase-issued strings already.
  const loopbackUrl = `http://127.0.0.1:${portNum}/cb?state=${encodeURIComponent(state)}&code=${encodeURIComponent(code)}`;

  // Defense in depth: escape `<` in case anything slips through into the
  // inline script.
  const safeUrl = JSON.stringify(loopbackUrl).replace(/</g, "\\u003c");

  const script = `
    (function () {
      var statusEl = document.getElementById("cli-status");
      var doneEl = document.getElementById("cli-done");
      fetch(${safeUrl}, { mode: "no-cors" })
        .then(function () { show(); })
        .catch(function () { show(); });
      function show() {
        if (statusEl) statusEl.style.display = "none";
        if (doneEl) doneEl.style.display = "block";
        document.title = "You can close this tab — OctoFocusAI";
      }
    })();
  `;

  return (
    <Screen
      title="Returning to your terminal…"
      body="Your CLI is finishing sign-in. This tab can be closed once it confirms."
      tone="default"
    >
      <p id="cli-status" className="text-muted-foreground text-sm">
        Sending session to the local CLI…
      </p>
      <p
        id="cli-done"
        className="text-foreground text-sm"
        style={{ display: "none" }}
      >
        Done. You can close this tab.
      </p>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </Screen>
  );
}

interface ScreenProps {
  title: string;
  body: string;
  tone: "default" | "error";
  children?: React.ReactNode;
}

function Screen({ title, body, children }: ScreenProps) {
  return (
    <main className="bg-background relative flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md">
            <Focus className="size-3.5" strokeWidth={2.25} />
          </div>
          <div className="text-xl font-medium tracking-tight">OctoFocusAI</div>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-foreground text-lg font-medium">{title}</h1>
          <p className="text-muted-foreground text-sm">{body}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
