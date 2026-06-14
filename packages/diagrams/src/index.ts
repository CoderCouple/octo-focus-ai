import { z } from "zod";

export const DiagramTypeSchema = z.enum([
  "flowchart",
  "mind_map",
  "process_map",
  "architecture",
  "sequence",
]);

export const DiagramNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.string().default("card"),
  x: z.number().optional(),
  y: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const DiagramEdgeSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  label: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const OctoDiagramSchema = z.object({
  type: DiagramTypeSchema,
  title: z.string(),
  nodes: z.array(DiagramNodeSchema),
  edges: z.array(DiagramEdgeSchema),
  metadata: z.record(z.unknown()).optional(),
});

export type DiagramType = z.infer<typeof DiagramTypeSchema>;
export type DiagramNode = z.infer<typeof DiagramNodeSchema>;
export type DiagramEdge = z.infer<typeof DiagramEdgeSchema>;
export type OctoDiagram = z.infer<typeof OctoDiagramSchema>;
