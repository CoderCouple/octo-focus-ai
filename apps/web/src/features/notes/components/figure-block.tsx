"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Frame, GripHorizontal, GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { getPublicFigureClientApi } from "@/features/figures";
import { FigureReadOnly } from "@/features/public/components/figure-readonly";

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 1400;
const DEFAULT_HEIGHT = 360;
const MIN_WIDTH = 360;
const MAX_WIDTH = 1600;
const DEFAULT_WIDTH = 760;

type ResizeDirection = "horizontal" | "vertical" | "both";

const PLACEHOLDER_DSL = `figure "New figure" {
  A
  B
  A > B
}`;

export const figureBlockConfig = {
  type: "figure" as const,
  propSchema: {
    /** Reference into the saved-figures table — the source of truth. */
    figureId: { default: "" },
    /**
     * DSL snapshot stored on the block at embed time. Used as a
     * fallback when the public fetch fails (figure private, network
     * down, share revoked). Same reference + snapshot model as the
     * generative-ui block uses for `code`.
     */
    dsl: { default: PLACEHOLDER_DSL },
    height: { default: DEFAULT_HEIGHT },
    width: { default: DEFAULT_WIDTH },
  },
  content: "none" as const,
};

/**
 * Figure block — embeds a saved canvas figure inside a note. Paste
 * an `/f/<id>` URL into the editor (handled by the editor's onPaste)
 * or insert via the slash menu and set figureId. On mount the block
 * fetches the latest DSL from the public endpoint and falls back to
 * the stored snapshot if that fails.
 */
export const FigureBlock = createReactBlockSpec(figureBlockConfig, {
  toExternalHTML: ({ block }) => {
    const dsl = (block.props.dsl as string) ?? "";
    return (
      <pre>
        <code className="language-octodsl">{dsl}</code>
      </pre>
    );
  },
  render: ({ block, editor }) => {
    const figureId = (block.props.figureId as string) || "";
    const snapshotDsl = (block.props.dsl as string) || PLACEHOLDER_DSL;
    const persistedHeight = (block.props.height as number) ?? DEFAULT_HEIGHT;
    const persistedWidth = (block.props.width as number) ?? DEFAULT_WIDTH;
    const isEditable = editor.isEditable;

    const [dsl, setDsl] = useState<string>(snapshotDsl);
    const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);

    const currentHeight = liveSize?.height ?? persistedHeight;
    const currentWidth = liveSize?.width ?? persistedWidth;

    // Hydrate from the source of truth whenever the embedded figureId
    // changes. Snapshot stays as the fallback so the block always has
    // something to render.
    useEffect(() => {
      if (!figureId) return;
      let alive = true;
      void getPublicFigureClientApi(figureId).then((fig) => {
        if (!alive || !fig) return;
        setDsl(fig.dsl);
        // Refresh the snapshot if the source figure has changed since
        // embed — keeps the published note view in sync with the
        // canvas. Only the editable view writes back.
        if (isEditable && fig.dsl !== snapshotDsl) {
          editor.updateBlock(block, { props: { dsl: fig.dsl } });
        }
      });
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [figureId]);

    function startResize(direction: ResizeDirection, event: React.MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startW = currentWidth;
      const startH = currentHeight;
      let finalW = startW;
      let finalH = startH;

      const onMove = (ev: MouseEvent) => {
        if (direction !== "vertical") {
          finalW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (ev.clientX - startX)));
        }
        if (direction !== "horizontal") {
          finalH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + (ev.clientY - startY)));
        }
        setLiveSize({ width: finalW, height: finalH });
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        setLiveSize(null);
        const updates: Record<string, number> = {};
        if (direction !== "vertical") updates.width = finalW;
        if (direction !== "horizontal") updates.height = finalH;
        editor.updateBlock(block, { props: updates });
      };

      document.body.style.cursor =
        direction === "horizontal"
          ? "ew-resize"
          : direction === "vertical"
            ? "ns-resize"
            : "nwse-resize";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }

    return (
      <div
        className="bg-card group relative w-full max-w-full overflow-hidden rounded-xl border"
        style={{ maxWidth: "100%", width: currentWidth }}
      >
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Frame className="h-4 w-4" />
            Figure
            {figureId ? (
              <span className="text-muted-foreground font-mono text-[10px] font-normal">
                {figureId}
              </span>
            ) : null}
          </div>
        </header>
        <div className="bg-background overflow-hidden" style={{ height: currentHeight }}>
          <FigureReadOnly dsl={dsl} />
        </div>
        {isEditable ? (
          <FigureResizeHandles startResize={startResize} />
        ) : null}
      </div>
    );
  },
});

function FigureResizeHandles({
  startResize,
}: {
  startResize: (direction: ResizeDirection, event: React.MouseEvent) => void;
}) {
  return (
    <>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={(e) => startResize("horizontal", e)}
        className="hover:bg-accent absolute top-12 bottom-3 right-0 flex w-2 cursor-ew-resize items-center justify-center border-l opacity-0 transition-opacity group-hover:opacity-100"
        title="Drag to resize width"
      >
        <GripVertical className="text-muted-foreground h-3 w-3" />
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        onMouseDown={(e) => startResize("vertical", e)}
        className="hover:bg-accent absolute right-3 bottom-0 left-0 flex h-2 cursor-ns-resize items-center justify-center border-t opacity-0 transition-opacity group-hover:opacity-100"
        title="Drag to resize height"
      >
        <GripHorizontal className="text-muted-foreground h-3 w-3" />
      </div>
      <div
        role="separator"
        aria-label="Resize"
        onMouseDown={(e) => startResize("both", e)}
        className="hover:bg-accent absolute right-0 bottom-0 grid h-3 w-3 cursor-nwse-resize place-items-center opacity-0 transition-opacity group-hover:opacity-100"
        title="Drag to resize"
      >
        <span className="text-muted-foreground text-[10px] leading-none">⤡</span>
      </div>
    </>
  );
}
