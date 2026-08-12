import { type Config } from "prettier";
import { mergeWith } from "es-toolkit";

// https://github.com/withastro/prettier-plugin-astro#readme
const astro: Config = {
  plugins: ["prettier-plugin-astro"],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
  astroAllowShorthand: true,
};

// https://github.com/SanderRonde/prettier-plugin-sort-imports#readme
const sortImport: Config = {
  plugins: ["prettier-plugin-sort-imports"],
  sortingMethod: "alphabetical",
  sortingOrder: "ascending",
  stripNewlines: true,
};

const mergeConfig = (target: Config, source: Config): Config =>
  mergeWith(target, source, (target, source) =>
    Array.isArray(target) && Array.isArray(source) ? [...target, ...source] : undefined,
  );

export default [astro, sortImport].reduce(mergeConfig, {
  printWidth: 120,
});
