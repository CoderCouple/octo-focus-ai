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
// Layout spacing — tuned for diagrams with nested groups and ~30-40 leaves
// (the typical architecture diagram). Earlier defaults (28/24/90/50) had
// the right shape for a flat ~10-node diagram but crowded everything
// uncomfortably for the larger compound case.
const GROUP_PADDING = 40;
const GROUP_LABEL_RESERVE = 36;
const RANK_SEP = 130;
const NODE_SEP = 70;

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
      // The `octo-card` shape is custom and not in tldraw's closed
      // TLShape union; cast via unknown to keep the rest of the
      // TLShapePartial machinery happy.
      shapesToCreate.push({
        id,
        type: "octo-card",
        x: bounds.x,
        y: bounds.y,
        props: {
          w: bounds.width,
          h: bounds.height,
          label: node.label,
          icon: node.icon ?? "",
          color: node.color ?? "grey",
          isGroup: true,
        },
        meta: { octoDsl: true, octoNodeId: node.id, octoGroup: true },
      } as unknown as TLShapePartial);
    }

    for (const node of diagram.nodes) {
      if (node.isGroup) continue;
      const pos = layout.positions.get(node.id);
      if (!pos) continue;
      const id = createShapeId();
      idByNode.set(node.id, id);
      shapesToCreate.push({
        id,
        type: "octo-card",
        x: pos.x,
        y: pos.y,
        props: {
          w: NODE_W,
          h: NODE_H,
          label: node.label,
          icon: node.icon ?? "",
          color: node.color ?? "black",
          isGroup: false,
        },
        meta: { octoDsl: true, octoNodeId: node.id },
      } as unknown as TLShapePartial);
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
 * Dagre's compound mode can crash on some pathological structures
 * (ER-style entity bodies that reuse field names across entities, or
 * inter-group edges between mostly-empty groups). When that happens we
 * fall back to a flat layout that ignores `parentId` — groups still
 * render via bounding-box around their children, just with looser
 * positioning. Better a slightly-imperfect diagram than a crashed
 * canvas.
 */
function computeLayout(diagram: OctoFocusAIDiagram): ComputedLayout {
  if (diagram.nodes.length === 0) {
    return { positions: new Map(), groupBounds: new Map() };
  }
  try {
    return computeLayoutCompound(diagram);
  } catch (err) {
    // Don't kill the canvas just because Dagre's compound layout choked.
    console.warn("Dagre compound layout failed, falling back to flat", err);
    return computeLayoutFlat(diagram);
  }
}

function computeLayoutCompound(diagram: OctoFocusAIDiagram): ComputedLayout {
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

/**
 * Fallback when compound layout crashes (e.g. ER-style diagrams where
 * field names collide across entities, which we don't yet rewrite into
 * scoped ids). Lays the leaves out flat via plain Dagre, then computes
 * each group's bounding box from its descendants — same approach we
 * shipped pre-compound in v1.2.
 */
function computeLayoutFlat(diagram: OctoFocusAIDiagram): ComputedLayout {
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

  // If the diagram is "all groups with no inter-leaf edges" (the ER-style
  // case that crashed compound), we still need to position leaves. Add a
  // single column per group so children stack vertically.
  const placed = new Set(g.nodes());
  let extraX = 0;
  let extraY = 0;
  for (const node of diagram.nodes) {
    if (node.isGroup) continue;
    if (!placed.has(node.id)) {
      g.setNode(node.id, { width: NODE_W, height: NODE_H });
      placed.add(node.id);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, NodePosition>();
  for (const id of g.nodes()) {
    const dagreNode = g.node(id);
    if (!dagreNode) continue;
    positions.set(id, { x: dagreNode.x - NODE_W / 2, y: dagreNode.y - NODE_H / 2 });
  }

  // If a leaf still has no position (graph had no edges and only one
  // node-set call), drop it into a simple column. Belt-and-braces — the
  // earlier loop already covers this, but if Dagre returned zero rows
  // for some reason this keeps the renderer happy.
  for (const node of diagram.nodes) {
    if (node.isGroup) continue;
    if (positions.has(node.id)) continue;
    positions.set(node.id, { x: extraX, y: extraY });
    extraY += NODE_H + NODE_SEP;
    if (extraY > 800) {
      extraY = 0;
      extraX += NODE_W + NODE_SEP;
    }
  }

  // Groups: bounding box around descendants + padding.
  const childrenByParent = new Map<string, string[]>();
  for (const node of diagram.nodes) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node.id);
    childrenByParent.set(node.parentId, list);
  }
  const groupBounds = new Map<string, NodeBounds>();
  for (const node of diagram.nodes) {
    if (!node.isGroup) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const stack = [...(childrenByParent.get(node.id) ?? [])];
    while (stack.length > 0) {
      const id = stack.pop()!;
      const child = diagram.nodes.find((n) => n.id === id);
      if (child?.isGroup) {
        stack.push(...(childrenByParent.get(id) ?? []));
        continue;
      }
      const pos = positions.get(id);
      if (!pos) continue;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + NODE_W);
      maxY = Math.max(maxY, pos.y + NODE_H);
    }
    if (minX === Infinity) continue;
    groupBounds.set(node.id, {
      x: minX - GROUP_PADDING,
      y: minY - GROUP_PADDING - GROUP_LABEL_RESERVE,
      width: maxX - minX + GROUP_PADDING * 2,
      height: maxY - minY + GROUP_PADDING * 2 + GROUP_LABEL_RESERVE,
    });
  }

  return { positions, groupBounds };
}

export type { DiagramEdge, OctoFocusAIDiagram };
