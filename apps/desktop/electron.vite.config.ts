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
      lib: { entry: resolve(__dirname, "src/preload/index.ts") },
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
