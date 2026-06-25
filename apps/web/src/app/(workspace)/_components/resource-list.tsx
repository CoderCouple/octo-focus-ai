/**
 * Shared list view for `/workspace/notes` and `/workspace/canvas` — both surface a flat
 * list of resources across the workspace's projects with a status filter
 * (All / Draft / Published) and a preview snippet.
 */
"use client";

import { FileText, LayoutGrid, Lock, Globe, Users, EyeOff } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Visibility = "private" | "unlisted" | "workspace" | "public";

export interface ResourceListItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  visibility: Visibility;
  publicSlug: string | null;
  contentMd?: string;
  updatedAt: string;
}

interface ResourceListProps {
  kind: "page" | "canvas";
  items: ResourceListItem[];
}

type StatusFilter = "all" | "draft" | "published";

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All",
  draft: "Drafts",
  published: "Published",
};

function statusOf(item: ResourceListItem): "draft" | "published" {
  // Draft = private or workspace-only. Published = anyone with link / public.
  return item.visibility === "private" || item.visibility === "workspace"
    ? "draft"
    : "published";
}

const VISIBILITY_META: Record<
  Visibility,
  { label: string; icon: typeof Lock; tone: string }
> = {
  private: { label: "Private", icon: Lock, tone: "text-muted-foreground" },
  workspace: { label: "Workspace", icon: Users, tone: "text-muted-foreground" },
  unlisted: { label: "Unlisted", icon: EyeOff, tone: "text-foreground" },
  public: { label: "Public", icon: Globe, tone: "text-foreground" },
};

export function ResourceList({ kind, items }: ResourceListProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    let draft = 0;
    let published = 0;
    for (const item of items) {
      if (statusOf(item) === "draft") draft++;
      else published++;
    }
    return { all: items.length, draft, published };
  }, [items]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => statusOf(item) === filter);
  }, [filter, items]);

  const Icon = kind === "page" ? FileText : LayoutGrid;
  const titleLabel = kind === "page" ? "Notes" : "Canvases";
  const emptyMessage =
    kind === "page"
      ? "No notes yet. Open a project to create one."
      : "No canvases yet. Open a project to draw one.";

  return (
    <section className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-8 py-5">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">{titleLabel}</h1>
          <p className="text-muted-foreground text-sm">
            {items.length === 0
              ? emptyMessage
              : `${items.length} ${kind === "page" ? "note" : "canvas"}${items.length === 1 ? "" : "es"} across your projects`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(["all", "draft", "published"] as const).map((status) => {
            const active = filter === status;
            const count = counts[status];
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {STATUS_LABEL[status]}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    active ? "bg-background/15 text-background" : "border-border text-muted-foreground border"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>
      {visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          {filter === "all" ? emptyMessage : `No ${filter} ${kind === "page" ? "notes" : "canvases"}.`}
        </div>
      ) : (
        <ul className="divide-y overflow-auto">
          {visible.map((item) => {
            const meta = VISIBILITY_META[item.visibility];
            const VisibilityIcon = meta.icon;
            return (
              <li key={item.id}>
                <Link
                  href={`/project/${item.projectId}`}
                  className="hover:bg-accent/40 flex items-start gap-4 px-8 py-4 transition-colors"
                >
                  <div className="border-border text-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-foreground truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        in {item.projectName}
                      </span>
                    </div>
                    {item.contentMd ? (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs whitespace-pre-wrap">
                        {item.contentMd.trim() || "Empty note"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 pt-1 text-xs">
                    <span className={`flex items-center gap-1 ${meta.tone}`}>
                      <VisibilityIcon className="size-3" />
                      {meta.label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
