import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type UserConfig } from "vite";

export default defineConfig(({ mode }): UserConfig => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    minify: "esbuild",
    target: "es2020",
    cssMinify: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Function-based manualChunks is more reliable than object syntax for node_modules
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // React core — split first so it caches independently of app code
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor';
          // Routing
          if (id.includes('/wouter/')) return 'router';
          // tRPC + data fetching
          if (id.includes('/@trpc/') || id.includes('/@tanstack/')) return 'trpc-vendor';
          // Icons — large, changes rarely
          if (id.includes('/lucide-react/')) return 'icons';
          // Animation
          if (id.includes('/framer-motion/')) return 'framer-motion';
          // Charts
          if (id.includes('/recharts/') || id.includes('/victory-') || id.includes('/d3-')) return 'recharts';
          // Markdown / code rendering — very heavy, lazy-loaded pages only
          if (id.includes('/streamdown/') || id.includes('/mermaid/') || id.includes('/shiki/')) return 'streamdown';
          // Radix UI — used across the whole app, benefits from caching separately
          if (id.includes('/@radix-ui/')) return 'radix-ui';
          // Utility libs
          if (
            id.includes('/superjson/') ||
            id.includes('/zod/') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/') ||
            id.includes('/class-variance-authority/') ||
            id.includes('/cmdk/')
          ) return 'utils';
          // Error monitoring — load last
          if (id.includes('/@sentry/')) return 'sentry';
          // Heavy visualizations — only on Map/Chains pages
          if (id.includes('/cytoscape') || id.includes('/globe.gl/') || id.includes('/three/')) return 'visualization';
        },
      },
    },
  },
  // Drop console.log / debugger statements in production builds
  esbuild: mode === "production" ? { drop: ["console", "debugger"] } : undefined,
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
  },
}));
