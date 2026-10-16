import type { AstroUserConfig } from "astro";

import literataUnicode from "@fontsource-variable/literata/unicode.json";
import { fontProviders } from "astro/config";

type LocalOptions = NonNullable<
  Parameters<
    ReturnType<typeof fontProviders.local>["resolveFont"]
  >[0]["options"]
>;

// Fontsource owns the subset boundaries. Retain every supplied Unicode range;
// the browser requests only the ranges used by the page, including future text.
function variants(
  packageName: string,
  slug: string,
  unicode: Record<string, string>,
  weights: Array<string | number>,
  styles: Array<"normal" | "italic"> = ["normal"]
): LocalOptions["variants"] {
  const result: LocalOptions["variants"][number][] = Object.entries(
    unicode
  ).flatMap(([subset, range]) =>
    weights.flatMap((weight) =>
      styles.map((style) => ({
        weight,
        style,
        unicodeRange: [range],
        src: [
          `${packageName}/files/${slug}-${subset.replaceAll("[", "").replaceAll("]", "")}-${typeof weight === "number" ? weight : "wght"}-${style}.woff2`,
        ],
      }))
    )
  );
  const [first, ...rest] = result;
  if (!first) throw new Error(`No font variants found for ${packageName}`);
  return [first, ...rest];
}

// Local provider reads the pinned packages directly: no CDN/provider request is
// needed during sync/build. Astro owns font copying, CSS and fallback metrics.
export const fonts = [
  {
    name: "Workshop Display",
    cssVariable: "--font-display",
    provider: fontProviders.local(),
    weights: ["300 700"],
    styles: ["normal"],
    options: {
      variants: [
        {
          src: ["./src/assets/space-grotesk-latin.woff2"],
          weight: "300 700",
          style: "normal",
        },
      ],
    },
  },
  {
    name: "Literata Variable",
    cssVariable: "--font-literata",
    provider: fontProviders.local(),
    weights: ["200 900"],
    styles: ["normal", "italic"],
    // Gowun handles Korean; Literata's fallback must not intercept it.
    fallbacks: [],
    options: {
      variants: variants(
        "@fontsource-variable/literata",
        "literata",
        literataUnicode,
        ["200 900"],
        ["normal", "italic"]
      ),
    },
  },
] satisfies NonNullable<
  AstroUserConfig<
    never,
    never,
    ReturnType<typeof fontProviders.local>[]
  >["fonts"]
>;
