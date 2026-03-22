import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type UserConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }): UserConfig => ({
  plugins: [
    react(),
    tailwindcss(),
    // VitePWA generates sw.js at build time — do not create a manual public/sw.js
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      workbox: {
        // 5 MB limit to accommodate large vendor JS chunks
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Exclude OG images — social crawlers always fetch fresh, no offline value
        globPatterns: ["**/*.{js,css,html,ico,webp,svg,woff2,png}"],
        globIgnores: ["og/**", "og-default.*"],
        // Serve offline.html when navigation requests fail (no network + not in cache)
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|webp|svg)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.(woff2|woff|ttf)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: {
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: false,
    }),
  ],
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
    // Ensure <link rel="modulepreload"> is injected for all entry chunks (polyfill for Safari < 17)
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        // Function-based manualChunks is more reliable than object syntax for node_modules
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // React core — split first so it caches independently of app code
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor';
          // Routing — intentionally NOT split into its own chunk.
          // Wouter in a separate chunk causes a React 19 init order error:
          // "Cannot set properties of undefined (setting 'Activity')"
          // because react-vendor hasn't finished initializing when wouter loads.
          // Keeping wouter in the main bundle ensures React is fully ready first.
          // if (id.includes('/wouter/')) return 'router';
          // tRPC + data fetching
          if (id.includes('/@trpc/') || id.includes('/@tanstack/')) return 'trpc-vendor';
          // Icons — large, changes rarely
          if (id.includes('/lucide-react/')) return 'icons';
          // Animation
          if (id.includes('/framer-motion/')) return 'framer-motion';
          // Charts
          if (id.includes('/recharts/') || id.includes('/victory-') || id.includes('/d3-')) return 'recharts';
          // Markdown / code rendering (streamdown, mermaid, shiki) — omitted from
          // manualChunks so Vite code-splits them as async chunks via React.lazy().
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
          // Heavy visualizations (cytoscape, globe.gl, three.js) — omitted from
          // manualChunks so Vite code-splits them as async chunks via React.lazy().
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
