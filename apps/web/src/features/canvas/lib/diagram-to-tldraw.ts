import { iconToEmoji, type OctoFocusAIDiagram } from "@octofocus/diagrams";
import { createShapeId, type Editor, type TLShapePartial } from "tldraw";

const NODE_W = 180;
const NODE_H = 56;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;

type TldrawColor =
  | "black"
  | "grey"
  | "violet"
  | "light-violet"
  | "blue"
  | "light-blue"
  | "yellow"
  | "orange"
  | "green"
  | "light-green"
  | "light-red"
  | "red"
  | "white";

/**
 * Map our DSL `[color: …]` value onto a tldraw geo color. Tldraw enforces
 * its enum at runtime — invalid colors fall back to "black".
 */
function toTldrawColor(value: string | undefined): TldrawColor {
  if (!value) return "black";
  const v = value.toLowerCase().trim();
  switch (v) {
    case "purple":
      return "violet";
    case "lightblue":
    case "light_blue":
      return "light-blue";
    case "lightgreen":
    case "light_green":
      return "light-green";
    case "lightviolet":
    case "light_violet":
      return "light-violet";
    case "lightred":
    case "light_red":
    case "pink":
      return "light-red";
    case "grey":
    case "gray":
      return "grey";
    case "black":
    case "white":
    case "red":
    case "orange":
    case "yellow":
    case "green":
    case "blue":
    case "violet":
      return v as TldrawColor;
    default:
      return "black";
  }
}

function shapeKindFor(shape: string | undefined): "rectangle" | "ellipse" | "oval" | "diamond" | "hexagon" {
  switch ((shape ?? "").toLowerCase()) {
    case "oval":
    case "ellipse":
      return "ellipse";
    case "diamond":
      return "diamond";
    case "hexagon":
      return "hexagon";
    default:
      return "rectangle";
  }
}

function decorateLabel(label: string, icon?: string): string {
  const emoji = iconToEmoji(icon);
  if (!emoji) return label;
  return `${emoji}  ${label}`;
}

function asRichText(text: string) {
  return {
    type: "doc" as const,
    content: text
      ? [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }]
      : [{ type: "paragraph" as const }],
  };
}

export function syncDiagramToTldraw(editor: Editor, diagram: OctoFocusAIDiagram) {
  editor.run(() => {
    const existing = editor.getCurrentPageShapes();
    const ours = existing.filter((s) => s.meta?.octoDsl === true);
    if (ours.length > 0) editor.deleteShapes(ours.map((s) => s.id));

    const positioned = layout(diagram);
    const shapesToCreate: TLShapePartial[] = [];
    const idByNode = new Map<string, ReturnType<typeof createShapeId>>();
    const nodeById = new Map(diagram.nodes.map((n) => [n.id, n] as const));

    for (const node of positioned.nodes) {
      const id = createShapeId();
      idByNode.set(node.id, id);
      const meta = nodeById.get(node.id);
      shapesToCreate.push({
        id,
        type: "geo",
        x: node.x,
        y: node.y,
        props: {
          geo: shapeKindFor(meta?.shape),
          w: NODE_W,
          h: NODE_H,
          color: toTldrawColor(meta?.color),
          richText: asRichText(decorateLabel(node.label, meta?.icon)),
        },
        meta: { octoDsl: true, octoNodeId: node.id },
      });
    }

    for (const edge of diagram.edges) {
      const fromId = idByNode.get(edge.sourceId);
      const toId = idByNode.get(edge.targetId);
      if (!fromId || !toId) continue;
      shapesToCreate.push({
        id: createShapeId(),
        type: "arrow",
        x: 0,
        y: 0,
        props: {
          color: toTldrawColor(edge.color),
          richText: asRichText(edge.label ?? ""),
        },
        meta: { octoDsl: true, octoEdgeId: edge.id },
      });
    }

    if (shapesToCreate.length > 0) editor.createShapes(shapesToCreate);

    for (const edge of diagram.edges) {
      const fromId = idByNode.get(edge.sourceId);
      const toId = idByNode.get(edge.targetId);
      if (!fromId || !toId) continue;
      const arrow = editor
        .getCurrentPageShapes()
        .find((s) => s.meta?.octoDsl === true && s.meta?.octoEdgeId === edge.id);
      if (!arrow) continue;
      editor.createBindings([
        {
          fromId: arrow.id,
          toId: fromId,
          type: "arrow",
          props: { terminal: "start", normalizedAnchor: { x: 1, y: 0.5 }, isExact: false, isPrecise: true },
        },
        {
          fromId: arrow.id,
          toId: toId,
          type: "arrow",
          props: { terminal: "end", normalizedAnchor: { x: 0, y: 0.5 }, isExact: false, isPrecise: true },
        },
      ]);
    }
  });
}

interface PositionedNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

function layout(diagram: OctoFocusAIDiagram): { nodes: PositionedNode[] } {
  const ranks = computeRanks(diagram);
  const byRank = new Map<number, string[]>();
  for (const [nodeId, rank] of ranks) {
    const list = byRank.get(rank) ?? [];
    list.push(nodeId);
    byRank.set(rank, list);
  }

  const nodes: PositionedNode[] = [];
  const labelById = new Map(diagram.nodes.map((n) => [n.id, n.label]));
  const sortedRanks = Array.from(byRank.keys()).sort((a, b) => a - b);
  for (const rank of sortedRanks) {
    const ids = byRank.get(rank)!;
    ids.forEach((id, i) => {
      nodes.push({
        id,
        label: labelById.get(id) ?? id,
        x: rank * (NODE_W + NODE_GAP_X),
        y: i * (NODE_H + NODE_GAP_Y),
      });
    });
  }
  return { nodes };
}

function computeRanks(diagram: OctoFocusAIDiagram): Map<string, number> {
  const ranks = new Map<string, number>();
  const incoming = new Map<string, string[]>();
  for (const edge of diagram.edges) {
    const list = incoming.get(edge.targetId) ?? [];
    list.push(edge.sourceId);
    incoming.set(edge.targetId, list);
  }
  function rankOf(id: string, stack = new Set<string>()): number {
    if (ranks.has(id)) return ranks.get(id)!;
    if (stack.has(id)) return 0;
    stack.add(id);
    const parents = incoming.get(id) ?? [];
    const r = parents.length === 0 ? 0 : Math.max(...parents.map((p) => rankOf(p, stack))) + 1;
    stack.delete(id);
    ranks.set(id, r);
    return r;
  }
  for (const node of diagram.nodes) rankOf(node.id);
  return ranks;
}
