import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";

/**
 * Shared Draft / Published pill used by every resource table. Monochrome
 * by design — the filled check is `fill-foreground` (black on light /
 * white on dark) rather than green so it fits the workspace's
 * black/white/grey palette.
 */
export function StatusBadge({ status }: { status: "Draft" | "Published" }) {
  return (
    <Badge variant="outline" className="text-muted-foreground px-1.5">
      {status === "Published" ? (
        <IconCircleCheckFilled className="fill-foreground" />
      ) : (
        <IconLoader />
      )}
      {status}
    </Badge>
  );
}
