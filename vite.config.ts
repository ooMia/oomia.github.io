import { defineConfig } from "vite-plus"

export default defineConfig({
  staged: {
    "*.{js,ts,tsx}": "vp fmt --write --no-error-on-unmatched-pattern",
    "apps/web/**/*.astro": "vp exec --filter web -- prettier --write",
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  // https://oxc.rs/docs/guide/usage/formatter/sorting.html
  fmt: {
    sortImports: {
      groups: [
        "type-import",
        ["value-builtin", "value-external"],
        "type-internal",
        "value-internal",
        ["type-parent", "type-sibling", "type-index"],
        ["value-parent", "value-sibling", "value-index"],
        "unknown",
      ],
    },
    endOfLine: "lf",
    semi: false,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "es5",
    printWidth: 80,
    astroAllowShorthand: true,
    sortPackageJson: {
      sortScripts: true,
    },
    sortTailwindcss: {
      stylesheet: "packages/ui/src/styles/globals.css",
      functions: ["cn", "cva"],
    },
    ignorePatterns: [
      "coverage/",
      "pnpm-lock.yaml",
      ".pnpm-store/",
      "**/.turbo/",
      "**/node_modules/",
      "apps/web/dist/",
      "apps/web/.astro/",
    ],
  },
})
