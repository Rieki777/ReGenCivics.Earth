/**
 * Vite config for the UI harness. Separate from the app's vite.config.ts on
 * purpose: no proxy, no CSP headers, no auth, no server. Just the components.
 *
 * Run it with `pnpm ui:harness` (dev server) or `pnpm ui:shots` (screenshots).
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const here = import.meta.dirname;

export default defineConfig({
  root: here,
  plugins: [react(), tailwindcss()],
  resolve: {
    // Array form because order matters: the trpc stub has to win over the
    // broader "@" alias, and Vite takes the first matching prefix.
    alias: [
      { find: "@/lib/trpc", replacement: path.resolve(here, "trpc-stub.tsx") },
      { find: "@shared", replacement: path.resolve(here, "..", "shared") },
      { find: "@", replacement: path.resolve(here, "..", "client", "src") },
    ],
  },
  // Serve the app's real static assets so self-hosted fonts and images
  // resolve; otherwise everything silently falls back to system fonts.
  publicDir: path.resolve(here, "..", "client", "public"),
  server: { port: 5199, strictPort: true },
  // The harness is a dev tool. Nothing here is ever built for production.
  build: { outDir: path.resolve(here, ".out") },
});
