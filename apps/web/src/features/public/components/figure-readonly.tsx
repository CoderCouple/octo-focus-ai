"use client";

import dynamic from "next/dynamic";

/**
 * Client-side lazy wrapper around `FigureReadOnlyImpl` — same
 * pattern OctoCanvas uses. Tldraw touches `window`/`canvas` at mount,
 * so eagerly importing it from server-rendered surfaces (the
 * `/f/<id>` Server Component, the notes editor bundle on project
 * pages) ships tldraw into chunks that don't have a window yet and
 * blows the webpack module graph up with
 * `Cannot read properties of undefined (reading 'call')`.
 *
 * `ssr: false` makes Next.js skip the implementation on the server
 * entirely; the client bundle defers `import("./figure-readonly-impl")`
 * until the component actually renders.
 */
export const FigureReadOnly = dynamic(
  () => import("./figure-readonly-impl").then((m) => m.FigureReadOnlyImpl),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Loading figure…
      </div>
    ),
  },
);

export type { FigureReadOnlyImplProps as FigureReadOnlyProps } from "./figure-readonly-impl";
