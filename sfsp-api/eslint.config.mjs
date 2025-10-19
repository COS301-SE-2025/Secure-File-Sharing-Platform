import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";


export default defineConfig([
  {
    ignores: ["coverage/**", "node_modules/**"]
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  },
  {
    files: ["**/*.test.js", "**/__tests__/**/*.js", "**/tests/**/*.js", "**/filetests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        Buffer: "readonly"
      }
    }
  }
]);
