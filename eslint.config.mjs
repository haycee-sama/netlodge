import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "src/types/database.generated.ts",
      "planning-docs/**",
      "upload/**",
      "download/**",
      "skills/**",
      "tool-results/**",
      "scripts/**",
      // Next.js-managed files — do not lint.
      "next-env.d.ts",
      ".next/types/**",
    ],
  },

  // Convert Next.js's legacy recommended configs to flat-config objects.
  // `compat.config()` may return an array (when the legacy config uses
  // `extends` chains); spread to flatten into the top-level array.
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),

  // Project-specific rule overrides — kept conservative for Phase 0.
  {
    rules: {
      // Blanket `any` is forbidden — TECHNICAL_ARCHITECTURE.md §12 (Type Safety).
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": "allow-with-description" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  // Prettier compatibility — disable conflicting ESLint style rules.
  prettierConfig,
];

export default eslintConfig;
