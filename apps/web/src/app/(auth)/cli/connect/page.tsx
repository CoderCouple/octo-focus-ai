/**
 * Browser → token bridge for `octofocus login`.
 *
 * The CLI opens this page with ?cb=http://127.0.0.1:PORT/cb&state=NONCE.
 * The user (already signed in via their web session) clicks "Authorize",
 * the server action mints a cli_token via the api, and the page
 * redirects to /cli/connect/relay with the plaintext token in the URL
 * fragment. The fragment never reaches the server — only the relay's
 * client-side JS reads it and POSTs to the loopback.
 */
import { Focus } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authorizeCliAction } from "./actions";

interface PageProps {
  searchParams: Promise<{
    cb?: string;
    state?: string;
  }>;
}

const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost"]);

export default async function CliConnectPage({ searchParams }: PageProps) {
  const { cb, state } = await searchParams;

  const validation = validateCallback(cb, state);
  if (!validation.ok) {
    return <Screen title="Invalid CLI link" body={validation.reason} />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const here = `/cli/connect?cb=${encodeURIComponent(validation.cb)}&state=${encodeURIComponent(validation.state)}`;
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }

  const cbDisplay = new URL(validation.cb);

  return (
    <Screen
      title="Authorize OctoFocusAI CLI"
      body={`This will create a new CLI token under your account and send it to your local CLI listening on ${cbDisplay.host}.`}
    >
      <div className="border-border bg-muted/30 w-full rounded-md border px-4 py-3 text-left">
        <p className="text-muted-foreground mb-1 text-xs">Signed in as</p>
        <p className="text-foreground text-sm font-medium">{user.email}</p>
        <p className="text-muted-foreground mt-3 mb-1 text-xs">
          Token will be sent to
        </p>
        <p className="text-foreground font-mono text-xs break-all">
          {validation.cb}
        </p>
      </div>

      <form
        action={authorizeCliAction}
        className="flex w-full flex-col gap-2"
      >
        <input type="hidden" name="cb" value={validation.cb} />
        <input type="hidden" name="state" value={validation.state} />
        <Button type="submit" className="w-full">
          Authorize
        </Button>
      </form>

      <p className="text-muted-foreground text-xs">
        Didn&apos;t open this in the OctoFocusAI CLI? Close this tab. No token will be created.
      </p>
    </Screen>
  );
}

interface ValidCallback {
  ok: true;
  cb: string;
  state: string;
}
interface InvalidCallback {
  ok: false;
  reason: string;
}

function validateCallback(
  cb: string | undefined,
  state: string | undefined,
): ValidCallback | InvalidCallback {
  if (!cb || !state) {
    return { ok: false, reason: "The CLI sign-in link is incomplete." };
  }
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(state)) {
    return { ok: false, reason: "The CLI sign-in link's state nonce is malformed." };
  }
  let parsed: URL;
  try {
    parsed = new URL(cb);
  } catch {
    return { ok: false, reason: "The CLI callback URL is not a valid URL." };
  }
  if (parsed.protocol !== "http:") {
    return { ok: false, reason: "CLI callback must use http:// (loopback)." };
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return {
      ok: false,
      reason: `CLI callback host must be 127.0.0.1 or localhost (got "${parsed.hostname}").`,
    };
  }
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return { ok: false, reason: "CLI callback port must be between 1024 and 65535." };
  }
  if (parsed.pathname !== "/cb") {
    return { ok: false, reason: "CLI callback path must be /cb." };
  }
  return { ok: true, cb, state };
}

interface ScreenProps {
  title: string;
  body: string;
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
