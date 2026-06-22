/**
 * Read-only renderer for public resources.
 *
 *   project → header + read-only split (page on left, canvas on right) so
 *             publishing a project surfaces real content, not just metadata.
 *             Falls back to header-only when the project has no pages or
 *             canvases yet.
 *   page    → BlockNote in editable=false mode with the same custom schema
 *             (Mermaid block etc.) the editor uses
 *   canvas  → tldraw with hideUi + isReadonly + zoomToFit
 */
import type { PublicResource } from "../types";
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

  // project
  const { data, page, canvas } = resource;
  const hasContent = page || canvas;
  const showSplit = page && canvas;
  return (
    <div className="flex h-[calc(100svh-3rem)] flex-col">
      <header className="bg-card flex h-12 shrink-0 items-center border-b px-6">
        <h1 className="text-base font-semibold tracking-tight">{data.name}</h1>
        {data.description ? (
          <span className="text-muted-foreground ml-3 truncate text-xs">{data.description}</span>
        ) : null}
      </header>
      {!hasContent ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          This project has no content yet.
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {page ? (
            <div key="public-notes" className={showSplit ? "w-1/2 border-r" : "flex-1"}>
              <NotesReadOnly initialContent={page.document} />
            </div>
          ) : null}
          {canvas ? (
            <div key="public-canvas" className={showSplit ? "w-1/2" : "flex-1"}>
              <CanvasReadOnly initialDocument={canvas.document} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
