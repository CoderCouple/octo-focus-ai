"use client";

import { Focus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;

    setStatus({ kind: "sending" });
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({ kind: "sent", email });
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Focus className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              <div className="text-sm font-semibold">OctoFocusAI</div>
              <div className="text-xs text-muted-foreground">Human + AI workspace</div>
            </div>
          </div>
          {status.kind === "sent" ? (
            <>
              <CardTitle>Check your inbox</CardTitle>
              <CardDescription>
                We sent a magic link to <strong>{status.email}</strong>. Open it on this device to
                sign in.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Enter your email and we&apos;ll send a one-time link.
              </CardDescription>
            </>
          )}
        </CardHeader>

        {status.kind !== "sent" && (
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={status.kind === "sending"}
                />
              </div>
              <Button type="submit" disabled={status.kind === "sending" || !email}>
                {status.kind === "sending" ? "Sending…" : "Send magic link"}
              </Button>
              {status.kind === "error" && (
                <p className="text-xs text-destructive">{status.message}</p>
              )}
            </form>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
