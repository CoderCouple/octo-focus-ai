import dagre from "@dagrejs/dagre";
import {
  iconToEmoji,
  type DiagramEdge,
  type DiagramNode,
  type EdgeOperator,
  type OctoFocusAIDiagram,
} from "@octofocus/diagrams";
import { createShapeId, type Editor, type TLShapePartial } from "tldraw";

const NODE_W = 180;
const NODE_H = 56;
const GROUP_PADDING = 28;
const GROUP_LABEL_RESERVE = 24;
const RANK_SEP = 90;
const NODE_SEP = 50;

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

function shapeKindFor(
  shape: string | undefined,
): "rectangle" | "ellipse" | "oval" | "diamond" | "hexagon" {
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

/**
 * Map the parsed edge operator onto tldraw arrow visual props.
 *
 *   ">"   forward arrow, solid line
 *   "<>"  arrowheads at both ends, solid
 *   "-"   no arrowhead, solid
 *   "--"  no arrowhead, dashed
 *   "-->" forward arrow, dashed
 */
function arrowPropsFor(operator: EdgeOperator | undefined): {
  arrowheadStart: "none" | "arrow";
  arrowheadEnd: "none" | "arrow";
  dash: "solid" | "dashed";
} {
  const op = operator ?? ">";
  switch (op) {
    case "<>":
      return { arrowheadStart: "arrow", arrowheadEnd: "arrow", dash: "solid" };
    case "-":
      return { arrowheadStart: "none", arrowheadEnd: "none", dash: "solid" };
    case "--":
      return { arrowheadStart: "none", arrowheadEnd: "none", dash: "dashed" };
    case "-->":
      return { arrowheadStart: "none", arrowheadEnd: "arrow", dash: "dashed" };
    case ">":
    default:
      return { arrowheadStart: "none", arrowheadEnd: "arrow", dash: "solid" };
  }
}

function dagreRankdir(direction: OctoFocusAIDiagram["direction"]): "TB" | "BT" | "LR" | "RL" {
  switch (direction) {
    case "down":
      return "TB";
    case "up":
      return "BT";
    case "left":
      return "RL";
    case "right":
    default:
      return "LR";
  }
}

export function syncDiagramToTldraw(editor: Editor, diagram: OctoFocusAIDiagram) {
  editor.run(() => {
    const existing = editor.getCurrentPageShapes();
    const ours = existing.filter((s) => s.meta?.octoDsl === true);
    if (ours.length > 0) editor.deleteShapes(ours.map((s) => s.id));

    const layout = computeLayout(diagram);
    const shapesToCreate: TLShapePartial[] = [];
    const idByNode = new Map<string, ReturnType<typeof createShapeId>>();
    const nodeById = new Map(diagram.nodes.map((n) => [n.id, n] as const));
    const childrenByParent = childrenIndex(diagram.nodes);

    // Groups first — they sit BEHIND their children so the dashed border
    // doesn't fight with the contained shapes.
    for (const node of diagram.nodes) {
      if (!node.isGroup) continue;
      const bounds = groupBounds(node.id, childrenByParent, layout.positions, nodeById);
      if (!bounds) continue;
      const id = createShapeId();
      idByNode.set(node.id, id);
      shapesToCreate.push({
        id,
        type: "geo",
        x: bounds.minX - GROUP_PADDING,
        y: bounds.minY - GROUP_PADDING - GROUP_LABEL_RESERVE,
        props: {
          geo: "rectangle",
          w: bounds.maxX - bounds.minX + GROUP_PADDING * 2,
          h:
            bounds.maxY - bounds.minY +
            GROUP_PADDING * 2 +
            GROUP_LABEL_RESERVE,
          color: toTldrawColor(node.color ?? "grey"),
          fill: "none",
          dash: "dashed",
          richText: asRichText(decorateLabel(node.label, node.icon)),
          verticalAlign: "start",
        },
        meta: { octoDsl: true, octoNodeId: node.id, octoGroup: true },
      });
    }

    for (const node of diagram.nodes) {
      if (node.isGroup) continue;
      const pos = layout.positions.get(node.id);
      if (!pos) continue;
      const id = createShapeId();
      idByNode.set(node.id, id);
      shapesToCreate.push({
        id,
        type: "geo",
        x: pos.x,
        y: pos.y,
        props: {
          geo: shapeKindFor(node.shape),
          w: NODE_W,
          h: NODE_H,
          color: toTldrawColor(node.color),
          richText: asRichText(decorateLabel(node.label, node.icon)),
        },
        meta: { octoDsl: true, octoNodeId: node.id },
      });
    }

    for (const edge of diagram.edges) {
      const fromId = idByNode.get(edge.sourceId);
      const toId = idByNode.get(edge.targetId);
      if (!fromId || !toId) continue;
      const arrowProps = arrowPropsFor(edge.operator);
      shapesToCreate.push({
        id: createShapeId(),
        type: "arrow",
        x: 0,
        y: 0,
        props: {
          color: toTldrawColor(edge.color),
          arrowheadStart: arrowProps.arrowheadStart,
          arrowheadEnd: arrowProps.arrowheadEnd,
          dash: arrowProps.dash,
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
          props: { terminal: "start", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
        },
        {
          fromId: arrow.id,
          toId: toId,
          type: "arrow",
          props: { terminal: "end", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
        },
      ]);
    }
  });
}

interface NodePosition {
  x: number;
  y: number;
}

interface ComputedLayout {
  positions: Map<string, NodePosition>;
}

/**
 * Layout via Dagre. Only leaf nodes are added to the dagre graph;
 * groups are sized afterwards from their children's bounding boxes.
 * Keeping groups out of the rank graph stops them from competing with
 * their own children for column space.
 */
function computeLayout(diagram: OctoFocusAIDiagram): ComputedLayout {
  const g = new dagre.graphlib.Graph({ compound: false });
  g.setGraph({
    rankdir: dagreRankdir(diagram.direction),
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of diagram.nodes) {
    if (node.isGroup) continue;
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }

  for (const edge of diagram.edges) {
    if (g.hasNode(edge.sourceId) && g.hasNode(edge.targetId)) {
      g.setEdge(edge.sourceId, edge.targetId);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, NodePosition>();
  for (const id of g.nodes()) {
    const n = g.node(id);
    // Dagre centres nodes; tldraw places by top-left.
    positions.set(id, { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 });
  }
  return { positions };
}

function childrenIndex(nodes: DiagramNode[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = out.get(node.parentId) ?? [];
    list.push(node.id);
    out.set(node.parentId, list);
  }
  return out;
}

function groupBounds(
  groupId: string,
  childrenByParent: Map<string, string[]>,
  positions: Map<string, NodePosition>,
  nodeById: Map<string, DiagramNode>,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const stack = [...(childrenByParent.get(groupId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (nodeById.get(id)?.isGroup) {
      const grandchildren = childrenByParent.get(id) ?? [];
      stack.push(...grandchildren);
      continue;
    }
    const pos = positions.get(id);
    if (!pos) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + NODE_W);
    maxY = Math.max(maxY, pos.y + NODE_H);
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

export type { DiagramEdge, OctoFocusAIDiagram };
