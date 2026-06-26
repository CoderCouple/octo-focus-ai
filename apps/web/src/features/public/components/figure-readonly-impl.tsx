"use client";

import { parseDsl } from "@octofocus/diagrams";
import { Tldraw, type Editor } from "tldraw";
import { env } from "@/env/client";
import { syncDiagramToTldraw } from "@/features/canvas/lib/diagram-to-tldraw";
import { FigureGroupShapeUtil } from "@/features/canvas/shapes/figure-group";
import { OctoCardShapeUtil } from "@/features/canvas/shapes/octo-card";

// Same custom shape utils as the editable canvas — without these the
// figure's `octo-card` leaves and `figure-group` container fail to
// render in the public embed view.
const SHAPE_UTILS = [OctoCardShapeUtil, FigureGroupShapeUtil];

// Same license-gate suppression as the editable canvas — the public
// figure embed lives on the production hostname and would otherwise
// trip the 5-second watermark dialog.
const TLDRAW_LICENSE_KEY = env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY || undefined;

export interface FigureReadOnlyImplProps {
  dsl: string;
}

/**
 * Public figure embed — parses the DSL into a diagram, syncs the
 * resulting shapes into a read-only tldraw instance, frames the
 * content. Used by `/f/<id>` and by the figure note block when it
 * needs to render an embedded subgraph for visitors without an
 * account.
 */
export function FigureReadOnlyImpl({ dsl }: FigureReadOnlyImplProps) {
  const onMount = (editor: Editor) => {
    try {
      const { diagram } = parseDsl(dsl);
      syncDiagramToTldraw(editor, diagram);
    } catch (err) {
      console.error("Failed to render figure DSL", err);
    }
    editor.updateInstanceState({ isReadonly: true });
    // Frame the figure on first paint, give the layout one tick to settle.
    setTimeout(() => {
      if (editor.getCurrentPageShapes().length > 0) {
        editor.zoomToFit({ animation: { duration: 0 } });
      }
    }, 50);
  };

  return (
    <div className="bg-background relative h-full w-full">
      <div className="absolute inset-0">
        <Tldraw
          onMount={onMount}
          shapeUtils={SHAPE_UTILS}
          hideUi
          licenseKey={TLDRAW_LICENSE_KEY}
        />
      </div>
    </div>
  );
}
