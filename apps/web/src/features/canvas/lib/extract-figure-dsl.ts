import { parseDsl, type DiagramNode } from "@octofocus/diagrams";

/**
 * Extract a single figure's subgraph from the surrounding canvas DSL
 * and re-emit it as a standalone DSL string. Used by the canvas
 * "Save figure" action: the user selects a figure-group, we look up
 * the underlying DSL node id, and produce a self-contained DSL that
 * the public `/f/<id>` page (and the note `figure` block) can render.
 *
 * Returns null when the target node isn't a group in the parsed
 * diagram — e.g. the user wrapped freehand shapes via the toolbar
 * "Figure" button. Those aren't DSL-backed and can't be saved in v1.
 *
 * v1 limitations:
 *   - flat subgraph (no nested figures preserved in the saved DSL)
 *   - edge attributes besides `color` aren't round-tripped
 *   - direction directive is dropped (the figure renders in whatever
 *     direction the embed view picks)
 */
export function extractFigureSubgraphDsl(fullDsl: string, figureNodeId: string): string | null {
  const { diagram } = parseDsl(fullDsl);
  const root = diagram.nodes.find((n) => n.id === figureNodeId);
  if (!root || !root.isGroup) return null;

  // BFS down the parentId tree — collect every node that lives
  // underneath the figure (direct and transitive children).
  const descendants = new Set<string>();
  const queue: string[] = [figureNodeId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const n of diagram.nodes) {
      if (n.parentId === cur && !descendants.has(n.id)) {
        descendants.add(n.id);
        queue.push(n.id);
      }
    }
  }

  const nodeById = new Map(diagram.nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  const label = root.label ?? root.name ?? "Figure";
  lines.push(`figure ${quoteIf(label)} {`);

  // Leaf node declarations (children of the figure).
  for (const id of descendants) {
    const n = nodeById.get(id);
    if (!n || n.isGroup) continue;
    lines.push(`  ${emitNode(n)}`);
  }

  // Edges whose both endpoints are inside the figure.
  for (const e of diagram.edges) {
    if (!descendants.has(e.sourceId) || !descendants.has(e.targetId)) continue;
    const src = nodeById.get(e.sourceId);
    const tgt = nodeById.get(e.targetId);
    if (!src || !tgt) continue;
    const op = e.operator ?? ">";
    const srcName = quoteIf(src.name ?? src.label);
    const tgtName = quoteIf(tgt.name ?? tgt.label);
    let line = `  ${srcName} ${op} ${tgtName}`;
    if (e.label) line += `: ${e.label}`;
    if (e.color) line += ` [color: ${e.color}]`;
    lines.push(line);
  }

  lines.push("}");
  return lines.join("\n");
}

function emitNode(node: DiagramNode): string {
  const name = node.name ?? node.label;
  const attrs: string[] = [];
  if (node.icon) attrs.push(`icon: ${node.icon}`);
  if (node.color) attrs.push(`color: ${node.color}`);
  if (node.shape) attrs.push(`shape: ${node.shape}`);
  if (node.label && node.name && node.label !== node.name) {
    attrs.push(`label: "${node.label}"`);
  }
  const attrStr = attrs.length > 0 ? ` [${attrs.join(", ")}]` : "";
  return `${quoteIf(name)}${attrStr}`;
}

function quoteIf(name: string): string {
  return /[\s>"\[\]:#]/.test(name) ? `"${name}"` : name;
}
