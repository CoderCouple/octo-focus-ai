import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";

/**
 * Electron-vite split into two targets after the Part C pivot:
 *   - main:     Node.js process (app lifecycle + sidecar + tray)
 *   - preload:  Bridge between main and renderer (CJS, sandboxed-safe)
 *
 * The renderer target is gone — the BrowserWindow loads the hosted
 * OctoFocusAI web app directly. No local React bundle to build.
 *
 * `externalizeDepsPlugin` keeps node_modules out of the main/preload
 * bundles so native modules are resolved at runtime instead of
 * being bundled.
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      lib: { entry: resolve(__dirname, "src/main/index.ts") },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      // Sandboxed preload can't evaluate ESM; force CJS output so the
      // main process's `webPreferences.preload` path loads cleanly.
      lib: {
        entry: resolve(__dirname, "src/preload/index.ts"),
        formats: ["cjs"],
        fileName: () => "index.js",
      },
    },
  },
});
