/**
 * Resource-share invite acceptance.
 *
 * Email invites point at `/invite/<shareId>`. Server-side flow:
 *   - not logged in:    show "Sign in to continue" — the link in the
 *                       email + the same browser session is enough to
 *                       resume after login
 *   - logged in:        attempt POST /share/accept and show result
 *
 * Workspace-level invites (workspace_invites) don't need this page;
 * they're auto-claimed on the next /me call.
 */
import { ArrowRight, Check, Focus, LogIn, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptResourceShareApi } from "@/api/share-accept-api";
import { AuthBackdrop } from "@/app/(auth)/_components/auth-backdrop";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default async function InviteAcceptPage({ params }: PageProps) {
  const { shareId } = await params;

  if (!env.DEV_AUTH_BYPASS) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return <NotLoggedIn />;
    }
  }

  let outcome: "accepted" | { error: string };
  try {
    await acceptResourceShareApi(shareId);
    outcome = "accepted";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not accept invite.";
    outcome = { error: message };
  }

  if (outcome === "accepted") {
    redirect("/app");
  }

  return <FailedInvite message={outcome.error} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background relative flex min-h-svh flex-col items-center overflow-hidden p-6 md:p-10">
      <AuthBackdrop />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 pt-[380px] pb-12">
        <div className="text-foreground flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md">
              <Focus className="size-3.5" strokeWidth={2.25} />
            </div>
            <div className="text-xl font-medium tracking-tight">OctoFocusAI</div>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card flex w-full flex-col items-center gap-4 rounded-xl border p-6 text-center shadow-sm">
      {children}
    </div>
  );
}

function NotLoggedIn() {
  return (
    <Shell>
      <Card>
        <div className="bg-secondary text-secondary-foreground grid size-10 place-items-center rounded-md">
          <LogIn className="size-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight">Sign in to accept</h1>
          <p className="text-muted-foreground text-sm">
            You need to be signed in with the email this invite was sent to.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/login">
            Sign in
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <p className="text-muted-foreground text-xs">
          After signing in, open the invite link from your email again to finish accepting.
        </p>
      </Card>
    </Shell>
  );
}

function FailedInvite({ message }: { message: string }) {
  const friendly = message.includes("different email")
    ? "This invite was sent to a different email address. Sign in with the email it was sent to."
    : message.includes("not pending")
      ? "This invite has already been accepted or revoked."
      : message.includes("not found")
        ? "This invite link is no longer valid."
        : message;

  return (
    <Shell>
      <Card>
        <div className="bg-destructive/10 text-destructive grid size-10 place-items-center rounded-md">
          <XCircle className="size-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight">Couldn&apos;t accept invite</h1>
          <p className="text-muted-foreground text-sm">{friendly}</p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/app">
            <Check className="size-4" />
            Go to workspace
          </Link>
        </Button>
      </Card>
    </Shell>
  );
}
