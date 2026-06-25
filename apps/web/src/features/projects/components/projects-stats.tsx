import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectsStats as ProjectsStatsModel } from "../lib/derive-projects-stats";

interface Tile {
  key: keyof ProjectsStatsModel;
  label: string;
  badge: string;
  badgeTrend: "up" | "down" | "flat";
  bold: string;
  hint: string;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function buildTiles(stats: ProjectsStatsModel): Tile[] {
  const draftPct = pct(stats.drafts, stats.total);
  const publishedPct = pct(stats.published, stats.total);
  const updatedPct = pct(stats.updatedLast7d, stats.total);

  return [
    {
      key: "total",
      label: "Projects",
      badge: stats.createdLast7d > 0 ? `+${stats.createdLast7d}` : "0",
      badgeTrend: stats.createdLast7d > 0 ? "up" : "flat",
      bold:
        stats.createdLast7d > 0
          ? `${stats.createdLast7d} created this week`
          : "No new projects this week",
      hint: "In this workspace",
    },
    {
      key: "drafts",
      label: "Drafts",
      badge: `${draftPct}%`,
      badgeTrend: draftPct >= 50 ? "down" : "up",
      bold: draftPct >= 50 ? "Mostly in progress" : "Mostly shipped",
      hint: "Private + workspace-only",
    },
    {
      key: "published",
      label: "Published",
      badge: `${publishedPct}%`,
      badgeTrend: publishedPct >= 50 ? "up" : "down",
      bold: publishedPct >= 50 ? "Mostly live" : "Mostly drafts",
      hint: "Public or unlisted",
    },
    {
      key: "updatedLast7d",
      label: "Updated 7d",
      badge: `${updatedPct}%`,
      badgeTrend: updatedPct >= 30 ? "up" : "down",
      bold: updatedPct >= 30 ? "Active week" : "Quiet week",
      hint: "Touched in the last 7 days",
    },
  ];
}

export function ProjectsStats({ stats }: { stats: ProjectsStatsModel }) {
  const tiles = buildTiles(stats);
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6 dark:*:data-[slot=card]:bg-card">
      {tiles.map((t) => {
        const TrendIcon =
          t.badgeTrend === "up"
            ? IconTrendingUp
            : t.badgeTrend === "down"
              ? IconTrendingDown
              : null;
        return (
          <Card key={t.key} className="@container/card">
            <CardHeader>
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stats[t.key].toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  {TrendIcon ? <TrendIcon /> : null}
                  {t.badge}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {t.bold}
                {TrendIcon ? <TrendIcon className="size-4" /> : null}
              </div>
              <div className="text-muted-foreground">{t.hint}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
