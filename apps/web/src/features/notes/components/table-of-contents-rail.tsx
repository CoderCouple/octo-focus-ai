"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Notion-style scroll-spy mini-map for a notes page. Renders a stack
 * of horizontal bars on the right edge of the editor pane, one per
 * heading. Bar width signals heading level (H1 widest, H3 narrowest);
 * the currently-visible heading is drawn in the foreground colour.
 *
 * Hidden when fewer than `minHeadings` headings are in the document
 * — no point in a TOC for a single section.
 *
 * Implementation:
 *   - heading list is derived from `editor.document` on every change
 *     (subscribes via `editor.onChange`).
 *   - active heading is tracked with an `IntersectionObserver` on the
 *     heading DOM elements (BlockNote tags each block container with
 *     `data-id="<blockId>"`).
 *   - clicking a bar scrolls the heading into view smoothly.
 */
interface TableOfContentsRailProps {
  editor: BlockNoteEditor<never, never, never>;
  /**
   * When fewer than this many headings exist, the rail hides. Keeps
   * short notes from looking decorated. Defaults to 3.
   */
  minHeadings?: number;
}

interface HeadingEntry {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

const LEVEL_WIDTH_CLASS: Record<1 | 2 | 3, string> = {
  1: "w-6",
  2: "w-4",
  3: "w-3",
};

function extractText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => {
      if (c && typeof c === "object" && "type" in c && c.type === "text" && "text" in c) {
        return typeof c.text === "string" ? c.text : "";
      }
      return "";
    })
    .join("");
}

function collectHeadings(blocks: unknown[]): HeadingEntry[] {
  const out: HeadingEntry[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const b = block as {
      type?: string;
      id?: string;
      props?: { level?: number };
      content?: unknown;
      children?: unknown[];
    };
    if (b.type === "heading" && typeof b.id === "string") {
      const rawLevel = b.props?.level ?? 1;
      const level = (rawLevel >= 1 && rawLevel <= 3 ? rawLevel : 1) as 1 | 2 | 3;
      out.push({ id: b.id, text: extractText(b.content), level });
    }
    if (Array.isArray(b.children) && b.children.length > 0) {
      out.push(...collectHeadings(b.children));
    }
  }
  return out;
}

export function TableOfContentsRail({
  editor,
  minHeadings = 3,
}: TableOfContentsRailProps) {
  const [headings, setHeadings] = useState<HeadingEntry[]>(() =>
    collectHeadings(editor.document as unknown[]),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const headingsRef = useRef(headings);
  headingsRef.current = headings;

  // Keep the heading list in sync with the editor document. BlockNote's
  // onChange fires on every keystroke; for the rail that's fine — the
  // computed list only updates when a heading is actually added,
  // removed, or its text changes.
  useEffect(() => {
    return editor.onChange(() => {
      const next = collectHeadings(editor.document as unknown[]);
      // Cheap structural equality check — avoid re-render if nothing
      // about the heading list changed (typical keystroke case).
      const prev = headingsRef.current;
      if (
        prev.length === next.length &&
        prev.every(
          (h, i) =>
            h.id === next[i]!.id &&
            h.text === next[i]!.text &&
            h.level === next[i]!.level,
        )
      ) {
        return;
      }
      setHeadings(next);
    });
  }, [editor]);

  // Scroll-spy: mark the heading nearest the top of the viewport as
  // active. `rootMargin` pushes the activation point ~30% down the
  // viewport so the highlighted bar reads as "the section I'm in",
  // not "the section that's barely visible at the top edge".
  useEffect(() => {
    if (headings.length < minHeadings) {
      setActiveId(null);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost heading currently intersecting. Fallback:
        // if nothing intersects this tick, leave the active id alone
        // (avoids flicker when scrolling fast).
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        const id = top.target.getAttribute("data-id");
        if (id) setActiveId(id);
      },
      {
        root: null,
        rootMargin: "0px 0px -70% 0px",
        threshold: 0,
      },
    );
    const observed: Element[] = [];
    for (const h of headings) {
      const el = document.querySelector(`[data-id="${h.id}"]`);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    }
    return () => observer.disconnect();
  }, [headings, minHeadings]);

  const visibleHeadings = useMemo(
    () => (headings.length >= minHeadings ? headings : []),
    [headings, minHeadings],
  );

  if (visibleHeadings.length === 0) return null;

  function jumpTo(id: string) {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      aria-label="Table of contents"
      className="pointer-events-none absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col items-end gap-1.5"
    >
      {visibleHeadings.map((h) => {
        const isActive = h.id === activeId;
        return (
          <button
            key={h.id}
            type="button"
            title={h.text || "Untitled heading"}
            onClick={() => jumpTo(h.id)}
            className={`pointer-events-auto h-[2px] rounded-full transition-colors ${
              LEVEL_WIDTH_CLASS[h.level]
            } ${
              isActive
                ? "bg-foreground"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
            }`}
            aria-label={h.text || "Untitled heading"}
            aria-current={isActive ? "true" : undefined}
          />
        );
      })}
    </nav>
  );
}
