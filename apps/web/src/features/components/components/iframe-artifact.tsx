"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { normalizeForLive } from "../lib/normalize-for-live";

// Pinned CDN versions so the iframe doesn't go stale if upstream
// majors break compatibility. Browser-caches after the first load.
const TAILWIND_CDN = "https://cdn.tailwindcss.com";
const REACT_CDN = "https://unpkg.com/react@18.3.1/umd/react.production.min.js";
const REACT_DOM_CDN =
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js";
const BABEL_CDN = "https://unpkg.com/@babel/standalone@7.24.7/babel.min.js";

/** Bridges errors back to the parent and renders them inline. */
const ERROR_BRIDGE = `
function __sendError(message) {
  try {
    window.parent.postMessage({ type: 'iframe-error', message: String(message) }, '*');
  } catch (e) {}
  var root = document.getElementById('root');
  if (root) {
    root.innerHTML =
      '<pre style="color:#dc2626;padding:1rem;font:14px ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;background:#fff5f5;border:1px solid #fecaca;border-radius:6px;margin:1rem">' +
      String(message).replace(/[&<>]/g, function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]}) +
      '</pre>';
  }
}
window.addEventListener('error', function (e) { __sendError(e.message || String(e.error)); });
window.addEventListener('unhandledrejection', function (e) {
  __sendError(e.reason && e.reason.message ? e.reason.message : String(e.reason));
});
`;

/** Hooks + helpers the user's code can reference without importing. */
const PRELUDE = `
var React = window.React;
var ReactDOM = window.ReactDOM;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useReducer = React.useReducer;
var useTransition = React.useTransition;
var useDeferredValue = React.useDeferredValue;
var useId = React.useId;
var useLayoutEffect = React.useLayoutEffect;
var useImperativeHandle = React.useImperativeHandle;
var useContext = React.useContext;
var useSyncExternalStore = React.useSyncExternalStore;
var createContext = React.createContext;
var Fragment = React.Fragment;
var memo = React.memo;
var forwardRef = React.forwardRef;
var lazy = React.lazy;
var Suspense = React.Suspense;
var StrictMode = React.StrictMode;
var createElement = React.createElement;
var Children = React.Children;

var __reactRoot = null;
function render(element) {
  var rootEl = document.getElementById('root');
  if (!__reactRoot) __reactRoot = ReactDOM.createRoot(rootEl);
  __reactRoot.render(element);
}
`;

function buildSrcDoc(code: string): string {
  // Safe to embed the user's code inside a `<script type="text/plain">`
  // tag — the HTML parser ignores it. We only need to escape closing
  // `</script>` so the tag can't be terminated early.
  const safeCode = code.replace(/<\/script>/gi, "<\\/script>");

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
    // Error bridge runs FIRST so even script-load failures get reported.
    "<script>",
    ERROR_BRIDGE,
    "</script>",
    `<script crossorigin src="${REACT_CDN}"></script>`,
    `<script crossorigin src="${REACT_DOM_CDN}"></script>`,
    `<script src="${BABEL_CDN}"></script>`,
    '<script id="__user_code" type="text/plain">',
    safeCode,
    "</script>",
    // Explicit transform + eval. We don't rely on Babel's auto-runScripts
    // (which races DOMContentLoaded inside iframes); this gives us
    // deterministic execution and proper error surfacing.
    "<script>",
    "(function(){",
    "try {",
    "if (!window.React || !window.ReactDOM) { __sendError('React or ReactDOM failed to load. Check your network.'); return; }",
    "if (!window.Babel) { __sendError('Babel failed to load. Check your network.'); return; }",
    "var raw = document.getElementById('__user_code').textContent;",
    "var compiled = Babel.transform(raw, { presets: [['env', { targets: { esmodules: true } }], 'react', 'typescript'], filename: 'component.tsx' }).code;",
    "var prelude = " + JSON.stringify(PRELUDE) + ";",
    "(0, eval)(prelude + '\\n' + compiled);",
    "window.parent.postMessage({ type: 'iframe-ready' }, '*');",
    "} catch (err) { __sendError(err && err.message ? err.message : String(err)); }",
    "})();",
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

interface IframeArtifactProps {
  code: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Claude-artifact-style live renderer. Compiles + runs the supplied
 * TSX inside a sandboxed iframe with Tailwind CDN preloaded.
 *
 * - Full Tailwind freedom (Tailwind Play CDN handles every variant)
 * - Style isolation from the host app
 * - Viewport units, fixed positioning, body-level layouts all work
 * - sandbox="allow-scripts" — no parent cookies, no top-level nav
 *
 * Runtime errors are postMessage'd back and shown as a small overlay
 * below the preview.
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
