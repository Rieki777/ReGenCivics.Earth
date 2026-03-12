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
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          router: ["wouter"],
          "trpc-vendor": ["@trpc/client", "@trpc/react-query", "@tanstack/react-query"],
          icons: ["lucide-react"],
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
