import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "node:path";

/**
 * Electron-vite splits the build into three targets:
 *   - main:     Node.js process (electron app lifecycle)
 *   - preload:  Bridge between main and renderer (contextIsolation safe)
 *   - renderer: Vite + React (Tailwind v4 via the official plugin)
 *
 * `externalizeDepsPlugin` keeps node_modules out of the main/preload
 * bundles — Electron resolves them at runtime instead of bundling
 * them in (which is what we want for native modules like `keytar`
 * once PR2 lands).
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
      // Sandboxed preload scripts (sandbox: true on the BrowserWindow)
      // run in a context that doesn't support ES modules — Electron's
      // sandbox bundle only knows how to evaluate CommonJS at preload
      // time. Force the lib output to CJS with a `.js` extension so
      // the main process's `preload:` path points at a loadable file.
      lib: {
        entry: resolve(__dirname, "src/preload/index.ts"),
        formats: ["cjs"],
        fileName: () => "index.js",
      },
    },
  },
  renderer: {
    root: resolve(__dirname),
    plugins: [react(), tailwindcss()],
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer"),
      },
    },
  },
});
