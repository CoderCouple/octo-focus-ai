"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { normalizeForLive } from "../lib/normalize-for-live";

// Pinned CDN versions so the iframe doesn't go stale if upstream
// majors break compatibility. All three are heavily browser-cached
// after the first load so the cost is paid once per session.
const TAILWIND_CDN = "https://cdn.tailwindcss.com";
const REACT_CDN = "https://unpkg.com/react@18.3.1/umd/react.production.min.js";
const REACT_DOM_CDN =
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js";
const BABEL_CDN = "https://unpkg.com/@babel/standalone@7.24.7/babel.min.js";

/**
 * Runs inside the iframe before the user's code. Pulls every common
 * React hook + helper onto the global scope so the user's snippet can
 * write `useState` etc. without importing them, defines a `render()`
 * function that mounts to `#root`, and bridges runtime errors back to
 * the parent window via `postMessage` so the studio can show them in
 * red below the preview.
 */
const PRELUDE = `
const {
  useState, useEffect, useRef, useMemo, useCallback, useReducer,
  useTransition, useDeferredValue, useId, useLayoutEffect,
  useImperativeHandle, useContext, createContext, useSyncExternalStore,
  Fragment, memo, forwardRef, lazy, Suspense, StrictMode, createElement, Children,
} = React;

const render = (element) => {
  const rootEl = document.getElementById('root');
  if (!rootEl._reactRoot) rootEl._reactRoot = ReactDOM.createRoot(rootEl);
  rootEl._reactRoot.render(element);
};

function __sendError(message) {
  try {
    window.parent.postMessage({ type: 'iframe-error', message: String(message) }, '*');
  } catch (e) {}
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML =
      '<pre style="color:#dc2626;padding:1rem;font:14px ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;background:#fff5f5;border:1px solid #fecaca;border-radius:6px;margin:1rem">' +
      String(message).replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])) +
      '</pre>';
  }
}

window.addEventListener('error', (e) => __sendError(e.message || String(e.error)));
window.addEventListener('unhandledrejection', (e) =>
  __sendError(e.reason?.message ?? String(e.reason)),
);

window.parent.postMessage({ type: 'iframe-ready' }, '*');
`;

function buildSrcDoc(code: string): string {
  // Escape `</script>` in the user's code so it can't terminate the
  // script tag early. (`<\/script>` is identical to `</script>` once
  // parsed by JS, but the HTML parser doesn't see it as a closer.)
  const safe = code.replace(/<\/script>/gi, "<\\/script>");
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
    `<script src="${TAILWIND_CDN}"></script>`,
    "<style>",
    "html,body,#root{height:100%;margin:0;}",
    "body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;}",
    "</style>",
    "</head>",
    "<body>",
    '<div id="root"></div>',
    `<script crossorigin src="${REACT_CDN}"></script>`,
    `<script crossorigin src="${REACT_DOM_CDN}"></script>`,
    `<script src="${BABEL_CDN}"></script>`,
    '<script type="text/babel" data-presets="env,react,typescript">',
    PRELUDE,
    "try {",
    safe,
    "} catch (e) { __sendError(e?.message ?? String(e)); }",
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

interface IframeArtifactProps {
  code: string;
  className?: string;
  /** Inline styles for the wrapper — height is usually set here. */
  style?: React.CSSProperties;
}

/**
 * Claude-artifact-style live renderer. Compiles + runs the supplied
 * TSX inside a sandboxed iframe with Tailwind CDN preloaded, so the
 * component:
 *
 *   - has full Tailwind freedom (every color / shade / variant)
 *   - is style-isolated from the host app
 *   - can use viewport units, fixed positioning, body-level layouts
 *   - can't read the host's cookies or DOM (sandbox="allow-scripts" only)
 *
 * Runtime errors caught inside the iframe are postMessage'd up and
 * shown beneath the preview as a small overlay.
 */
export function IframeArtifact({ code, className, style }: IframeArtifactProps) {
  const [error, setError] = useState<string | null>(null);
  const normalized = useMemo(() => normalizeForLive(code ?? ""), [code]);
  const srcDoc = useMemo(() => buildSrcDoc(normalized), [normalized]);

  useEffect(() => {
    setError(null);
  }, [normalized]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data as { type?: string; message?: string } | null;
      if (!data || typeof data.type !== "string") return;
      if (data.type === "iframe-error" && typeof data.message === "string") {
        setError(data.message);
      } else if (data.type === "iframe-ready") {
        setError(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className={cn("bg-background relative h-full w-full", className)} style={style}>
      <iframe
        // Force a fresh document when the code changes — without a key
        // change React only updates srcDoc, but some browsers cache the
        // module-execution state.
        key={srcDoc.length}
        title="Generated component"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="h-full w-full border-0"
      />
      {error ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive absolute bottom-2 left-2 right-2 max-h-32 overflow-auto rounded border p-2 text-xs font-mono whitespace-pre-wrap"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
