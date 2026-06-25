import type { CreatorSummary } from "@octofocus/shared";

/**
 * Compact "owner" cell — initials in a small bordered circle + name.
 * Renders "—" when there's no creator (legacy / pre-migration rows
 * that survived the dev wipe should be impossible, but the column
 * stays defensive).
 */
export function OwnerCell({ creator }: { creator: CreatorSummary | null }) {
  if (!creator) return <span className="text-muted-foreground">—</span>;
  const initials = creator.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="text-foreground inline-flex items-center gap-2 text-sm">
      <span
        className="border-border text-muted-foreground grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-medium"
        title={creator.email}
      >
        {initials || "?"}
      </span>
      <span className="truncate">{creator.name}</span>
    </span>
  );
}
