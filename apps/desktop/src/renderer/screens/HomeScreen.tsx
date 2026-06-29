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
  onStartMeeting: (meetingId: string, meetingTitle: string) => void;
}

export function HomeScreen({ onSignedOut, onStartMeeting }: HomeScreenProps) {
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

  // Global ⌥⌘M from the home screen: kick off the same flow the
  // "Start a meeting" button does — saves a click when the menubar
  // icon is the user's primary surface.
  useEffect(() => {
    return window.octofocus.shortcuts.onToggleCapture(() => {
      void handleCreateMeeting();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  const handleCreateMeeting = async () => {
    if (!activeWorkspace) return;
    setBusy(true);
    try {
      const title = `Meeting ${new Date().toLocaleString()}`;
      const meeting = await createMeeting(activeWorkspace.id, { title });
      // Hand off to the capture screen — meeting row is now live in
      // the API, ready to receive audio + transcript.
      onStartMeeting(meeting.id, title);
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
              className="bg-foreground text-background rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {busy ? "Starting…" : "● Start a meeting"}
            </button>
            {lastCreated && lastCreated.startsWith("Error") ? (
              <p className="text-destructive font-mono text-[11px]">{lastCreated}</p>
            ) : null}
            <p className="text-muted-foreground/60 mt-6 max-w-sm text-[11px] leading-relaxed">
              Mic-only capture in PR3. System audio (the other side of the
              call) lands in PR5 via the Swift sidecar.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
