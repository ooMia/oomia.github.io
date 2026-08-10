import { type Config } from "prettier";

// https://github.com/withastro/prettier-plugin-astro/blob/main/README.md
const astroConfig: Config = {
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

const configs: Config[] = [astroConfig];

const config: Config = {
  printWidth: 120,
  plugins: configs.flatMap(({ plugins }) => plugins ?? []),
  overrides: configs.flatMap(({ overrides }) => overrides ?? []),
};

export default config;
