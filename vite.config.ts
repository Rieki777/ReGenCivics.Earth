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
        // Only isolate react-vendor for long-term caching.
        // All other chunks are handled by Vite's automatic code splitting,
        // which is designed to avoid circular dependencies.
        //
        // Previous manual chunks (recharts, radix-ui, utils, sentry, icons,
        // framer-motion, trpc-vendor) created a fragile circular dependency
        // chain that broke whenever the module graph changed. The cycle was:
        //   recharts → utils → radix-ui → react-vendor → recharts
        // This caused React to be undefined at call time, crashing with:
        //   "Cannot read properties of undefined (reading 'forwardRef')"
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor';
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
