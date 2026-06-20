import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface SectionMetric {
  description: string
  value: string
  trend: { direction: "up" | "down"; value: string }
  headline: string
  subtext: string
}

const DEFAULT_METRICS: SectionMetric[] = [
  {
    description: "Notes Created",
    value: "1,250",
    trend: { direction: "up", value: "+12.5%" },
    headline: "Trending up this month",
    subtext: "New pages added in the last 6 months",
  },
  {
    description: "Drafts",
    value: "234",
    trend: { direction: "up", value: "+8%" },
    headline: "More drafts in progress",
    subtext: "Pages still being edited",
  },
  {
    description: "Published",
    value: "1,016",
    trend: { direction: "up", value: "+5.2%" },
    headline: "Steady publishing pace",
    subtext: "Live notes across projects",
  },
  {
    description: "Updated This Week",
    value: "87",
    trend: { direction: "up", value: "+18%" },
    headline: "Active edits this week",
    subtext: "Authors collaborating across pages",
  },
]

export function SectionCards({ metrics = DEFAULT_METRICS }: { metrics?: SectionMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {metrics.map((m) => {
        const TrendIcon = m.trend.direction === "up" ? IconTrendingUp : IconTrendingDown
        return (
          <Card key={m.description} className="@container/card">
            <CardHeader>
              <CardDescription>{m.description}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {m.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <TrendIcon />
                  {m.trend.value}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {m.headline} <TrendIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">{m.subtext}</div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
