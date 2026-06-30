/**
 * Token-onboarding screen. Shown when no API token is stored in the
 * keychain. The user pastes a token from
 * `https://www.octofocus.ai/workspace/settings → CLI tokens`, we
 * verify it by hitting `/me`, then hand the user off to HomeScreen.
 */
import { useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { getMe } from "../lib/api";

interface OnboardingScreenProps {
  onSignedIn: () => void;
}

export function OnboardingScreen({ onSignedIn }: OnboardingScreenProps) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    // Hard validate the token shape BEFORE storing or sending. A
    // password input can accept characters the API (and `fetch`'s
    // ByteString header conversion) rejects — bullets pasted from
    // the masked display, RTL characters, smart quotes, etc.
    if (!/^oft_[A-Za-z0-9_-]+$/.test(trimmed)) {
      setError(
        "That doesn't look like a token. Expect `oft_` followed by letters, numbers, `_`, or `-`. Re-copy from the website and try again.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Store first so getMe() (which reads from keychain) sees it.
      await window.octofocus.token.set(trimmed);
      // Verify by round-tripping a cheap auth'd call.
      await getMe();
      setToken("");
      onSignedIn();
    } catch (err) {
      // Roll back so the renderer doesn't hold a bad credential.
      await window.octofocus.token.clear();
      setError(err instanceof Error ? err.message : "Token verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center px-8">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="bg-foreground text-background mx-auto flex size-12 items-center justify-center rounded-2xl">
            <span className="text-base font-bold">OF</span>
          </div>
          <h1 className="text-xl font-semibold">Connect OctoFocusAI</h1>
          <p className="text-muted-foreground text-sm">
            Paste an API token to link this Mac to your workspace.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            // Plain text so you can see what's in the field. The
            // token shows clearly in your own machine; no need to
            // mask it from yourself.
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="oft_…"
            autoFocus
            spellCheck={false}
            className="border-border bg-card w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus:border-foreground/40"
          />
          {error ? (
            <p className="text-destructive bg-destructive/10 rounded px-3 py-2 text-xs">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || token.trim().length === 0}
            className="bg-foreground text-background w-full rounded-md py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Continue"}
          </button>
        </form>
        <p className="text-muted-foreground/70 text-center text-[11px]">
          Generate a token at{" "}
          <a
            href="https://www.octofocus.ai/workspace/settings"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            www.octofocus.ai/workspace/settings
          </a>
          . Stored in your macOS Keychain.
        </p>
      </div>
    </div>
  );
}
