/**
 * Canvas export dialog. Drives one-shot SVG generation client-side
 * (editor.getSvgString), uploads the bytes through the api, then shows the
 * resulting public URL + markdown snippet ready to paste into BlockNote.
 *
 * Lists prior exports of the same canvas so the user can grab a URL again
 * or revoke a stale one.
 */
"use client";

import { Check, Copy, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Editor } from "tldraw";
import {
  createCanvasExportApi,
  listCanvasExportsApi,
  revokeCanvasExportApi,
  type CanvasAsset,
} from "@/api/canvas-assets-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CanvasExportDialogProps {
  canvasId: string;
  /** Returns the current tldraw editor instance, or null if it isn't ready yet. */
  getEditor: () => Editor | null;
}

export function CanvasExportDialog({ canvasId, getEditor }: CanvasExportDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ImageIcon className="size-3.5" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export canvas as image</DialogTitle>
          <DialogDescription>
            Generate an SVG with a stable public URL. Paste the URL into any note to embed it; the
            image renders the canvas at the moment you exported.
          </DialogDescription>
        </DialogHeader>
        {open ? <ExportBody canvasId={canvasId} getEditor={getEditor} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ExportBody({ canvasId, getEditor }: CanvasExportDialogProps) {
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<CanvasAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setAssets(await listCanvasExportsApi(canvasId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId]);

  const handleExport = async () => {
    setError(null);
    const editor = getEditor();
    if (!editor) {
      setError("Canvas isn't ready yet.");
      return;
    }
    const shapes = editor.getCurrentPageShapeIds();
    if (shapes.size === 0) {
      setError("Draw something on the canvas first.");
      return;
    }
    setBusy(true);
    try {
      const result = await editor.getSvgString([...shapes], {
        background: true,
        padding: 16,
        scale: 1,
      });
      if (!result) throw new Error("tldraw returned no SVG.");
      const base64 = typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(result.svg))) : "";
      await createCanvasExportApi(canvasId, {
        format: "svg",
        content: base64,
        contentType: "image/svg+xml",
        width: Math.round(result.width),
        height: Math.round(result.height),
        title: `canvas-${new Date().toISOString().slice(0, 10)}`,
        visibility: "public",
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={handleExport} disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
          Generate SVG
        </Button>
        <p className="text-muted-foreground text-xs">
          Each export gets its own URL. Older ones stay valid until revoked.
        </p>
      </div>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      <div className="space-y-2">
        <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
          Exports
        </div>
        {assets === null ? (
          <div className="text-muted-foreground text-xs">Loading…</div>
        ) : assets.length === 0 ? (
          <div className="text-muted-foreground text-xs">No exports yet.</div>
        ) : (
          <div className="space-y-1.5">
            {assets.map((asset) => (
              <ExportRow key={asset.id} asset={asset} onRevoke={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExportRow({ asset, onRevoke }: { asset: CanvasAsset; onRevoke: () => void }) {
  const [copiedKind, setCopiedKind] = useState<"url" | "md" | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = async (text: string, kind: "url" | "md") => {
    await navigator.clipboard.writeText(text);
    setCopiedKind(kind);
    setTimeout(() => setCopiedKind(null), 1500);
  };

  return (
    <div className="bg-accent/30 flex items-center gap-2 rounded px-2 py-1.5 text-xs">
      <ImageIcon className="size-3 shrink-0" />
      <code className="text-muted-foreground truncate text-[11px]">{asset.url}</code>
      {asset.revokedAt ? (
        <span className="text-muted-foreground rounded bg-red-500/10 px-1.5 py-0.5 text-[10px]">
          Revoked
        </span>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 gap-1 px-1.5 text-[10px]"
            onClick={() => copy(asset.url, "url")}
          >
            {copiedKind === "url" ? <Check className="size-3" /> : <Copy className="size-3" />}
            URL
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-[10px]"
            onClick={() => copy(asset.markdown, "md")}
          >
            {copiedKind === "md" ? <Check className="size-3" /> : <Copy className="size-3" />}
            MD
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await revokeCanvasExportApi(asset.id);
                onRevoke();
              } finally {
                setBusy(false);
              }
            }}
            aria-label="Revoke"
            title="Revoke"
          >
            <Trash2 className="size-3" />
          </Button>
        </>
      )}
    </div>
  );
}
