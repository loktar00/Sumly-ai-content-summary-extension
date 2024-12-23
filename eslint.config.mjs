import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.js"], languageOptions: {sourceType: "script"}},
  {languageOptions: { globals: {
    ...globals.browser,
    chrome: 'readonly',
    markdownToHtml: 'readonly',
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    alert: 'readonly'
  }}},
  pluginJs.configs.recommended,
  {rules: {
    'indent': ['error', 4]
  }}
];
