import type { Canvas } from "../types";

/**
 * `Canvas.diagramSchema` is a `Record<string, unknown> | null` on the wire —
 * the api doesn't constrain its shape beyond "object". By our convention
 * the diagram-as-code text lives at `.dsl` as a string. This helper does
 * the runtime narrowing in one place so route components and the editor
 * pane both stay tidy.
 */
export function extractDsl(diagramSchema: Canvas["diagramSchema"]): string {
  if (!diagramSchema || typeof diagramSchema !== "object") return "";
  const raw = (diagramSchema as Record<string, unknown>).dsl;
  return typeof raw === "string" ? raw : "";
}
