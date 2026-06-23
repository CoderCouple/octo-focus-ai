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

/**
 * Connection operator vocabulary, mirroring Eraser. The renderer
 * resolves each to arrowhead + dash style:
 *
 *   ">"   forward arrow, solid line
 *   "<"   normalised to ">" at parse time (source/target swapped)
 *   "<>"  arrowheads at both ends, solid
 *   "-"   no arrowhead, solid line
 *   "--"  no arrowhead, dashed line
 *   "-->" forward arrow, dashed line
 */
export const EdgeOperatorSchema = z.enum([">", "<>", "-", "--", "-->"]);

export const DiagramEdgeSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  operator: EdgeOperatorSchema.default(">"),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Layout direction for the whole diagram. Set via the top-level
 * `direction down|up|right|left` directive; defaults to "right".
 */
export const DiagramDirectionSchema = z.enum(["down", "up", "right", "left"]);

export const OctoFocusAIDiagramSchema = z.object({
  type: DiagramTypeSchema,
  title: z.string(),
  direction: DiagramDirectionSchema.default("right"),
  nodes: z.array(DiagramNodeSchema),
  edges: z.array(DiagramEdgeSchema),
  metadata: z.record(z.unknown()).optional(),
});

export type DiagramColor = (typeof DIAGRAM_COLORS)[number];
export type DiagramType = z.infer<typeof DiagramTypeSchema>;
export type DiagramDirection = z.infer<typeof DiagramDirectionSchema>;
export type DiagramNode = z.infer<typeof DiagramNodeSchema>;
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;
export type EdgeOperator = z.infer<typeof EdgeOperatorSchema>;
export type OctoFocusAIDiagram = z.infer<typeof OctoFocusAIDiagramSchema>;

export { parseDsl, serializeDsl } from "./dsl";
export type { ParseResult } from "./dsl";
export { iconToEmoji, ICON_EMOJI_MAP } from "./icons";
