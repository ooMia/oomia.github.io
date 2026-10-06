import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const manifestUrl = import.meta.resolve("astro/package.json");
const manifest = JSON.parse(readFileSync(new URL(manifestUrl), "utf8"));
const cli = fileURLToPath(new URL(manifest.bin.astro, manifestUrl));
const preload = fileURLToPath(new URL("./no-network.mjs", import.meta.url));
const fixture = process.argv.includes("--fixture");
const result = spawnSync(
  process.execPath,
  [
    cli,
    "build",
    ...(fixture
      ? ["--root", fileURLToPath(new URL("./astro/", import.meta.url))]
      : []),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${preload}`,
    },
  }
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
