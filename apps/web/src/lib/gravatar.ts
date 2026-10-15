import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface GravatarOEmbed {
  version: string;
  type: "rich";
  title: string;
  width: number;
  height: number;
  maxwidth: number;
  maxheight: number;
  html: string;
  provider_name: string;
  provider_url: string;
  cache_age: number;
}

interface GravatarCard {
  src: string;
  width: number;
  height: number;
}

const generatedDir = resolve("./node_modules/.cache/gravatar");

function getCachePath(username: string) {
  return resolve(generatedDir, `${username}.json`);
}

function isGravatarCard(value: unknown, src: string): value is GravatarCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<GravatarCard>;
  return (
    card.src === src &&
    typeof card.width === "number" &&
    Number.isFinite(card.width) &&
    card.width > 0 &&
    typeof card.height === "number" &&
    Number.isFinite(card.height) &&
    card.height > 0
  );
}

// https://docs.gravatar.com/embedding-profile-card/
async function fetchGravatarCard(username: string): Promise<GravatarCard> {
  const oembedUrl = new URL("https://api.gravatar.com/v3/oembed");

  oembedUrl.searchParams.set("url", `https://gravatar.com/${username}`);

  const oembedResponse = await fetch(oembedUrl);

  if (!oembedResponse.ok) {
    throw new Error(
      `Failed to fetch Gravatar oEmbed: ${oembedResponse.status}`
    );
  }

  const data: GravatarOEmbed = await oembedResponse.json();

  const src = `https://gravatar.com/${username}.card`;
  const card = {
    src,
    width: data.width,
    height: data.height,
  };

  if (!isGravatarCard(card, src)) {
    throw new Error("Gravatar oEmbed returned invalid card dimensions");
  }

  return card;
}

export async function getGravatarCard(username: string): Promise<GravatarCard> {
  const cachePath = getCachePath(username);

  if (existsSync(cachePath)) {
    const cached = await readFile(cachePath, "utf8");
    try {
      const card: unknown = JSON.parse(cached);
      if (isGravatarCard(card, `https://gravatar.com/${username}.card`)) {
        return { src: card.src, width: card.width, height: card.height };
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    // Legacy srcdoc and incomplete caches need fresh oEmbed geometry. The card
    // document and its subresources now belong to the browser's lazy iframe.
  }

  const card = await fetchGravatarCard(username);

  await mkdir(dirname(cachePath), {
    recursive: true,
  });

  await writeFile(cachePath, JSON.stringify(card, null, 2), "utf8");

  return card;
}
