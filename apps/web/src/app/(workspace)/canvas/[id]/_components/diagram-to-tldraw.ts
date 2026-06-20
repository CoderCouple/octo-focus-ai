import type { OctoFocusAIDiagram } from "@octofocus/diagrams";
import {
  createShapeId,
  type Editor,
  type TLShapePartial,
} from "tldraw";

const NODE_W = 180;
const NODE_H = 56;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;

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

    for (const node of positioned.nodes) {
      const id = createShapeId();
      idByNode.set(node.id, id);
      shapesToCreate.push({
        id,
        type: "geo",
        x: node.x,
        y: node.y,
        props: {
          geo: "rectangle",
          w: NODE_W,
          h: NODE_H,
          richText: asRichText(node.label),
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
