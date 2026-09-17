import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest configuration for NetLodge.
 *
 * Phase 0 establishes unit + integration test capability. E2E (browser-driven)
 * is handled by Playwright — see playwright.config.ts.
 *
 * `environment: "node"` is the default for Server Action / server-only logic
 * tests. Tests that exercise React components should opt-in per-file via:
 *   // @vitest-environment jsdom
 *
 * The React plugin is registered so JSX/TSX in integration tests compiles
 * with the same automatic JSX runtime that Next.js uses in production.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
      "tests/db/**/*.test.ts",
      "tests/security/**/*.test.ts",
    ],
    exclude: ["node_modules/**", "tests/e2e/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/types/database.generated.ts"],
    },
    setupFiles: ["./tests/setup.ts"],
  },
});
