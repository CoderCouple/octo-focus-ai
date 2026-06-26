import type { Canvas } from "../types";

/**
 * Diagram source languages we support. `octo` is our native
 * Eraser-style DSL parsed by `@octofocus/diagrams`. `mermaid` is a
 * stub — selectable in the Source panel and round-tripped through
 * persistence, but tldraw rendering for it isn't implemented yet.
 */
export type DslLanguage = "octo" | "mermaid";
export const DEFAULT_DSL_LANGUAGE: DslLanguage = "octo";

/**
 * `Canvas.diagramSchema` is a `Record<string, unknown> | null` on the wire —
 * the api doesn't constrain its shape beyond "object". By convention the
 * diagram-as-code text lives at `.dsl`, the chosen flavour at `.language`,
 * and the side-panel open state at `.sourceOpen`. These helpers do the
 * runtime narrowing in one place so route components and the editor pane
 * both stay tidy.
 */
export function extractDsl(diagramSchema: Canvas["diagramSchema"]): string {
  if (!diagramSchema || typeof diagramSchema !== "object") return "";
  const raw = (diagramSchema as Record<string, unknown>).dsl;
  return typeof raw === "string" ? raw : "";
}

export function extractDslLanguage(diagramSchema: Canvas["diagramSchema"]): DslLanguage {
  if (!diagramSchema || typeof diagramSchema !== "object") return DEFAULT_DSL_LANGUAGE;
  const raw = (diagramSchema as Record<string, unknown>).language;
  return raw === "mermaid" || raw === "octo" ? raw : DEFAULT_DSL_LANGUAGE;
}

export function extractSourceOpen(diagramSchema: Canvas["diagramSchema"]): boolean {
  if (!diagramSchema || typeof diagramSchema !== "object") return false;
  const raw = (diagramSchema as Record<string, unknown>).sourceOpen;
  return raw === true;
}
