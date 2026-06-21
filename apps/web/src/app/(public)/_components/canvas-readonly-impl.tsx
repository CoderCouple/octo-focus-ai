"use client";

import { useMemo } from "react";
import { loadSnapshot, Tldraw, type Editor, type TLStoreSnapshot } from "tldraw";
import "tldraw/tldraw.css";

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
    // Lock the editor down: hide UI chrome via instance state + flip readonly.
    editor.updateInstanceState({ isReadonly: true });
    // Frame the content nicely on first paint.
    setTimeout(() => editor.zoomToFit({ animation: { duration: 0 } }), 0);
  };

  return (
    <div className="bg-background h-full w-full">
      <Tldraw onMount={onMount} hideUi />
    </div>
  );
}
