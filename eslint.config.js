import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const bunFiles = ["index.ts", "server/**/*.ts"];

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.cache/**",
    "**/coverage/**",
    "*.lock",
  ]),
  eslint.configs.recommended,
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["client/**/*.{ts,tsx}"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: bunFiles,
    languageOptions: {
      globals: {
        ...globals.bunBuiltin,
      },
    },
  },
  {
    files: ["client/**/*.tsx"],
    ...react.configs.flat.recommended,
    ...react.configs.flat["jsx-runtime"],
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
      },
    },
    settings: { react: { version: "detect" } },
  },
  {
    files: ["client/**/*.tsx"],
    ...reactHooks.configs.flat.recommended,
  },
  eslintConfigPrettier,
]);
