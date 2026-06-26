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
