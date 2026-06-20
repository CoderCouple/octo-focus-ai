import { DataTable } from "@/components/data-table";
import { SectionCards, type SectionMetric } from "@/components/section-cards";
import data from "./data.json";

const CANVAS_METRICS: SectionMetric[] = [
  {
    description: "Canvases Created",
    value: "89",
    trend: { direction: "up", value: "+22%" },
    headline: "More diagrams this month",
    subtext: "Canvases across all projects",
  },
  {
    description: "AI Generated",
    value: "34",
    trend: { direction: "up", value: "+47%" },
    headline: "Prompt-to-diagram is climbing",
    subtext: "From DSL or natural-language prompts",
  },
  {
    description: "Edited Today",
    value: "12",
    trend: { direction: "up", value: "+5%" },
    headline: "Steady editing activity",
    subtext: "Canvases touched in the last 24h",
  },
  {
    description: "Shared",
    value: "21",
    trend: { direction: "up", value: "+8%" },
    headline: "Collaboration is up",
    subtext: "Canvases shared with workspace members",
  },
];

export default function CanvasListPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards metrics={CANVAS_METRICS} />
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}
