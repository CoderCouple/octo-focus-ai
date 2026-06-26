import { parseDsl } from "@octofocus/diagrams";
import { describe, expect, it } from "vitest";
import { extractFigureSubgraphDsl } from "./extract-figure-dsl";

/**
 * Reusable harness — parse the input, find the named group, extract
 * its subgraph, re-parse the result. Returns both halves so each test
 * can assert against the round-tripped diagram. Round-tripping is the
 * key contract: anything we emit must be valid DSL.
 */
function extractByName(fullDsl: string, groupName: string) {
  const { diagram } = parseDsl(fullDsl);
  const group = diagram.nodes.find((n) => n.name === groupName);
  if (!group) throw new Error(`Test setup: no group named "${groupName}"`);
  const emitted = extractFigureSubgraphDsl(fullDsl, group.id);
  if (!emitted) return { emitted: null, reparsed: null };
  const reparsed = parseDsl(emitted);
  return { emitted, reparsed };
}

describe("extractFigureSubgraphDsl", () => {
  it("emits a `figure` block with the leaves and their internal edges", () => {
    const dsl = `Architecture {
  Web [icon: globe]
  API
  Web > API: HTTPS
}`;
    const { emitted, reparsed } = extractByName(dsl, "Architecture");
    expect(emitted).not.toBeNull();
    expect(reparsed!.errors).toEqual([]);
    expect(emitted!.startsWith("figure ")).toBe(true);

    const fig = reparsed!.diagram.nodes.find((n) => n.name === "Architecture")!;
    expect(fig.isGroup).toBe(true);

    const web = reparsed!.diagram.nodes.find((n) => n.name === "Web")!;
    const api = reparsed!.diagram.nodes.find((n) => n.name === "API")!;
    expect(web.parentId).toBe(fig.id);
    expect(api.parentId).toBe(fig.id);
    expect(web.icon).toBe("globe");

    expect(reparsed!.diagram.edges).toHaveLength(1);
    expect(reparsed!.diagram.edges[0]!.label).toBe("HTTPS");
  });

  it("drops edges whose other endpoint lives outside the figure", () => {
    const dsl = `Architecture {
  Web
  API
  Web > API
}
ExternalDB
API > ExternalDB`;
    const { reparsed } = extractByName(dsl, "Architecture");
    expect(reparsed).not.toBeNull();
    expect(reparsed!.errors).toEqual([]);
    // Only the internal Web > API edge survives; API > ExternalDB
    // crosses the boundary so it's filtered out.
    expect(reparsed!.diagram.edges).toHaveLength(1);
    expect(reparsed!.diagram.nodes.find((n) => n.name === "ExternalDB")).toBeUndefined();
  });

  it("collects deeply nested descendants via BFS", () => {
    const dsl = `Outer {
  Inner {
    Leaf
  }
}`;
    const { reparsed } = extractByName(dsl, "Outer");
    expect(reparsed).not.toBeNull();
    expect(reparsed!.errors).toEqual([]);
    // v1: nested groups flatten in the saved DSL — only the top-level
    // figure header survives, deeper leaves get hoisted as direct
    // children. Documented limitation; this test pins it.
    const outer = reparsed!.diagram.nodes.find((n) => n.name === "Outer")!;
    const leaf = reparsed!.diagram.nodes.find((n) => n.name === "Leaf")!;
    expect(leaf.parentId).toBe(outer.id);
  });

  it("returns null when the node id isn't a group", () => {
    const dsl = `Web
API`;
    const { diagram } = parseDsl(dsl);
    const web = diagram.nodes.find((n) => n.name === "Web")!;
    expect(extractFigureSubgraphDsl(dsl, web.id)).toBeNull();
  });

  it("returns null for a non-existent node id", () => {
    expect(extractFigureSubgraphDsl("A > B", "does-not-exist")).toBeNull();
  });

  it("preserves edge color attribute when the edge has a label", () => {
    // DSL disambiguation rule: `A > B [attrs]` puts attrs on the
    // target node, not the edge. Only `A > B: label [attrs]` parses
    // attrs as edge attrs. So edge color survives the round trip only
    // when there's a label to anchor it.
    const dsl = `Cluster {
  A
  B
  A > B: link [color: red]
}`;
    const { reparsed } = extractByName(dsl, "Cluster");
    expect(reparsed!.diagram.edges[0]!.label).toBe("link");
    expect(reparsed!.diagram.edges[0]!.color).toBe("red");
  });

  it("emits a quoted figure name when the title has whitespace", () => {
    const dsl = `"My System" {
  X
}`;
    const { emitted } = extractByName(dsl, "My System");
    expect(emitted).not.toBeNull();
    // The quotes are mandatory so the re-parse doesn't mistake the
    // whitespace for a separator.
    expect(emitted!.includes(`"My System"`)).toBe(true);
  });
});
