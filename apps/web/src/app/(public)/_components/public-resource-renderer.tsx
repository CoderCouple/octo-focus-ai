/**
 * Read-only renderer for public resources.
 *
 *   project → header + description (the project's pages/canvases are not
 *             enumerated yet — published children render at their own URLs)
 *   page    → BlockNote in editable=false mode, with the same custom schema
 *             (Mermaid block etc.) the editor uses
 *   canvas  → tldraw with hideUi + isReadonly + zoomToFit
 */
import type { PublicResource } from "@/api/public-api";
import { CanvasReadOnly } from "./canvas-readonly";
import { NotesReadOnly } from "./notes-readonly";

export function PublicResourceRenderer({ resource }: { resource: PublicResource }) {
  if (resource.kind === "page") {
    const font = resource.data.settings?.font ?? "sans";
    const fontClass =
      font === "serif" ? "font-serif" : font === "mono" ? "font-mono" : "font-sans";
    return (
      <article className={`mx-auto flex h-[calc(100svh-3rem)] max-w-4xl flex-col ${fontClass}`}>
        <header className="px-8 pt-10 pb-4">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
            {resource.data.title}
          </h1>
        </header>
        <div className="flex-1 overflow-hidden px-2 pb-4">
          <NotesReadOnly initialContent={resource.data.document} />
        </div>
      </article>
    );
  }
  if (resource.kind === "canvas") {
    return (
      <div className="flex h-[calc(100svh-3rem)] flex-col">
        <header className="bg-card flex h-10 shrink-0 items-center border-b px-4">
          <h1 className="text-sm font-semibold tracking-tight">{resource.data.title}</h1>
        </header>
        <div className="flex-1 overflow-hidden">
          <CanvasReadOnly initialDocument={resource.data.document} />
        </div>
      </div>
    );
  }
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-foreground mb-2 text-3xl font-semibold tracking-tight md:text-4xl">
        {resource.data.name}
      </h1>
      {resource.data.description ? (
        <p className="text-muted-foreground">{resource.data.description}</p>
      ) : null}
    </article>
  );
}
