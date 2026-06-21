"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SharePasswordGate({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mx-auto mt-20 flex w-full max-w-sm flex-col gap-4 px-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!password) {
          setError("Enter the password.");
          return;
        }
        // Re-fetch the page with pw param. Server component re-runs.
        router.replace(`/share/${token}?pw=${encodeURIComponent(password)}`);
      }}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Password required</h1>
        <p className="text-muted-foreground text-sm">
          The owner protected this share link with a password.
        </p>
      </div>
      <Input
        type="password"
        autoFocus
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <Button type="submit">Unlock</Button>
    </form>
  );
}
