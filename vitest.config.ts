import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  plugins: [react()],
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    globals: true,
    environmentMatchGlobs: [
      ["client/**/*.test.tsx", "jsdom"],
      ["client/**/*.spec.tsx", "jsdom"],
      ["client/**/*.test.ts", "jsdom"],
      ["server/**/*.test.ts", "node"],
      ["server/**/*.spec.ts", "node"],
      ["shared/**/*.test.ts", "node"],
    ],
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.tsx",
      "client/**/*.test.ts",
      "client/**/*.spec.tsx",
      // shared/ was absent until 2026-08-01, so a test written there ran zero
      // times and still reported green. Code both halves of the app depend on
      // was the one place tests could not reach.
      "shared/**/*.test.ts",
    ],
    setupFiles: ["client/src/test-setup.ts"],
    globalSetup: ["server/test-global-teardown.ts"],
  },
});
