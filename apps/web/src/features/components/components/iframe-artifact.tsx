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

/** Bridges JS errors inside the iframe back to the parent window. */
const ERROR_BRIDGE = `
<script>
function __sendError(message) {
  try {
    window.parent.postMessage({ type: 'iframe-error', message: String(message) }, '*');
  } catch (e) {}
}
window.addEventListener('error', function (e) { __sendError(e.message || String(e.error)); });
window.addEventListener('unhandledrejection', function (e) {
  __sendError(e.reason && e.reason.message ? e.reason.message : String(e.reason));
});
window.addEventListener('load', function () {
  try { window.parent.postMessage({ type: 'iframe-ready' }, '*'); } catch (e) {}
});
</script>
`;

const TSX_PRELUDE = `
var React = window.React;
var ReactDOM = window.ReactDOM;
var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef,
    useMemo = React.useMemo, useCallback = React.useCallback, useReducer = React.useReducer,
    useTransition = React.useTransition, useDeferredValue = React.useDeferredValue,
    useId = React.useId, useLayoutEffect = React.useLayoutEffect,
    useImperativeHandle = React.useImperativeHandle, useContext = React.useContext,
    useSyncExternalStore = React.useSyncExternalStore, createContext = React.createContext,
    Fragment = React.Fragment, memo = React.memo, forwardRef = React.forwardRef,
    lazy = React.lazy, Suspense = React.Suspense, StrictMode = React.StrictMode,
    createElement = React.createElement, Children = React.Children;
var __reactRoot = null;
function render(element) {
  var rootEl = document.getElementById('root');
  if (!__reactRoot) __reactRoot = ReactDOM.createRoot(rootEl);
  __reactRoot.render(element);
}
`;

/**
 * Robust HTML-document sniff: strip BOM + leading whitespace, then
 * regex-test the leading 500 chars. Catches stray case / whitespace
 * after `<!doctype`, missing newlines, etc.
 */
function isHtmlDocument(code: string): boolean {
  const head = code
    .replace(/^﻿/, "")
    .trimStart()
    .slice(0, 500);
  return /^(<!doctype\s+html|<html[\s>])/i.test(head);
}

/**
 * HTML mode: code is already a full HTML document. Splice the error
 * bridge into the existing `<head>` (or synthesize one) so runtime
 * errors get reported, then hand the rest off to srcDoc unchanged.
 */
function buildHtmlSrcDoc(html: string): string {
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, (_m, attrs) => `<head${attrs}>${ERROR_BRIDGE}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(
      /<html([^>]*)>/i,
      (_m, attrs) => `<html${attrs}><head>${ERROR_BRIDGE}</head>`,
    );
  }
  return `<!doctype html><html><head>${ERROR_BRIDGE}</head><body>${html}</body></html>`;
}

/**
 * TSX mode (legacy): wrap the snippet in a React + Tailwind + Babel
 * runtime so old blocks created before the HTML switchover keep
 * rendering. Hand-written TSX components paste-into-a-block also use
 * this path.
 */
function buildTsxSrcDoc(code: string): string {
  const normalized = normalizeForLive(code);
  const safe = normalized.replace(/<\/script>/gi, "<\\/script>");
  return [
    "<!DOCTYPE html>",
    '<html lang="en"><head>',
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
    `<script src="${TAILWIND_CDN}"></script>`,
    "<style>html,body,#root{height:100%;margin:0;}body{font-family:ui-sans-serif,system-ui,sans-serif;background:#fff;}</style>",
    ERROR_BRIDGE,
    "</head><body>",
    '<div id="root"></div>',
    `<script crossorigin src="${REACT_CDN}"></script>`,
    `<script crossorigin src="${REACT_DOM_CDN}"></script>`,
    `<script src="${BABEL_CDN}"></script>`,
    '<script id="__user_code" type="text/plain">',
    safe,
    "</script>",
    "<script>(function(){try{",
    "if(!window.React||!window.ReactDOM){__sendError('React or ReactDOM failed to load');return;}",
    "if(!window.Babel){__sendError('Babel failed to load');return;}",
    "var raw=document.getElementById('__user_code').textContent;",
    "var compiled=Babel.transform(raw,{presets:[['env',{targets:{esmodules:true}}],'react','typescript'],filename:'component.tsx'}).code;",
    "var prelude=" + JSON.stringify(TSX_PRELUDE) + ";",
    "(0,eval)(prelude+'\\n'+compiled);",
    "}catch(err){__sendError(err&&err.message?err.message:String(err));}})();</script>",
    "</body></html>",
  ].join("\n");
}

interface IframeArtifactProps {
  code: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Claude-artifact-style live renderer. The model emits a complete
 * HTML document and we hand it straight to a sandboxed iframe via
 * `srcDoc` — no Babel, no CDN, no React runtime.
 *
 * Legacy TSX blocks (generated before the HTML switchover) auto-fall
 * back to the React + Babel runtime so existing notes keep rendering.
 *
 * sandbox="allow-scripts" — no parent cookies, no top-level nav.
 * Runtime errors are postMessage'd back and shown as a small overlay.
 */
export function IframeArtifact({ code, className, style }: IframeArtifactProps) {
  const [error, setError] = useState<string | null>(null);

  const srcDoc = useMemo(() => {
    const trimmed = (code ?? "").trim();
    if (!trimmed) return "<!doctype html><html><body></body></html>";
    return isHtmlDocument(trimmed) ? buildHtmlSrcDoc(trimmed) : buildTsxSrcDoc(trimmed);
  }, [code]);

  useEffect(() => {
    setError(null);
  }, [srcDoc]);

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
