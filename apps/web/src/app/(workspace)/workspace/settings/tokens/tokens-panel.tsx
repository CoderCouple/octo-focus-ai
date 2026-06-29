"use client";

import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Input } from "@/components/ui/input";
import {
  createTokenAction,
  listTokensAction,
  revokeTokenAction,
  type CliToken,
  type CliTokenCreated,
} from "./actions";

/**
 * Developer / desktop tokens UI. Creates one-time-displayed API
 * tokens (`oft_…`) that the desktop app (and any future CLI) uses
 * for Bearer auth. The plaintext appears once on creation, behind a
 * blocker that forces the user to acknowledge they've copied it
 * before it disappears.
 */
export function TokensPanel() {
  const [tokens, setTokens] = useState<CliToken[] | null>(null);
  const [draftName, setDraftName] = useState("Desktop");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<CliTokenCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const res = await listTokensAction();
    if (res.success && res.data) {
      setTokens(res.data);
    } else if (res.message) {
      toast.error(res.message);
    }
  }

  async function handleCreate() {
    const name = draftName.trim() || "Untitled token";
    setCreating(true);
    try {
      const res = await createTokenAction(name);
      if (res.success && res.data) {
        setJustCreated(res.data);
        setDraftName("Desktop");
        await refresh();
      } else if (res.message) {
        toast.error(res.message);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.plaintext);
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy automatically — select and copy manually.");
    }
  }

  async function handleRevoke(id: string) {
    const res = await revokeTokenAction(id);
    if (res.success) {
      toast.success("Token revoked.");
      await refresh();
    } else if (res.message) {
      toast.error(res.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Developer tokens</h2>
        <p className="text-muted-foreground text-sm">
          Used by the OctoFocusAI desktop app (and any future CLI) to
          authenticate from outside the browser. Treat each token like a
          password — stored in your macOS Keychain on the desktop side.
        </p>
      </div>

      {/* Create new token */}
      <div className="bg-card space-y-3 rounded-lg border p-4">
        <label className="text-sm font-medium">Generate a new token</label>
        <div className="flex gap-2">
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="e.g. Desktop, MacBook Pro"
            className="flex-1"
            disabled={creating}
          />
          <Button onClick={() => void handleCreate()} disabled={creating}>
            {creating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <KeyRound className="size-3.5" />
            )}
            Generate
          </Button>
        </div>
      </div>

      {/* List existing tokens */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Active tokens</h3>
        {tokens === null ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : tokens.filter((t) => !t.revokedAt).length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No active tokens yet. Generate one above.
          </p>
        ) : (
          <ul className="bg-card divide-y rounded-lg border">
            {tokens
              .filter((t) => !t.revokedAt)
              .map((token) => (
                <li
                  key={token.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-medium">{token.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {token.tokenPreview} · created{" "}
                      {new Date(token.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmRevokeId(token.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Revoke
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* One-shot reveal dialog after creation */}
      {justCreated ? (
        <div className="bg-card space-y-3 rounded-lg border border-foreground/30 p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4" />
            <p className="text-sm font-semibold">Copy this token now</p>
          </div>
          <p className="text-muted-foreground text-xs">
            It will only be shown once. Paste it into the OctoFocusAI desktop
            app or your CLI. If you lose it, revoke it and generate a new one.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={justCreated.plaintext}
              className="font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <Button onClick={() => void handleCopy()}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setJustCreated(null)}
            className="w-full"
          >
            I've saved it — dismiss
          </Button>
        </div>
      ) : null}

      {/* Revoke confirmation */}
      <ConfirmActionDialog
        open={confirmRevokeId !== null}
        onOpenChange={(o) => !o && setConfirmRevokeId(null)}
        title="Revoke this token?"
        description="Any device using this token will lose access immediately. The OctoFocusAI desktop app will prompt for a new token on its next API call."
        actionLabel="Revoke token"
        onConfirm={() => {
          if (confirmRevokeId) void handleRevoke(confirmRevokeId);
        }}
      />
    </div>
  );
}
