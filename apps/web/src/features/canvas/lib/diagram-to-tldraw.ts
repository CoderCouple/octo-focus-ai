import dagre from "@dagrejs/dagre";
import {
  iconToEmoji,
  type DiagramEdge,
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

    // Groups first — they sit BEHIND their children so the dashed border
    // doesn't fight with the contained shapes.
    for (const node of diagram.nodes) {
      if (!node.isGroup) continue;
      const bounds = layout.groupBounds.get(node.id);
      if (!bounds) continue;
      const id = createShapeId();
      idByNode.set(node.id, id);
      shapesToCreate.push({
        id,
        type: "geo",
        x: bounds.x,
        y: bounds.y,
        props: {
          geo: "rectangle",
          w: bounds.width,
          h: bounds.height,
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

interface NodeBounds {
  x: number; // top-left
  y: number;
  width: number;
  height: number;
}

interface ComputedLayout {
  /** Top-left positions for leaf nodes. */
  positions: Map<string, NodePosition>;
  /** Top-left + width/height for groups, computed by Dagre's compound layout. */
  groupBounds: Map<string, NodeBounds>;
}

/**
 * Layout via Dagre with `compound: true`. Groups are real Dagre nodes
 * (with their children attached via `setParent`), so each group is
 * laid out as its own internal sub-graph. Children of a group stay
 * adjacent — the group's container is sized to fit them and the whole
 * group flows through the outer ranking together.
 *
 * This replaces the previous "lay out leaves, then bounding-box the
 * groups" approach, which produced surprising layouts when a group's
 * children were edge-connected to nodes outside the group.
 */
function computeLayout(diagram: OctoFocusAIDiagram): ComputedLayout {
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: dagreRankdir(diagram.direction),
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Groups go in first so leaves can reference them as parents.
  for (const node of diagram.nodes) {
    if (!node.isGroup) continue;
    // Empty width/height — Dagre computes them from children + padding.
    g.setNode(node.id, {
      // Reserve some space for the group's label at the top.
      padding: GROUP_PADDING,
      paddingTop: GROUP_PADDING + GROUP_LABEL_RESERVE,
    });
  }

  for (const node of diagram.nodes) {
    if (node.isGroup) continue;
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }

  // Parent relationships — works for both leaf-in-group and group-in-group.
  for (const node of diagram.nodes) {
    if (node.parentId) g.setParent(node.id, node.parentId);
  }

  for (const edge of diagram.edges) {
    if (g.hasNode(edge.sourceId) && g.hasNode(edge.targetId)) {
      g.setEdge(edge.sourceId, edge.targetId);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, NodePosition>();
  const groupBoundsOut = new Map<string, NodeBounds>();
  for (const id of g.nodes()) {
    const dagreNode = g.node(id);
    if (!dagreNode) continue;
    const diagramNode = diagram.nodes.find((n) => n.id === id);
    if (!diagramNode) continue;
    if (diagramNode.isGroup) {
      // Dagre returns the group's centre + total bounds (children
      // included). Convert to top-left for tldraw.
      groupBoundsOut.set(id, {
        x: dagreNode.x - dagreNode.width / 2,
        y: dagreNode.y - dagreNode.height / 2,
        width: dagreNode.width,
        height: dagreNode.height,
      });
    } else {
      positions.set(id, { x: dagreNode.x - NODE_W / 2, y: dagreNode.y - NODE_H / 2 });
    }
  }
  return { positions, groupBounds: groupBoundsOut };
}

export type { DiagramEdge, OctoFocusAIDiagram };
