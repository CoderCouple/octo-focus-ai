"use client";

import dynamic from "next/dynamic";

export const NotesDemo = dynamic(
  () => import("./notes-demo-impl").then((m) => m.NotesDemo),
  {
    ssr: false,
    loading: () => (
      <div className="border-border/60 bg-card/40 grid h-[420px] place-items-center rounded-2xl border text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);
