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
      ["scripts/**/*.test.ts", "node"],
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
      // scripts/ had the same hole until 2026-08-03. The build-time prerender
      // decides what every crawler reads on 18 blog URLs and no test could
      // reach it, which is how it shipped duplicate head tags pointing at the
      // homepage. Adding a glob here is the cheap half; the expensive half is
      // remembering that an unlisted directory reports green forever.
      "scripts/**/*.test.ts",
    ],
    setupFiles: ["client/src/test-setup.ts"],
    globalSetup: ["server/test-global-teardown.ts"],
  },
});
