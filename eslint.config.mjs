import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist/**",
    "recuperoMIM/**"
  ]),
  {
    // Turn down rule strictly to warning/off for scripts, APIs, workers and services
    files: [
      "app/api/**/*",
      "services/**/*",
      "workers/**/*",
      "scripts/**/*",
      "standalone/**/*"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  {
    // Relax globally to warning so it doesn't block the production build
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn"
    }
  }
]);

export default eslintConfig;
