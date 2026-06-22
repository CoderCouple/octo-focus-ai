"use client";

import { useMemo } from "react";
import { loadSnapshot, Tldraw, type Editor, type TLStoreSnapshot } from "tldraw";

export interface CanvasReadOnlyImplProps {
  initialDocument: unknown;
}

export function CanvasReadOnlyImpl({ initialDocument }: CanvasReadOnlyImplProps) {
  const snapshot = useMemo<TLStoreSnapshot | null>(() => {
    if (
      initialDocument &&
      typeof initialDocument === "object" &&
      Object.keys(initialDocument).length > 0
    ) {
      return initialDocument as TLStoreSnapshot;
    }
    return null;
  }, [initialDocument]);

  const onMount = (editor: Editor) => {
    if (snapshot) {
      try {
        loadSnapshot(editor.store, snapshot);
      } catch (err) {
        console.error("Failed to load canvas snapshot", err);
      }
    }
    // Lock the editor down: flip readonly.
    editor.updateInstanceState({ isReadonly: true });
    // Frame the content nicely on first paint — but only if there's content.
    // zoomToFit on an empty canvas collapses the viewport.
    setTimeout(() => {
      if (editor.getCurrentPageShapes().length > 0) {
        editor.zoomToFit({ animation: { duration: 0 } });
      }
    }, 0);
  };

  return (
    <div className="bg-background relative h-full w-full">
      <div className="absolute inset-0">
        <Tldraw onMount={onMount} hideUi />
      </div>
    </div>
  );
}
