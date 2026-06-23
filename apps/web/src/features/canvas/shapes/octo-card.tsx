/**
 * Custom tldraw shape — a "card" with a real Lucide SVG icon next to
 * its label. This replaces the previous geo-shape-plus-emoji approach
 * for DSL-generated nodes, giving the from-code diagrams a polished,
 * production-y look.
 *
 * The shape extends BaseBoxShapeUtil so it gets a real bounding box,
 * resize handles, indicator, hit-test, etc. for free — arrows bind
 * normally and the rest of tldraw's machinery doesn't care it's
 * custom.
 *
 * Groups (isGroup=true) render as a dashed outline with the label at
 * the top — same visual story as before, just promoted to an SVG icon.
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
import { hasIcon, NodeIcon } from "./icon-registry";

export type OctoCardShape = TLBaseShape<
  "octo-card",
  {
    w: number;
    h: number;
    label: string;
    /** DSL `[icon: name]` — resolved via icon-registry at render time. */
    icon: string;
    /**
     * Color name from the DSL. The renderer translates to a hex value
     * for stroke/fill — we don't bind to tldraw's color enum so the
     * dashed group outline and the leaf-card stroke read the same.
     */
    color: string;
    /** `true` for `Name { … }` declarations. Renders as a dashed container. */
    isGroup: boolean;
  }
>;

const COLOR_TO_HEX: Record<string, string> = {
  black: "#0f172a",
  grey: "#64748b",
  gray: "#64748b",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  purple: "#8b5cf6",
  "light-blue": "#7dd3fc",
  lightblue: "#7dd3fc",
  "light-green": "#86efac",
  lightgreen: "#86efac",
  pink: "#f472b6",
  white: "#ffffff",
};

function resolveColor(value: string | undefined): string {
  if (!value) return "#0f172a";
  if (value.startsWith("#")) return value;
  return COLOR_TO_HEX[value.toLowerCase()] ?? "#0f172a";
}

// tldraw's ShapeUtil<Shape extends TLShape> closes the generic over the
// built-in shape union, so our custom OctoCardShape type doesn't satisfy
// it strictly. The runtime contract is fine — Shape just needs `id`,
// `type`, `props` etc. — so we widen via `as never` here. Same dodge
// applied to the indicator() arg type below.
// @ts-expect-error — custom shape type not in TLShape union
export class OctoCardShapeUtil extends ShapeUtil<OctoCardShape> {
  static override type = "octo-card" as const;

  static override props = {
    w: T.number,
    h: T.number,
    label: T.string,
    icon: T.string,
    color: T.string,
    isGroup: T.boolean,
  };

  override getDefaultProps(): OctoCardShape["props"] {
    return {
      w: 180,
      h: 56,
      label: "",
      icon: "",
      color: "black",
      isGroup: false,
    };
  }

  override canResize = (): boolean => true;
  override canEdit = (): boolean => false;

  override getGeometry(shape: OctoCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  // @ts-expect-error — same TLShape narrowing dodge as the class itself
  override onResize(shape: OctoCardShape, info: TLResizeInfo<OctoCardShape>) {
    return resizeBox(shape as never, info as never);
  }

  override getIndicatorPath(_shape: OctoCardShape) {
    // Returning undefined lets tldraw fall back to the indicator() JSX
    // below for selection outlines.
    return undefined;
  }

  override component(shape: OctoCardShape) {
    const { label, icon, color, isGroup, w, h } = shape.props;
    const stroke = resolveColor(color);
    const iconAvailable = hasIcon(icon);

    if (isGroup) {
      // Dashed outline container — children render on top.
      return (
        <HTMLContainer
          id={shape.id}
          style={{
            width: w,
            height: h,
            border: `2px dashed ${stroke}`,
            borderRadius: 10,
            background: "transparent",
            display: "flex",
            alignItems: "flex-start",
            padding: "8px 12px",
            color: stroke,
            fontFamily:
              "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.2,
            pointerEvents: "all",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {iconAvailable ? <NodeIcon name={icon} size={14} /> : null}
            <span>{label}</span>
          </span>
        </HTMLContainer>
      );
    }

    // Leaf card.
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: w,
          height: h,
          border: `1.5px solid ${stroke}`,
          borderRadius: 8,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          color: "#0f172a",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontSize: 13,
          fontWeight: 500,
          boxShadow: "0 1px 0 rgba(15, 23, 42, 0.05)",
          pointerEvents: "all",
        }}
      >
        {iconAvailable ? (
          <span
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `${stroke}1a`, // ~10% alpha
              color: stroke,
            }}
          >
            <NodeIcon name={icon} size={18} />
          </span>
        ) : null}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
      </HTMLContainer>
    );
  }

  override indicator(shape: OctoCardShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={shape.props.isGroup ? 10 : 8}
        ry={shape.props.isGroup ? 10 : 8}
      />
    );
  }
}
