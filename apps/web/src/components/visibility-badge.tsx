import { EyeOff, Globe, Lock, Users, type LucideIcon } from "lucide-react";

type Visibility = "private" | "unlisted" | "workspace" | "public";

const META: Record<Visibility, { label: string; icon: LucideIcon }> = {
  private: { label: "Private", icon: Lock },
  workspace: { label: "Workspace", icon: Users },
  unlisted: { label: "Unlisted", icon: EyeOff },
  public: { label: "Public", icon: Globe },
};

/**
 * Inline icon + label for the Visibility column. Monochrome — the icon
 * inherits `text-muted-foreground` from the row so it sits quietly next
 * to the (sortable) text.
 */
export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const { label, icon: Icon } = META[visibility];
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5">
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
