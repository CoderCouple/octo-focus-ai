import { Users } from "lucide-react";

/**
 * "Reviewers" cell — count of active shares on the resource. We don't
 * fetch each reviewer's name on the list endpoint (cheap COUNT only) so
 * the cell shows the count with a people icon; clicking the row opens
 * the resource where the SharePopover lists names.
 */
export function ReviewersCell({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="text-foreground inline-flex items-center gap-1.5 text-sm">
      <Users className="text-muted-foreground size-3.5" />
      {count}
    </span>
  );
}
