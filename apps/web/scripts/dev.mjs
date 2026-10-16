import { prepareContent, runAstro } from "./prepare-content.mjs";

let source = "published";
const astroArgs = [];
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--content-source="))
    source = arg.slice("--content-source=".length);
  else astroArgs.push(arg);
}
// Keep Astro help/version available without network or content preparation.
if (
  astroArgs.some((arg) => ["--help", "-h", "--version", "-v"].includes(arg))
) {
  const result = runAstro(["dev", ...astroArgs], { docsRevision: "" });
  process.exitCode = result.status ?? 1;
} else {
  const selection = await prepareContent({ source });
  const result = runAstro(["dev", ...astroArgs], selection);
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
