/**
 * Post-onboarding home screen. PR2 surfaces:
 *   - Active workspace + user email
 *   - "Create test meeting" button (proves auth + the meeting POST works)
 *   - "Sign out" button (clears the token, returns to onboarding)
 *
 * PR3 replaces most of this with the live capture view.
 */
import { useEffect, useState } from "react";
import { createMeeting, getMe, type MeResponse } from "../lib/api";

interface HomeScreenProps {
  onSignedOut: () => void;
}

export function HomeScreen({ onSignedOut }: HomeScreenProps) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((res) => {
        if (alive) setMe(res);
      })
      .catch((err: unknown) => {
        if (alive) setLoadError(err instanceof Error ? err.message : "Load failed.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const activeWorkspace = me?.memberships[0]?.workspace ?? null;

  const handleCreateMeeting = async () => {
    if (!activeWorkspace) return;
    setBusy(true);
    try {
      const meeting = await createMeeting(activeWorkspace.id, {
        title: `Desktop test ${new Date().toLocaleTimeString()}`,
      });
      setLastCreated(meeting.id);
    } catch (err) {
      setLastCreated(`Error: ${err instanceof Error ? err.message : "create failed"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await window.octofocus.token.clear();
    onSignedOut();
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <div className="bg-foreground text-background grid size-6 place-items-center rounded">
            <span className="text-[10px] font-bold">OF</span>
          </div>
          <span className="text-sm font-medium">OctoFocusAI Desktop</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Sign out
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        {loadError ? (
          <p className="text-destructive text-sm">{loadError}</p>
        ) : !me ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-xs uppercase text-muted-foreground tracking-wider">
                Signed in
              </p>
              <p className="text-sm">{me.user.email}</p>
              {activeWorkspace ? (
                <p className="text-muted-foreground text-xs">
                  workspace · {activeWorkspace.name}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void handleCreateMeeting()}
              disabled={busy || !activeWorkspace}
              className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create test meeting"}
            </button>
            {lastCreated ? (
              <p className="text-muted-foreground font-mono text-[11px]">
                {lastCreated.startsWith("Error") ? lastCreated : `Created: ${lastCreated}`}
              </p>
            ) : null}
            <p className="text-muted-foreground/60 mt-8 max-w-sm text-[11px] leading-relaxed">
              Capture flow lands in PR3 — mic + system audio → live transcript →
              auto-summary on stop.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
