import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside Next's server bundle; it's a no-op in tests.
      "server-only": path.resolve(import.meta.dirname, "src/test/empty-module.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Run date logic in LA time so time-zone bugs show up.
    env: { TZ: "America/Los_Angeles" },
  },
});
