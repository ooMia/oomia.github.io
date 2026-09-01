import { dirname, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

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
  srcdoc: string;
  width: number;
  height: number;
}

const generatedDir = resolve("./node_modules/.cache/gravatar");

function getCachePath(username: string) {
  return resolve(generatedDir, `${username}.json`);
}

// https://docs.gravatar.com/embedding-profile-card/
async function fetchGravatarCard(username: string): Promise<GravatarCard> {
  const oembedUrl = new URL("https://api.gravatar.com/v3/oembed");

  oembedUrl.searchParams.set("url", `https://gravatar.com/${username}`);

  const oembedResponse = await fetch(oembedUrl);

  if (!oembedResponse.ok) {
    throw new Error(`Failed to fetch Gravatar oEmbed: ${oembedResponse.status}`);
  }

  const data: GravatarOEmbed = await oembedResponse.json();

  const cardUrl = `https://gravatar.com/${username}.card`;

  const cardResponse = await fetch(cardUrl);

  if (!cardResponse.ok) {
    throw new Error(`Failed to fetch Gravatar card: ${cardResponse.status}`);
  }

  return {
    srcdoc: await cardResponse.text(),
    width: Math.min(336, data.width),
    height: Math.min(402, data.height),
  };
}

export async function getGravatarCard(username: string): Promise<GravatarCard> {
  const cachePath = getCachePath(username);

  if (existsSync(cachePath)) {
    return JSON.parse(await readFile(cachePath, "utf8"));
  }

  const card = await fetchGravatarCard(username);

  await mkdir(dirname(cachePath), {
    recursive: true,
  });

  await writeFile(cachePath, JSON.stringify(card, null, 2), "utf8");

  return card;
}
