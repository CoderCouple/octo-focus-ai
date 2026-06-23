"use client";

import { parseDsl } from "@octofocus/diagrams";
import { useEffect, useMemo, useRef } from "react";
import {
  createShapeId,
  getPointsFromDrawSegments,
  getSnapshot,
  loadSnapshot,
  Tldraw,
  type Editor,
  type TLArrowBinding,
  type TLDrawShape,
  type TLShape,
  type TLShapeId,
  type TLStoreSnapshot,
} from "tldraw";
import { env } from "@/env/client";
import { updateCanvasAction } from "../actions/canvases-actions";
import { syncDiagramToTldraw } from "../lib/diagram-to-tldraw";
import { detectShape, type Point } from "../lib/shape-detector";
import { OctoCardShapeUtil } from "../shapes/octo-card";

// Custom shape utils registered with Tldraw — extends the default set
// with our DSL-rendered `octo-card` shape.
const SHAPE_UTILS = [OctoCardShapeUtil];

// tldraw enforces a 5-second license timeout on production hostnames.
// NEXT_PUBLIC_TLDRAW_LICENSE_KEY suppresses that gate (or attaches the
// watermark, depending on the tier). Pass undefined locally / in dev so
// the SDK uses its free-development behaviour.
const TLDRAW_LICENSE_KEY = env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY || undefined;

const SAVE_DEBOUNCE_MS = 1200;
const DSL_PARSE_DEBOUNCE_MS = 500;
const BIND_DISTANCE_PX = 50;

export interface OctoCanvasProps {
  canvasId: string;
  initialDocument: unknown;
  /** When true, freehand pencil strokes try to snap to clean shapes. */
  autoShape: boolean;
  /** Diagram-as-code text. Changes are debounce-parsed and synced to canvas shapes. */
  dsl: string;
  /** Fires once tldraw has finished mounting; gives the parent the live editor. */
  onEditorReady?: (editor: Editor) => void;
  /**
   * Monotonic counter the parent bumps after From-code or Refine produces a
   * brand-new DSL. Triggers a zoom-to-fit ~600ms later — past the dsl-parse
   * debounce — so the freshly-generated diagram lands centred in view.
   */
  fitToContent?: number;
}

export function OctoCanvas({
  canvasId,
  initialDocument,
  autoShape,
  dsl,
  onEditorReady,
  fitToContent,
}: OctoCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const autoShapeRef = useRef(autoShape);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dslParseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextStoreChange = useRef(false);
  const lastSyncedDsl = useRef<string>(dsl);

  useEffect(() => {
    autoShapeRef.current = autoShape;
  }, [autoShape]);

  const snapshot = useMemo(() => {
    if (
      initialDocument &&
      typeof initialDocument === "object" &&
      Object.keys(initialDocument).length > 0
    ) {
      return initialDocument as TLStoreSnapshot;
    }
    return null;
  }, [initialDocument]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dslParseTimer.current) clearTimeout(dslParseTimer.current);
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (dsl === lastSyncedDsl.current) return;
    if (dslParseTimer.current) clearTimeout(dslParseTimer.current);
    dslParseTimer.current = setTimeout(() => {
      const result = parseDsl(dsl);
      if (result.errors.length > 0) return;
      suppressNextStoreChange.current = true;
      syncDiagramToTldraw(editor, result.diagram);
      lastSyncedDsl.current = dsl;
    }, DSL_PARSE_DEBOUNCE_MS);
  }, [dsl]);

  // Auto-fit after a parent-requested regeneration. Waits past the
  // DSL-parse debounce so the shapes exist before we zoom.
  useEffect(() => {
    if (!fitToContent) return;
    const t = setTimeout(() => {
      editorRef.current?.zoomToFit({ animation: { duration: 240 } });
    }, DSL_PARSE_DEBOUNCE_MS + 120);
    return () => clearTimeout(t);
  }, [fitToContent]);

  function onMount(editor: Editor) {
    editorRef.current = editor;
    if (snapshot) {
      try {
        loadSnapshot(editor.store, snapshot);
      } catch (error) {
        console.error("Failed to load canvas snapshot", error);
      }
    }
    if (dsl) {
      const result = parseDsl(dsl);
      if (result.errors.length === 0) {
        suppressNextStoreChange.current = true;
        syncDiagramToTldraw(editor, result.diagram);
        lastSyncedDsl.current = dsl;
      }
    }
    registerShapeDetection(editor, autoShapeRef);
    registerAutosave(editor);
    onEditorReady?.(editor);
  }

  function registerAutosave(editor: Editor) {
    editor.store.listen(
      () => {
        if (suppressNextStoreChange.current) {
          suppressNextStoreChange.current = false;
          return;
        }
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          const snap = getSnapshot(editor.store);
          void updateCanvasAction(canvasId, { document: snap }).then((r) => {
            if (!r.success) console.error("Canvas save failed", r.message);
          });
        }, SAVE_DEBOUNCE_MS);
      },
      { scope: "document", source: "user" },
    );
  }

  // tldraw needs the parent to have explicit pixel dimensions, not just
  // flex-derived dimensions — otherwise the viewport can collapse to 0x0
  // during mid-render layout passes and the editor renders invisibly.
  // Pin Tldraw to an absolute inset-0 wrapper.
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <Tldraw
          onMount={onMount}
          shapeUtils={SHAPE_UTILS}
          licenseKey={TLDRAW_LICENSE_KEY}
        />
      </div>
    </div>
  );
}

function registerShapeDetection(editor: Editor, isOn: React.MutableRefObject<boolean>) {
  function tryConvert(shape: TLDrawShape) {
    if (!isOn.current) return;
    if (!shape.props.isComplete) return;
    const worldPoints = extractWorldPoints(shape);
    if (worldPoints.length < 8) return;
    const detected = detectShape(worldPoints);
    if (!detected) return;
    const id = shape.id;
    setTimeout(() => convertShape(editor, id, detected), 0);
  }

  editor.sideEffects.registerAfterCreateHandler("shape", (shape) => {
    if (shape.type === "draw") tryConvert(shape as TLDrawShape);
  });

  editor.sideEffects.registerAfterChangeHandler("shape", (prev, next) => {
    if (next.type !== "draw") return;
    const prevDraw = prev as TLDrawShape;
    const nextDraw = next as TLDrawShape;
    if (prevDraw.props.isComplete || !nextDraw.props.isComplete) return;
    tryConvert(nextDraw);
  });
}

function extractWorldPoints(shape: TLDrawShape): Point[] {
  const local = getPointsFromDrawSegments(shape.props.segments);
  return local.map((p) => ({ x: shape.x + p.x, y: shape.y + p.y }));
}

function convertShape(
  editor: Editor,
  drawShapeId: TLShapeId,
  detected: NonNullable<ReturnType<typeof detectShape>>,
) {
  editor.run(() => {
    const drawShape = editor.getShape(drawShapeId);
    if (!drawShape) return;

    let newShapeId: TLShapeId | null = null;

    if (detected.kind === "circle" || detected.kind === "ellipse") {
      const w = detected.kind === "circle" ? detected.r * 2 : detected.rx * 2;
      const h = detected.kind === "circle" ? detected.r * 2 : detected.ry * 2;
      const x = detected.cx - w / 2;
      const y = detected.cy - h / 2;
      newShapeId = createShapeId();
      editor.createShape({
        id: newShapeId,
        type: "geo",
        x,
        y,
        props: { geo: "ellipse", w, h },
      });
    } else if (detected.kind === "rectangle") {
      newShapeId = createShapeId();
      editor.createShape({
        id: newShapeId,
        type: "geo",
        x: detected.x,
        y: detected.y,
        props: { geo: "rectangle", w: detected.w, h: detected.h },
      });
    } else if (detected.kind === "line") {
      const startPoint = { x: detected.x1, y: detected.y1 };
      const endPoint = { x: detected.x2, y: detected.y2 };
      const startShape = findGeoShapeNearPoint(editor, startPoint, drawShapeId);
      const endShape = findGeoShapeNearPoint(editor, endPoint, drawShapeId);

      const arrowId = createShapeId();
      editor.createShape({
        id: arrowId,
        type: "arrow",
        x: 0,
        y: 0,
        props: { start: startPoint, end: endPoint },
      });

      const bindings: Array<Omit<TLArrowBinding, "id" | "typeName">> = [];
      if (startShape) {
        bindings.push({
          fromId: arrowId,
          toId: startShape.id,
          type: "arrow",
          props: {
            terminal: "start",
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false,
            isPrecise: false,
            snap: "none",
          },
          meta: {},
        });
      }
      if (endShape) {
        bindings.push({
          fromId: arrowId,
          toId: endShape.id,
          type: "arrow",
          props: {
            terminal: "end",
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false,
            isPrecise: false,
            snap: "none",
          },
          meta: {},
        });
      }
      if (bindings.length > 0) editor.createBindings(bindings);
      newShapeId = arrowId;
    }

    editor.deleteShape(drawShapeId);
    if (newShapeId) editor.setSelectedShapes([newShapeId]);
  });
}

function findGeoShapeNearPoint(
  editor: Editor,
  point: Point,
  exclude: TLShapeId,
): TLShape | null {
  const shapes = editor.getCurrentPageShapes();
  let best: { shape: TLShape; dist: number } | null = null;
  for (const shape of shapes) {
    if (shape.id === exclude) continue;
    if (shape.type !== "geo") continue;
    const bounds = editor.getShapePageBounds(shape.id);
    if (!bounds) continue;
    const dx = Math.max(bounds.minX - point.x, 0, point.x - bounds.maxX);
    const dy = Math.max(bounds.minY - point.y, 0, point.y - bounds.maxY);
    const dist = Math.hypot(dx, dy);
    if (dist > BIND_DISTANCE_PX) continue;
    if (!best || dist < best.dist) best = { shape, dist };
  }
  return best?.shape ?? null;
}
