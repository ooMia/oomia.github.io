import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import sharp from "sharp";

const manifest = "data/articles/derived/article-previews.json";
try {
  await access(manifest);
  throw new Error("Fixture requires an absent preview manifest");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const sourcePath = "content/articles/tech/log/publishing-platform-1.mdx";
const source = await readFile(`data/articles/${sourcePath}`);
const png = await sharp({
  create: { width: 1200, height: 630, channels: 3, background: "#fff" },
})
  .png()
  .toBuffer();
const sha256 = createHash("sha256").update(png).digest("hex");
const imagePath = `derived/article-previews/${sha256}.png`;
const build = () => {
  const result = spawnSync(process.execPath, ["tests/link-card/build.mjs"], {
    env: {
      ...process.env,
      SITE_URL: "https://oomia.github.io",
      BASE_PATH: "/",
    },
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr + result.stdout);
};
try {
  await mkdir("data/articles/derived/article-previews", { recursive: true });
  await writeFile(`data/articles/${imagePath}`, png);
  await writeFile(
    manifest,
    JSON.stringify({
      schemaVersion: 1,
      records: [
        {
          sourcePath,
          imagePath,
          sha256,
          bytes: png.length,
          width: 1200,
          height: 630,
          mediaType: "image/png",
        },
      ],
    })
  );
  build();
  const html = await readFile(
    "dist/articles/tech/log/publishing-platform-1/index.html",
    "utf8"
  );
  const url = `https://oomia.github.io/social-previews/${sha256}.png`;
  assert.match(html, new RegExp(`property="og:image" content="${url}"`));
  assert.match(html, new RegExp(`name="twitter:image" content="${url}"`));
  assert.deepEqual(await readFile(`dist/social-previews/${sha256}.png`), png);
  assert.deepEqual(await readFile(`data/articles/${sourcePath}`), source);
  console.log(
    "Preview-present build: absolute OG/X URLs, exact output bytes and authored source preservation passed."
  );
} finally {
  await rm(manifest, { force: true });
  await rm(`data/articles/${imagePath}`, { force: true });
}
build();
const html = await readFile(
  "dist/articles/tech/log/publishing-platform-1/index.html",
  "utf8"
);
assert.ok(!html.includes('property="og:image"'));
assert.ok(!html.includes('name="twitter:image"'));
console.log("Preview-absent build: non-image metadata remains valid.");
