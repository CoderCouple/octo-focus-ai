/**
 * Eraser-style figure group — a framed, titled container for a cluster
 * of nodes. Replaces the previous dashed `octo-card` representation
 * for group declarations. Children are tldraw-parented to the figure
 * (`parentId: figureId`) so dragging the figure carries everything
 * inside; resize follows the same hand-resize semantics as octo-card.
 *
 * Strict monochrome per the project theme: white body, grey 1px
 * border, off-white title strip with bold black title. The DSL `color`
 * attribute is intentionally ignored on figures so groups read the
 * same regardless of how the source diagram was tagged.
 */
import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  T,
  type TLBaseShape,
  type TLResizeInfo,
} from "tldraw";

export type FigureGroupShape = TLBaseShape<
  "figure-group",
  {
    w: number;
    h: number;
    label: string;
  }
>;

const TITLE_HEIGHT = 32;
const CHILD_PADDING = 16;

// Tldraw's ShapeUtil<Shape extends TLShape> closes the generic over
// the built-in shape union, so custom shape types don't satisfy it
// strictly. Runtime contract is fine; same widening dodge as OctoCard.
// @ts-expect-error — custom shape type not in TLShape union
export class FigureGroupShapeUtil extends ShapeUtil<FigureGroupShape> {
  static override type = "figure-group" as const;

  static override props = {
    w: T.number,
    h: T.number,
    label: T.string,
  };

  override getDefaultProps(): FigureGroupShape["props"] {
    return { w: 320, h: 200, label: "Figure" };
  }

  override canResize = (): boolean => true;
  override canEdit = (): boolean => false;
  // Figures sit BEHIND their children visually — children draw on top.
  override hideRotateHandle = (): boolean => true;

  override getGeometry(shape: FigureGroupShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override getIndicatorPath(_shape: FigureGroupShape) {
    // Returning undefined lets tldraw fall back to the indicator()
    // JSX below for selection outlines. The shape util protocol
    // requires this method as a FUNCTION (not optional) — without it
    // tldraw throws `getIndicatorPath is not a function` from
    // `areRecordsEqual` the first time the store derives equality.
    return undefined;
  }

  // @ts-expect-error — same TLShape narrowing dodge as the class itself
  override onResize(shape: FigureGroupShape, info: TLResizeInfo<FigureGroupShape>) {
    const next = resizeBox(shape as never, info as never) as unknown as {
      x: number;
      y: number;
      props: { w: number; h: number };
    };
    // Clamp to children bounds — dragging the figure smaller than its
    // contents snaps back to "just barely fits everything inside +
    // padding". Children stay visible regardless of user gesture.
    const childIds = this.editor.getSortedChildIdsForParent(shape.id);
    if (childIds.length === 0) return next as unknown as FigureGroupShape;
    let maxRight = 0;
    let maxBottom = TITLE_HEIGHT;
    for (const cid of childIds) {
      const child = this.editor.getShape(cid);
      if (!child) continue;
      const bounds = this.editor.getShapeGeometry(child).bounds;
      maxRight = Math.max(maxRight, child.x + bounds.maxX);
      maxBottom = Math.max(maxBottom, child.y + bounds.maxY);
    }
    const minW = maxRight + CHILD_PADDING;
    const minH = maxBottom + CHILD_PADDING;
    next.props.w = Math.max(next.props.w, minW);
    next.props.h = Math.max(next.props.h, minH);
    return next as unknown as FigureGroupShape;
  }

  override component(shape: FigureGroupShape) {
    const { label, w, h } = shape.props;
    // Figures saved via `Save figure` get their `figureId` written
    // onto `meta`. When that's present the title bar shows a drag
    // handle that initiates a native HTML5 drag carrying the figure
    // id — the notes editor's `onDropCapture` recognises this and
    // inserts a figure block at the drop position.
    const figureId = (shape.meta as { figureId?: string } | undefined)?.figureId;

    const handleDragStart = (event: React.DragEvent<HTMLSpanElement>) => {
      if (!figureId) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-octofocus-figure-id", figureId);
      // Plain-text fallback — useful if the drop target strips the
      // custom mime type, or for cross-window drag.
      const url = `${window.location.origin}/f/${figureId}`;
      event.dataTransfer.setData("text/plain", url);
      // Tldraw listens for pointer events on the canvas; stop the
      // drag start from also triggering shape-move logic.
      event.stopPropagation();
    };

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: w,
          height: h,
          background: "#ffffff",
          border: "1px solid #d4d4d8",
          borderRadius: 10,
          boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
          overflow: "hidden",
          pointerEvents: "all",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            height: TITLE_HEIGHT,
            flex: "0 0 auto",
            background: "#f4f4f5",
            borderBottom: "1px solid #e4e4e7",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 10px",
            fontSize: 12,
            fontWeight: 600,
            color: "#18181b",
            letterSpacing: 0.2,
          }}
        >
          <span
            aria-hidden
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: 4,
              background: "#18181b",
              color: "#ffffff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            F
          </span>
          <span
            style={{
              flex: 1,
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {label}
          </span>
          {figureId ? (
            <span
              draggable
              onDragStart={handleDragStart}
              onPointerDownCapture={(e) => e.stopPropagation()}
              title="Drag into a note to embed this figure"
              role="button"
              aria-label="Drag to embed in a note"
              style={{
                flex: "0 0 auto",
                cursor: "grab",
                userSelect: "none",
                padding: "2px 4px",
                borderRadius: 4,
                color: "#71717a",
                fontSize: 12,
                lineHeight: 1,
                letterSpacing: -1,
              }}
            >
              ⋮⋮
            </span>
          ) : null}
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: FigureGroupShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={10} ry={10} />;
  }
}

export const FIGURE_TITLE_HEIGHT = TITLE_HEIGHT;
