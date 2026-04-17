// ESLint flat config for ReGen Civics.
//
// Philosophy: catch real bugs, stay quiet otherwise. Most rules are "warn" so
// the lint step never blocks CI. Tighten over time as the backlog shrinks.
//
// Companion check: scripts/check-palette.ts enforces the design-tokens.ts
// palette. Lint covers the rest (hooks, unused bindings, react-refresh).
//
// Run:
//   npm run lint          # surface warnings + errors
//   npm run lint:fix      # auto-fix what can be fixed

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      ".railway/**",
      "drizzle/**",
      "public/**",
      "client/public/**",
      "client/dist/**",
      "**/*.d.ts",
      "**/*.config.js",
      "**/*.config.ts",
      "**/*.config.mjs",
      "coverage/**",
      "archive/**",
      "scripts/**",
      ".drizzle/**",
      "*.mjs",
      "*.cjs",
    ],
  },
  // Base JS recommendations.
  js.configs.recommended,
  // TypeScript recommendations (non-type-aware to keep lint fast).
  ...tseslint.configs.recommended,
  // Client (browser) TS/TSX.
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Hook correctness. Errors because the runtime consequences are real.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // HMR-friendliness. Nudge only.
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // TypeScript quiet-mode: warn on unused, allow underscore escape hatch.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",

      // Real bugs.
      "no-debugger": "error",
      "no-unused-expressions": [
        "warn",
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
  // Server (Node) TS.
  {
    files: ["server/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-debugger": "error",
    },
  },
  // Tests: relax everything that tends to trip in vitest/jsdom.
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "server/**/__tests__/**",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
