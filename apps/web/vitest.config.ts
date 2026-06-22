import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@octofocus/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@octofocus/diagrams": path.resolve(__dirname, "../../packages/diagrams/src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
});
