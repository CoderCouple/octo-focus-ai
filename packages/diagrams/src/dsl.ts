import type {
  DiagramDirection,
  DiagramEdge,
  DiagramNode,
  EdgeOperator,
  OctoFocusAIDiagram,
} from "./index";

/**
 * Edge operator tokens (longest first — the parser tries them in order
 * so `-->` wins over `--` wins over `>` etc.). All must be surrounded
 * by whitespace to be recognised as operators, otherwise `aws-lambda`
 * and similar hyphenated names would parse as edges.
 */
const EDGE_OPERATORS: EdgeOperator[] = ["-->", "<>", "--", ">", "-"];
// `<` is special-cased: at parse time the operator is normalised to `>`
// and the source / target are swapped. This keeps the rest of the
// pipeline edge-direction-aware without needing to handle backward
// arrows everywhere.
const BACK_OPERATOR = "<" as const;

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
const DIRECTION_VALUES = new Set(["down", "up", "right", "left"]);

export function parseDsl(input: string): ParseResult {
  const errors: ParseResult["errors"] = [];
  const nodesByName = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];
  let direction: DiagramDirection = "right";
  const groupStack: string[] = [];

  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = stripComment(raw).trim();
    if (!line) continue;

    if (line === "}") {
      if (groupStack.length === 0) {
        errors.push({ line: i + 1, message: "Unexpected `}` with no open group." });
      } else {
        groupStack.pop();
      }
      continue;
    }

    // Diagram-level directive: `direction <value>` at top level.
    if (line.startsWith("direction ")) {
      const value = line.slice("direction ".length).trim();
      if (DIRECTION_VALUES.has(value)) {
        direction = value as DiagramDirection;
      } else {
        errors.push({
          line: i + 1,
          message: `Unknown direction "${value}". Expected down | up | right | left.`,
        });
      }
      continue;
    }

    const currentParent = groupStack[groupStack.length - 1];

    if (line.endsWith("{")) {
      const head = line.slice(0, -1).trim();
      const parsed = parseNameWithAttributes(head);
      if (!parsed) {
        errors.push({ line: i + 1, message: "Could not parse group declaration." });
        continue;
      }
      const group = upsertNode(parsed.name, parsed.attrs, nodesByName, {
        parentId: currentParent,
        isGroup: true,
      });
      groupStack.push(group.id);
      continue;
    }

    // Try to find an edge operator. If none, this line is a node decl.
    const firstOp = findFirstEdgeOperator(line, 0);
    if (firstOp === null) {
      const parsed = parseNameWithAttributes(line);
      if (!parsed) {
        errors.push({ line: i + 1, message: "Could not parse node declaration." });
        continue;
      }
      upsertNode(parsed.name, parsed.attrs, nodesByName, { parentId: currentParent });
      continue;
    }

    // Pull the label + edge attrs off the END of the line first.
    // Disambiguation rule (carried over from v1.1):
    //   `A > B [attrs]`             → [attrs] on the LAST target
    //   `A > B: label [attrs]`      → [attrs] on the edge
    let body = line;
    let label: string | undefined;
    let edgeAttrs: Record<string, string> = {};
    const lastColonIdx = findLastTopLevelColon(body);
    if (lastColonIdx !== -1) {
      const beforeColon = body.slice(0, lastColonIdx).trim();
      const afterColon = body.slice(lastColonIdx + 1).trim();
      const stripped = stripTrailingAttributes(afterColon);
      label = stripped.body.trim() || undefined;
      edgeAttrs = stripped.attrs;
      body = beforeColon;
    }

    // Split body into chain segments: [seg0, op0, seg1, op1, seg2, …].
    // `opAfter` may include `<` here — `normaliseEdgeOperator` rewrites
    // it into the canonical (source, target, EdgeOperator) tuple.
    const chain: Array<{ segment: string; opAfter?: string }> = [];
    let cursor = 0;
    while (cursor < body.length) {
      const op = findFirstEdgeOperator(body, cursor);
      if (op === null) {
        chain.push({ segment: body.slice(cursor).trim() });
        break;
      }
      chain.push({
        segment: body.slice(cursor, op.index).trim(),
        opAfter: op.operator,
      });
      cursor = op.index + op.length;
    }
    if (chain.length < 2) {
      errors.push({ line: i + 1, message: "Edge must have a source and target." });
      continue;
    }

    // The last segment may be a fan-out target list (`A > B, C, D`).
    // Intermediate segments in a chain are single names — we don't
    // support `A > B, C > D` because the semantics are unclear.
    const intermediates = chain.slice(0, -1).map((seg) => parseNameWithAttributes(seg.segment));
    const lastSegment = chain[chain.length - 1]!;
    const fanOutTargets = splitTopLevel(lastSegment.segment, ",")
      .map((t) => parseNameWithAttributes(t.trim()))
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (intermediates.some((p) => !p) || fanOutTargets.length === 0) {
      errors.push({ line: i + 1, message: "Edge has an unparseable name." });
      continue;
    }

    const intermediateNodes = intermediates.map((parsed) =>
      upsertNode(parsed!.name, parsed!.attrs, nodesByName, { parentId: currentParent }),
    );

    // Walk through the chain, emitting one edge per (left, op, right) triple.
    // Fan-out only applies on the final hop.
    const edgeColor = edgeAttrs.color;
    for (let k = 0; k < chain.length - 1; k++) {
      const op = chain[k]!.opAfter!;
      const isLastHop = k === chain.length - 2;
      const leftNode = intermediateNodes[k]!;
      const rightNodesForHop = isLastHop
        ? fanOutTargets.map((parsed) =>
            upsertNode(parsed.name, parsed.attrs, nodesByName, { parentId: currentParent }),
          )
        : [intermediateNodes[k + 1]!];

      for (const rightNode of rightNodesForHop) {
        const normalised = normaliseEdgeOperator(op, leftNode, rightNode);
        edges.push({
          id: `edge-${edges.length + 1}`,
          sourceId: normalised.sourceId,
          targetId: normalised.targetId,
          operator: normalised.operator,
          ...(label && isLastHop ? { label } : {}),
          ...(edgeColor ? { color: edgeColor } : {}),
        });
      }
    }
  }

  if (groupStack.length > 0) {
    errors.push({
      line: lines.length,
      message: `Unclosed group${groupStack.length > 1 ? "s" : ""} at end of input.`,
    });
  }

  const nodes = Array.from(nodesByName.values());
  return {
    diagram: {
      type: "flowchart",
      title: "Untitled",
      direction,
      nodes,
      edges,
    },
    errors,
  };
}

/**
 * Map the parsed operator + source/target onto the normalised edge
 * vocabulary. `<` swaps direction; `>`, `<>`, `-`, `--`, `-->` are
 * kept verbatim.
 */
function normaliseEdgeOperator(
  op: string,
  left: DiagramNode,
  right: DiagramNode,
): { sourceId: string; targetId: string; operator: EdgeOperator } {
  if (op === BACK_OPERATOR) {
    return { sourceId: right.id, targetId: left.id, operator: ">" };
  }
  return { sourceId: left.id, targetId: right.id, operator: op as EdgeOperator };
}

export function serializeDsl(diagram: OctoFocusAIDiagram): string {
  const nodeNameById = new Map(
    diagram.nodes.map((n) => [n.id, n.name ?? n.label] as const),
  );
  const referenced = new Set<string>();
  const lines: string[] = [];

  // Diagram-level directives come first.
  if (diagram.direction && diagram.direction !== "right") {
    lines.push(`direction ${diagram.direction}`);
  }

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
    const op = edge.operator ?? ">";
    let line = `${quoteIfNeeded(source)} ${op} ${quoteIfNeeded(target)}`;
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

/**
 * Find the FIRST edge operator (>, <, <>, -, --, -->) at or after `from`
 * that is at the top level (not inside quotes or brackets) AND is
 * surrounded by whitespace (or at line edges) — the whitespace rule
 * disambiguates `Web > API` (operator) from `aws-lambda` (name).
 *
 * Returns null when no operator is found.
 */
function findFirstEdgeOperator(
  s: string,
  from: number,
): { index: number; length: number; operator: string } | null {
  // Operators sorted longest-first so `-->` wins over `--` wins over `-`.
  const ordered = ["-->", "<>", "--", ">", "<", "-"];

  let inQuote = false;
  let bracketDepth = 0;
  for (let i = from; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\"") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (ch === "[") {
      bracketDepth++;
      continue;
    }
    if (ch === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (bracketDepth !== 0) continue;

    for (const op of ordered) {
      if (!s.startsWith(op, i)) continue;
      const before = i === 0 ? " " : s[i - 1];
      const after = i + op.length >= s.length ? " " : s[i + op.length];
      if (/\s/.test(before!) && /\s/.test(after!)) {
        return { index: i, length: op.length, operator: op };
      }
    }
  }
  return null;
}

/**
 * Find the LAST top-level `:` in `s`. Used to split the optional label
 * off the end of an edge line (`A > B: label` or `A > B > C: label`).
 */
function findLastTopLevelColon(s: string): number {
  let inQuote = false;
  let bracketDepth = 0;
  let last = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\"") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (ch === "[") {
      bracketDepth++;
      continue;
    }
    if (ch === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (bracketDepth === 0 && ch === ":") last = i;
  }
  return last;
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
  const parts = splitTopLevel(inner, ",");
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).trim().toLowerCase();
    const value = unquote(part.slice(colonIdx + 1).trim());
    if (key && value) out[key] = value;
  }
  return out;
}

/**
 * Split `s` on single-char `op` at the top level — respects quoted
 * strings and balanced `[...]` brackets.
 */
function splitTopLevel(s: string, op: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuote = false;
  let bracketDepth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\"") {
      inQuote = !inQuote;
      current += ch;
      continue;
    }
    if (!inQuote) {
      if (ch === "[") bracketDepth++;
      else if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
      else if (bracketDepth === 0 && ch === op) {
        if (current.trim()) out.push(current);
        current = "";
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) out.push(current);
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

interface UpsertNodeOpts {
  parentId?: string | undefined;
  isGroup?: boolean;
}

function upsertNode(
  name: string,
  attrs: Record<string, string>,
  nodesByName: Map<string, DiagramNode>,
  opts: UpsertNodeOpts = {},
): DiagramNode {
  const existing = nodesByName.get(name);
  if (existing) {
    if (attrs.icon) existing.icon = attrs.icon;
    if (attrs.color) existing.color = attrs.color;
    if (attrs.shape) existing.shape = attrs.shape;
    if (attrs.label) existing.label = attrs.label;
    if (opts.isGroup) existing.isGroup = true;
    // First declaration wins for parent — auto-references inside a group
    // body shouldn't reparent an already-known top-level node.
    if (opts.parentId !== undefined && existing.parentId === undefined) {
      existing.parentId = opts.parentId;
    }
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
    ...(opts.isGroup ? { isGroup: true } : {}),
    ...(opts.parentId ? { parentId: opts.parentId } : {}),
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
