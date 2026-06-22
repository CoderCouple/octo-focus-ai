import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CanvasStats } from "../lib/derive-canvas-stats";

const TILES: Array<{ key: keyof CanvasStats; label: string; hint: string }> = [
  { key: "total", label: "Canvases", hint: "Across your projects" },
  { key: "drafts", label: "Drafts", hint: "Private + workspace-only" },
  { key: "published", label: "Published", hint: "Public or unlisted" },
  { key: "editedLast7d", label: "Edited 7d", hint: "Touched in the last week" },
];

export function CanvasesStats({ stats }: { stats: CanvasStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
      {TILES.map((tile) => (
        <Card key={tile.key} className="@container/card">
          <CardHeader>
            <CardDescription>{tile.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats[tile.key].toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-muted-foreground text-sm">{tile.hint}</CardFooter>
        </Card>
      ))}
    </div>
  );
}
