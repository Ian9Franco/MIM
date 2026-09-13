/**
 * ESLint profile that approximates Codacy Cloud on PR diffs.
 * Local eslint.config.mjs is intentionally looser (warnings, any off).
 * Codacy gate: zero new high-severity issues on the diff vs main.
 */
import baseConfig from "./eslint.config.mjs";
import { defineConfig } from "eslint/config";

const codacyStrictRules = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/no-require-imports": "error",
  "max-lines-per-function": ["error", { max: 50, skipBlankLines: true, skipComments: true }],
  complexity: ["error", { max: 10 }],
  "prefer-const": "error",
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "error",
};

export default defineConfig([
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: codacyStrictRules,
  },
  {
    files: ["scripts/**/*", "standalone/**/*"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
