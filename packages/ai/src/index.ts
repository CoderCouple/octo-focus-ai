import type { OctoDiagram } from "@octo/diagrams";

export interface GenerateDiagramInput {
  prompt: string;
  type: OctoDiagram["type"];
}

export function generateMockDiagram(input: GenerateDiagramInput): OctoDiagram {
  return {
    type: input.type,
    title: input.prompt.slice(0, 80) || "Untitled diagram",
    nodes: [
      { id: "idea", label: "Idea", kind: "card", x: 0, y: 0 },
      { id: "diagram", label: "Diagram", kind: "card", x: 280, y: 0 },
      { id: "workspace", label: "Workspace", kind: "card", x: 560, y: 0 },
    ],
    edges: [
      { id: "idea-to-diagram", sourceId: "idea", targetId: "diagram", label: "becomes" },
      { id: "diagram-to-workspace", sourceId: "diagram", targetId: "workspace", label: "lives in" },
    ],
    metadata: {
      generatedBy: "mock",
    },
  };
}
