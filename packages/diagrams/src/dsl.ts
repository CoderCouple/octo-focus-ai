import type { DiagramEdge, DiagramNode, OctoFocusAIDiagram } from "./index";

export interface ParseResult {
  diagram: OctoFocusAIDiagram;
  errors: Array<{ line: number; message: string }>;
}

/**
 * Eraser-style thin DSL — v1 grammar.
 *
 *   # comment
 *   Node Name                          # bare node
 *   Node Name [icon: aws-lambda, color: blue]   # node with attributes
 *   "Quoted Name"                      # quoted names support spaces / specials
 *   A > B                              # directed edge
 *   A > B: label                       # edge with label
 *   A > B: label [color: green]        # edge with label + attributes
 *
 * Attribute syntax follows Eraser:
 *   - keys recognised: icon, color, shape, label
 *   - values: bareword (icon names, color names) or "quoted"
 *   - unknown keys are tolerated and dropped at parse time
 *
 * Repeated node declarations are merged. Edges reference nodes by name;
 * if a name appears only in an edge, the node is auto-declared.
 *
 * This is a v1 grammar — the full Eraser-compatible spec (groups,
 * sequence blocks, ER fields, etc.) is documented in
 * `packages/diagrams/DSL.md` and lands as DSL v2.
 */
export function parseDsl(input: string): ParseResult {
  const errors: ParseResult["errors"] = [];
  const nodesByName = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];

  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = stripComment(raw).trim();
    if (!line) continue;

    const arrowIdx = findTopLevelOperator(line, ">");

    if (arrowIdx === -1) {
      const parsed = parseNameWithAttributes(line);
      if (!parsed) {
        errors.push({ line: i + 1, message: "Could not parse node declaration." });
        continue;
      }
      upsertNode(parsed.name, parsed.attrs, nodesByName);
      continue;
    }

    const leftRaw = line.slice(0, arrowIdx).trim();
    const afterArrow = line.slice(arrowIdx + 1).trim();

    // Disambiguation rule:
    //   `A > B [attrs]`              → [attrs] is on B (the target node)
    //   `A > B: label`               → label only, no attrs anywhere
    //   `A > B [b-attrs]: label`     → [b-attrs] on B, no edge attrs
    //   `A > B: label [edge-attrs]`  → [edge-attrs] on the edge
    //   `A > B [b-attrs]: label [edge-attrs]`  → both
    let rightSide: string;
    let label: string | undefined;
    let edgeAttrs: Record<string, string> = {};

    const colonIdx = findTopLevelOperator(afterArrow, ":");
    if (colonIdx === -1) {
      // No label — the whole tail is "<TargetName> [target-attrs]?"
      rightSide = afterArrow;
    } else {
      rightSide = afterArrow.slice(0, colonIdx).trim();
      const afterColon = afterArrow.slice(colonIdx + 1).trim();
      const stripped = stripTrailingAttributes(afterColon);
      label = stripped.body.trim() || undefined;
      edgeAttrs = stripped.attrs;
    }

    const leftParsed = parseNameWithAttributes(leftRaw);
    const rightParsed = parseNameWithAttributes(rightSide);
    if (!leftParsed || !rightParsed) {
      errors.push({ line: i + 1, message: "Edge must have a source and target." });
      continue;
    }

    const source = upsertNode(leftParsed.name, leftParsed.attrs, nodesByName);
    const target = upsertNode(rightParsed.name, rightParsed.attrs, nodesByName);
    const edgeColor = edgeAttrs.color;
    edges.push({
      id: `edge-${edges.length + 1}`,
      sourceId: source.id,
      targetId: target.id,
      ...(label ? { label } : {}),
      ...(edgeColor ? { color: edgeColor } : {}),
    });
  }

  const nodes = Array.from(nodesByName.values());
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
  const nodeNameById = new Map(
    diagram.nodes.map((n) => [n.id, n.name ?? n.label] as const),
  );
  const referenced = new Set<string>();
  const lines: string[] = [];

  // Emit standalone node declarations first (just the ones with attrs we
  // want to preserve — bare names ride along in edges below).
  for (const node of diagram.nodes) {
    const attrs = nodeAttrString(node);
    if (attrs) lines.push(`${quoteIfNeeded(node.name ?? node.label)} ${attrs}`);
  }

  for (const edge of diagram.edges) {
    const source = nodeNameById.get(edge.sourceId);
    const target = nodeNameById.get(edge.targetId);
    if (!source || !target) continue;
    referenced.add(edge.sourceId);
    referenced.add(edge.targetId);
    let line = `${quoteIfNeeded(source)} > ${quoteIfNeeded(target)}`;
    if (edge.label) line += `: ${edge.label}`;
    if (edge.color) line += ` [color: ${edge.color}]`;
    lines.push(line);
  }

  // Bare nodes (no attrs, no edges) tacked on at the end.
  const orphans = diagram.nodes.filter(
    (n) => !referenced.has(n.id) && !nodeAttrString(n),
  );
  if (orphans.length > 0) {
    if (lines.length > 0) lines.push("");
    for (const node of orphans) lines.push(quoteIfNeeded(node.name ?? node.label));
  }

  return lines.join("\n");
}

// --- internals -------------------------------------------------------------

function stripComment(raw: string): string {
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\"") inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === "#") return raw.slice(0, i);
    if (ch === "/" && raw[i + 1] === "/") return raw.slice(0, i);
  }
  return raw;
}

/**
 * Find the first occurrence of single-char `op` that is NOT inside a
 * quoted string and NOT inside an `[...]` block. Returns -1 if none.
 * The `[` itself is reported as a match at the OUTER level — i.e. the
 * opening bracket triggers the match check before depth increments.
 */
function findTopLevelOperator(s: string, op: string): number {
  let inQuote = false;
  let bracketDepth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\"") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (bracketDepth === 0 && ch === op) return i;
    if (ch === "[") bracketDepth++;
    else if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
  }
  return -1;
}

interface ParsedNameAttrs {
  name: string;
  attrs: Record<string, string>;
}

function parseNameWithAttributes(input: string): ParsedNameAttrs | null {
  const text = input.trim();
  if (!text) return null;

  const bracketStart = findTopLevelOperator(text, "[");
  if (bracketStart === -1) {
    const name = unquote(text);
    if (!name) return null;
    return { name, attrs: {} };
  }

  const namePart = text.slice(0, bracketStart).trim();
  const bracketBody = text.slice(bracketStart);
  if (!bracketBody.endsWith("]")) {
    // Unbalanced — fail safe: treat the whole thing as a name.
    return { name: unquote(text), attrs: {} };
  }
  const inner = bracketBody.slice(1, -1);
  const attrs = parseAttributeList(inner);
  const name = unquote(namePart);
  if (!name) return null;
  return { name, attrs };
}

function stripTrailingAttributes(text: string): {
  body: string;
  attrs: Record<string, string>;
} {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith("]")) return { body: text, attrs: {} };
  let depth = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const ch = trimmed[i];
    if (ch === "]") depth++;
    else if (ch === "[") {
      depth--;
      if (depth === 0) {
        const body = trimmed.slice(0, i).trimEnd();
        const inner = trimmed.slice(i + 1, -1);
        return { body, attrs: parseAttributeList(inner) };
      }
    }
  }
  return { body: text, attrs: {} };
}

function parseAttributeList(inner: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "\"") {
      inQuote = !inQuote;
      current += ch;
      continue;
    }
    if (ch === "," && !inQuote) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);

  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).trim().toLowerCase();
    const value = unquote(part.slice(colonIdx + 1).trim());
    if (key && value) out[key] = value;
  }
  return out;
}

function unquote(s: string): string {
  if (s.length >= 2 && s.startsWith("\"") && s.endsWith("\"")) {
    return s.slice(1, -1);
  }
  return s;
}

function quoteIfNeeded(name: string): string {
  return /[\s>"\[\]:#]/.test(name) ? `"${name}"` : name;
}

function upsertNode(
  name: string,
  attrs: Record<string, string>,
  nodesByName: Map<string, DiagramNode>,
): DiagramNode {
  const existing = nodesByName.get(name);
  if (existing) {
    if (attrs.icon) existing.icon = attrs.icon;
    if (attrs.color) existing.color = attrs.color;
    if (attrs.shape) existing.shape = attrs.shape;
    if (attrs.label) existing.label = attrs.label;
    return existing;
  }
  const node: DiagramNode = {
    id: idFromName(name, nodesByName.size),
    label: attrs.label ?? name,
    name,
    kind: "card",
    ...(attrs.icon ? { icon: attrs.icon } : {}),
    ...(attrs.color ? { color: attrs.color } : {}),
    ...(attrs.shape ? { shape: attrs.shape } : {}),
  };
  nodesByName.set(name, node);
  return node;
}

function idFromName(name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `${slug}-${index}` : `node-${index}`;
}

function nodeAttrString(node: DiagramNode): string {
  const parts: string[] = [];
  if (node.icon) parts.push(`icon: ${node.icon}`);
  if (node.color) parts.push(`color: ${node.color}`);
  if (node.shape) parts.push(`shape: ${node.shape}`);
  if (node.label && node.name && node.label !== node.name) {
    parts.push(`label: "${node.label}"`);
  }
  return parts.length > 0 ? `[${parts.join(", ")}]` : "";
}
