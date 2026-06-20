"use client";

import { parseDsl } from "@octofocus/diagrams";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "@/hooks/use-in-view";

const NODE_W = 160;
const NODE_H = 52;
const RANK_GAP = 56;
const NODE_GAP = 28;
const PADDING = 28;

const DEFAULT_DSL = `Client > Server: HTTP
Server > Database: SQL
Server > Cache: read`;

interface PositionedNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface PositionedEdge {
  id: string;
  label?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Layout {
  width: number;
  height: number;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
}

function computeRanks(
  diagram: { nodes: { id: string }[]; edges: { sourceId: string; targetId: string }[] },
): Map<string, number> {
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

function buildLayout(dsl: string): Layout | { error: string } {
  const { diagram, errors } = parseDsl(dsl);
  if (errors.length > 0) {
    return { error: `Line ${errors[0]!.line}: ${errors[0]!.message}` };
  }
  if (diagram.nodes.length === 0) {
    return { width: 0, height: 0, nodes: [], edges: [] };
  }

  const ranks = computeRanks(diagram);
  const byRank = new Map<number, string[]>();
  for (const node of diagram.nodes) {
    const r = ranks.get(node.id) ?? 0;
    const list = byRank.get(r) ?? [];
    list.push(node.id);
    byRank.set(r, list);
  }

  const sortedRanks = Array.from(byRank.keys()).sort((a, b) => a - b);
  const maxColumnHeight = Math.max(
    ...sortedRanks.map((r) => byRank.get(r)!.length * (NODE_H + NODE_GAP) - NODE_GAP),
  );

  const labelById = new Map(diagram.nodes.map((n) => [n.id, n.label]));
  const positionById = new Map<string, { x: number; y: number }>();
  const positionedNodes: PositionedNode[] = [];

  for (const rank of sortedRanks) {
    const ids = byRank.get(rank)!;
    const columnHeight = ids.length * (NODE_H + NODE_GAP) - NODE_GAP;
    const startY = PADDING + (maxColumnHeight - columnHeight) / 2;
    ids.forEach((id, i) => {
      const x = PADDING + rank * (NODE_W + RANK_GAP);
      const y = startY + i * (NODE_H + NODE_GAP);
      positionById.set(id, { x, y });
      positionedNodes.push({ id, label: labelById.get(id) ?? id, x, y });
    });
  }

  const positionedEdges: PositionedEdge[] = [];
  for (const edge of diagram.edges) {
    const from = positionById.get(edge.sourceId);
    const to = positionById.get(edge.targetId);
    if (!from || !to) continue;
    positionedEdges.push({
      id: edge.id,
      label: edge.label,
      x1: from.x + NODE_W,
      y1: from.y + NODE_H / 2,
      x2: to.x,
      y2: to.y + NODE_H / 2,
    });
  }

  const width = PADDING * 2 + (sortedRanks.length * NODE_W + (sortedRanks.length - 1) * RANK_GAP);
  const height = PADDING * 2 + maxColumnHeight;

  return { width, height, nodes: positionedNodes, edges: positionedEdges };
}

export function CanvasDemo() {
  const [dsl, setDsl] = useState("");
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const hasPlayedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const layout = useMemo(() => buildLayout(dsl), [dsl]);

  useEffect(() => {
    if (!inView || hasPlayedRef.current || userInteractedRef.current) return;
    hasPlayedRef.current = true;
    let i = 0;
    const id = setInterval(() => {
      if (userInteractedRef.current) {
        clearInterval(id);
        return;
      }
      i += 1;
      setDsl(DEFAULT_DSL.slice(0, i));
      if (i >= DEFAULT_DSL.length) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [inView]);

  function onUserChange(value: string) {
    userInteractedRef.current = true;
    setDsl(value);
  }

  return (
    <div
      ref={ref}
      className="border-border/60 bg-card/40 grid overflow-hidden rounded-2xl border shadow-2xl backdrop-blur sm:grid-cols-[minmax(0,220px)_1fr]"
    >
      <div className="bg-muted/30 border-border/60 flex flex-col border-b sm:border-r sm:border-b-0">
        <div className="text-muted-foreground border-border/60 border-b px-4 py-2 text-xs font-medium tracking-wider uppercase">
          Diagram as code
        </div>
        <textarea
          value={dsl}
          onChange={(e) => onUserChange(e.target.value)}
          onFocus={() => {
            userInteractedRef.current = true;
          }}
          spellCheck={false}
          className="text-foreground flex-1 resize-none border-0 bg-transparent px-4 py-3 font-mono text-sm focus:outline-none"
          rows={Math.max(5, dsl.split("\n").length + 1)}
        />
      </div>
      <div className="flex flex-col">
        <div className="text-muted-foreground border-border/60 border-b px-4 py-2 text-xs font-medium tracking-wider uppercase">
          Canvas
        </div>
        <div className="grid min-h-[280px] flex-1 place-items-center overflow-auto p-4">
          {"error" in layout ? (
            <p className="text-destructive text-xs">{layout.error}</p>
          ) : layout.nodes.length === 0 ? (
            <p className="text-muted-foreground text-xs">Waiting for input…</p>
          ) : (
            <DiagramSvg layout={layout} />
          )}
        </div>
      </div>
    </div>
  );
}

function DiagramSvg({ layout }: { layout: Layout }) {
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="h-auto max-h-full w-full max-w-full"
      fill="none"
      style={{ color: "var(--foreground)" }}
    >
      <defs>
        <marker
          id="octo-demo-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {layout.edges.map((edge) => {
        const mx = (edge.x1 + edge.x2) / 2;
        return (
          <g key={edge.id}>
            <line
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="currentColor"
              strokeWidth={1.25}
              markerEnd="url(#octo-demo-arrow)"
              opacity={0.7}
            />
            {edge.label && (
              <text
                x={mx}
                y={(edge.y1 + edge.y2) / 2 - 6}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                opacity={0.6}
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}
      {layout.nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={NODE_W}
            height={NODE_H}
            rx={10}
            fill="var(--card)"
            stroke="currentColor"
            strokeWidth={1.25}
            opacity={0.95}
          />
          <text
            x={node.x + NODE_W / 2}
            y={node.y + NODE_H / 2 + 4}
            textAnchor="middle"
            fontSize={13}
            fontWeight={500}
            fill="currentColor"
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
