import { createShapeId, type Editor, type TLShapePartial } from "tldraw";
import { FIGURE_TITLE_HEIGHT } from "../shapes/figure-group";

const PADDING = 24;

/**
 * Wrap every currently-selected shape into a new `figure-group`. The
 * figure is sized to the selection bounding box + padding (and a title
 * strip on top), tldraw-parented to all selected shapes via
 * `reparentShapes`, and replaces the selection.
 *
 * Returns the new figure's shape id (or null if nothing was selected /
 * the selection has no measurable bounds).
 */
export function wrapSelectionInFigure(editor: Editor, label = "Figure"): string | null {
  const selectedIds = editor.getSelectedShapeIds();
  if (selectedIds.length === 0) return null;
  const bounds = editor.getSelectionPageBounds();
  if (!bounds) return null;

  const figureId = createShapeId();
  editor.run(() => {
    const shape: TLShapePartial = {
      id: figureId,
      type: "figure-group",
      x: bounds.x - PADDING,
      y: bounds.y - PADDING - FIGURE_TITLE_HEIGHT,
      props: {
        w: bounds.w + PADDING * 2,
        h: bounds.h + PADDING * 2 + FIGURE_TITLE_HEIGHT,
        label,
      },
    } as unknown as TLShapePartial;
    editor.createShapes([shape]);
    editor.reparentShapes(selectedIds, figureId);
    editor.setSelectedShapes([figureId]);
  });
  return figureId;
}

export type UnfigureResult =
  | { kind: "dissolved"; childCount: number }
  | { kind: "extracted"; shapeCount: number }
  | { kind: "noop" };

/**
 * Smart "ungroup" — operates on the current selection:
 *
 *   - figure-group selected → DISSOLVE: every child is unparented to
 *     the page, then the empty figure-group is deleted.
 *   - shapes inside a figure selected → EXTRACT: just those shapes
 *     are unparented; the figure stays with its remaining children.
 *   - anything else → no-op (the caller surfaces a friendly toast).
 *
 * Mixed selections (some inside a figure, some outside) extract only
 * the ones that are actually parented to a figure — predictable
 * partial behaviour beats throwing an error mid-gesture.
 */
export function ungroupSelection(editor: Editor): UnfigureResult {
  // Tldraw's TLShape union is closed over built-ins, so our custom
  // `figure-group` type isn't part of it. Treat the selection as a
  // loose shape record and check `type` / `parentId` ourselves.
  const selected = editor.getSelectedShapes() as ReadonlyArray<{
    id: string;
    type: string;
    parentId?: string;
  }>;
  if (selected.length === 0) return { kind: "noop" };

  // Case 1 — figure-group(s) selected directly → dissolve.
  const figureShapes = selected.filter((s) => s.type === "figure-group");
  if (figureShapes.length > 0 && figureShapes.length === selected.length) {
    let childCount = 0;
    editor.run(() => {
      for (const fig of figureShapes) {
        const childIds = editor.getSortedChildIdsForParent(fig.id as never);
        if (childIds.length > 0) {
          editor.reparentShapes(childIds, editor.getCurrentPageId());
          childCount += childIds.length;
        }
      }
      editor.deleteShapes(figureShapes.map((f) => f.id as never));
    });
    return { kind: "dissolved", childCount };
  }

  // Case 2 — shape(s) inside a figure selected → extract.
  const insideFigure = selected.filter((s) => {
    if (!s.parentId) return false;
    const parent = editor.getShape(s.parentId as never) as { type?: string } | undefined;
    return parent?.type === "figure-group";
  });
  if (insideFigure.length > 0) {
    editor.reparentShapes(
      insideFigure.map((s) => s.id as never),
      editor.getCurrentPageId(),
    );
    return { kind: "extracted", shapeCount: insideFigure.length };
  }

  return { kind: "noop" };
}
