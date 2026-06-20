import type { DiagramEdge, DiagramNode, OctoFocusAIDiagram } from "./index";

export interface ParseResult {
  diagram: OctoFocusAIDiagram;
  errors: Array<{ line: number; message: string }>;
}

/**
 * Minimal Eraser-style DSL.
 *
 *   # comment
 *   Node Name                       -> declares a node
 *   Node A > Node B                 -> directed edge
 *   Node A > Node B: label          -> edge with label
 *
 * Repeated node declarations are merged. Edges reference nodes by name; if a
 * node name appears only in an edge, it is auto-declared.
 */
export function parseDsl(input: string): ParseResult {
  const errors: ParseResult["errors"] = [];
  const nodesByLabel = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];

  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;

    const arrow = line.indexOf(">");
    if (arrow === -1) {
      ensureNode(line, nodesByLabel);
      continue;
    }

    const left = line.slice(0, arrow).trim();
    let right = line.slice(arrow + 1).trim();
    let label: string | undefined;

    const colon = right.indexOf(":");
    if (colon !== -1) {
      label = right.slice(colon + 1).trim() || undefined;
      right = right.slice(0, colon).trim();
    }

    if (!left || !right) {
      errors.push({ line: i + 1, message: "Edge must have a source and target." });
      continue;
    }

    const source = ensureNode(left, nodesByLabel);
    const target = ensureNode(right, nodesByLabel);
    edges.push({
      id: `edge-${edges.length + 1}`,
      sourceId: source.id,
      targetId: target.id,
      ...(label ? { label } : {}),
    });
  }

  const nodes = Array.from(nodesByLabel.values());
  return {
    diagram: {
      type: "flowchart",
      title: "Untitled",
      nodes,
      edges,
    },
    errors,
  };
}

export function serializeDsl(diagram: OctoFocusAIDiagram): string {
  const nodeLabelById = new Map(diagram.nodes.map((n) => [n.id, n.label]));
  const referenced = new Set<string>();
  const lines: string[] = [];

  for (const edge of diagram.edges) {
    const source = nodeLabelById.get(edge.sourceId);
    const target = nodeLabelById.get(edge.targetId);
    if (!source || !target) continue;
    referenced.add(edge.sourceId);
    referenced.add(edge.targetId);
    lines.push(`${source} > ${target}${edge.label ? `: ${edge.label}` : ""}`);
  }

  const orphans = diagram.nodes.filter((n) => !referenced.has(n.id));
  if (orphans.length > 0) {
    if (lines.length > 0) lines.push("");
    for (const node of orphans) lines.push(node.label);
  }

  return lines.join("\n");
}

function ensureNode(label: string, nodesByLabel: Map<string, DiagramNode>): DiagramNode {
  const existing = nodesByLabel.get(label);
  if (existing) return existing;
  const node: DiagramNode = {
    id: idFromLabel(label, nodesByLabel.size),
    label,
    kind: "card",
  };
  nodesByLabel.set(label, node);
  return node;
}

function idFromLabel(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `${slug}-${index}` : `node-${index}`;
}
