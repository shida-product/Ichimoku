import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
  {
    ignores: ["node_modules/", "dist/", "build/", ".venv/"],
  },
];
