export interface CodeToDiagramDto {
  dsl: string;
  detectedKind: "architecture" | "sequence" | "er" | "flowchart";
}
