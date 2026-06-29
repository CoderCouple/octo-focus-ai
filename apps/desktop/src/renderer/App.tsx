import { useEffect, useState } from "react";
import { HomeScreen } from "./screens/HomeScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";

type AuthState = "loading" | "signed-out" | "signed-in";

/**
 * Top-level desktop router — single source of truth for the auth
 * state, routes between OnboardingScreen and HomeScreen. The token
 * lives in the macOS Keychain (via keytar in the main process); the
 * renderer just observes presence/absence via the bridge.
 */
export function App() {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    window.octofocus.token
      .get()
      .then((token) => setState(token ? "signed-in" : "signed-out"))
      .catch(() => setState("signed-out"));
  }, []);

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }
  if (state === "signed-out") {
    return <OnboardingScreen onSignedIn={() => setState("signed-in")} />;
  }
  return <HomeScreen onSignedOut={() => setState("signed-out")} />;
}
