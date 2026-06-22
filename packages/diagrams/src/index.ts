import { z } from "zod";

export const DiagramTypeSchema = z.enum([
  "flowchart",
  "mind_map",
  "process_map",
  "architecture",
  "sequence",
]);

/**
 * Color names recognised on `[color: …]` attributes. Maps later to a
 * tldraw color via the renderer. Hex codes are also accepted at parse
 * time (stored verbatim in `color`); the renderer falls back to "grey"
 * when it doesn't recognise the value.
 */
export const DIAGRAM_COLORS = [
  "black",
  "grey",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "violet",
  "light-blue",
  "light-green",
] as const;

export const DiagramNodeSchema = z.object({
  id: z.string(),
  /**
   * Display label. Falls back to `name` when not explicitly set via
   * `[label: …]`. This is what the renderer draws inside the shape.
   */
  label: z.string(),
  /**
   * Source identifier — the bare name from the DSL line, before any
   * attribute parsing. Used for de-dup and so that `serializeDsl`
   * round-trips the original name when label differs.
   */
  name: z.string().optional(),
  kind: z.string().default("card"),
  icon: z.string().optional(),
  color: z.string().optional(),
  shape: z.string().optional(),
  /**
   * Set on `Name { … }` declarations. Group nodes render as a container
   * framing their children.
   */
  isGroup: z.boolean().optional(),
  /**
   * Parent group's id (when this node was declared inside `{ … }`).
   * Top-level nodes have no parentId.
   */
  parentId: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const DiagramEdgeSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const OctoFocusAIDiagramSchema = z.object({
  type: DiagramTypeSchema,
  title: z.string(),
  nodes: z.array(DiagramNodeSchema),
  edges: z.array(DiagramEdgeSchema),
  metadata: z.record(z.unknown()).optional(),
});

export type DiagramColor = (typeof DIAGRAM_COLORS)[number];
export type DiagramType = z.infer<typeof DiagramTypeSchema>;
export type DiagramNode = z.infer<typeof DiagramNodeSchema>;
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;
export type OctoFocusAIDiagram = z.infer<typeof OctoFocusAIDiagramSchema>;

export { parseDsl, serializeDsl } from "./dsl";
export type { ParseResult } from "./dsl";
export { iconToEmoji, ICON_EMOJI_MAP } from "./icons";
