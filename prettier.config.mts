import { mergeWith } from "es-toolkit";
import { type Config } from "prettier";

// https://github.com/withastro/prettier-plugin-astro#readme
const astro: Config = {
  plugins: ["prettier-plugin-astro"],
  astroAllowShorthand: true,
};

// https://github.com/oki07/prettier-plugin-astro-organize-imports#readme
const sortImports: Config = {
  plugins: ["prettier-plugin-astro-organize-imports"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};

const configs = [
  astro,
  sortImports, // MUST come last
];

export default configs.reduce(
  (target, source) =>
    mergeWith(target, source, (target, source) =>
      Array.isArray(target) && Array.isArray(source) ? [...target, ...source] : undefined,
    ),
  {
    printWidth: 120,
  },
);
