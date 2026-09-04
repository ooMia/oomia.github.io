import { mergeWith } from "es-toolkit"
import { type Config } from "prettier"

const base = {
  filepath: "",
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
} satisfies Config

// https://github.com/withastro/prettier-plugin-astro#readme
const astro = {
  plugins: ["prettier-plugin-astro"],
  astroAllowShorthand: true,
} satisfies Config

// https://github.com/oki07/prettier-plugin-astro-organize-imports#readme
const sortImports = {
  plugins: ["prettier-plugin-astro-organize-imports"],
} satisfies Config

const configs: Config[] = [
  base,
  astro,
  sortImports, // MUST come last
]

/**
 * @deprecated Migrating to `vite-plus/fmt`
 */
export default configs.reduce((target, source) =>
  mergeWith(target, source, (o1, o2) =>
    Array.isArray(o1) && Array.isArray(o2) ? [...o1, ...o2] : undefined
  )
)
