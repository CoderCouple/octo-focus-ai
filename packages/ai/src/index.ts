import type { OctoFocusAIDiagram } from "@octofocus/diagrams";

export interface GenerateDiagramInput {
  prompt: string;
  type: OctoFocusAIDiagram["type"];
}

export function generateMockDiagram(input: GenerateDiagramInput): OctoFocusAIDiagram {
  return {
    type: input.type,
    title: input.prompt.slice(0, 80) || "Untitled diagram",
    direction: "right",
    nodes: [
      { id: "idea", label: "Idea", kind: "card", x: 0, y: 0 },
      { id: "diagram", label: "Diagram", kind: "card", x: 280, y: 0 },
      { id: "workspace", label: "Workspace", kind: "card", x: 560, y: 0 },
    ],
    edges: [
      { id: "idea-to-diagram", sourceId: "idea", targetId: "diagram", operator: ">", label: "becomes" },
      { id: "diagram-to-workspace", sourceId: "diagram", targetId: "workspace", operator: ">", label: "lives in" },
    ],
    metadata: {
      generatedBy: "mock",
    },
  };
}
