import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import themeTokens from "./eslint-rules/theme-tokens.js";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "theme-tokens": themeTokens,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Theme-token enforcement: flag Hardcoded_Color usage in app source so colors derive from
  // Theme_Tokens (Requirements 7.1, 8.4, 1.7). Warning-level during stabilization; excludes the
  // enforcement infrastructure itself (theme-colors.ts) to avoid self-referential false positives.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/theme-colors.ts"],
    rules: {
      "theme-tokens/no-hardcoded-colors": "warn",
    },
  },
  // Real_Data binding: production Pages must not import Placeholder_Data from @/lib/mock-data
  // (Requirements 5.2). Warning-level during stabilization until per-phase page cleanup lands.
  {
    files: ["src/pages/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    rules: {
      "theme-tokens/no-mock-data-import": "warn",
    },
  },
);
