import globals from "globals";
import tseslint from "typescript-eslint";
import pluginImport from "eslint-plugin-import";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es6,
      },
    },
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: pluginImport,
    },
    settings: {
      "import/resolver": {
        typescript: {},
      },
    },
    rules: {
      ...pluginImport.configs.recommended.rules,
      ...pluginImport.configs.electron.rules,
      ...pluginImport.configs.typescript.rules,
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];