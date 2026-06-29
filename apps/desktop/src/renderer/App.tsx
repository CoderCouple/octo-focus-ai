/**
 * OctoFocusAI desktop — renderer entry. Placeholder UI for PR1;
 * PR2 swaps the body for the token onboarding screen, PR3 for the
 * live capture view.
 */
export function App() {
  const versions = window.octofocus?.versions;
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background">
        <span className="text-xl font-bold">OF</span>
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">OctoFocusAI Desktop</h1>
        <p className="text-muted-foreground text-sm">
          Meeting listener — scaffold ready. Capture flow ships in PR3.
        </p>
      </div>
      {versions ? (
        <pre className="text-muted-foreground/70 font-mono text-[10px] leading-relaxed">
          electron {versions.electron} · chrome {versions.chrome} · node {versions.node}
        </pre>
      ) : null}
    </div>
  );
}
