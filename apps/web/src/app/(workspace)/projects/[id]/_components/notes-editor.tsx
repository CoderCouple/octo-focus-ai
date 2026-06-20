"use client";

import dynamic from "next/dynamic";

export const NotesEditor = dynamic(
  () => import("./notes-editor-impl").then((m) => m.NotesEditor),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Loading editor…
      </div>
    ),
  },
);
