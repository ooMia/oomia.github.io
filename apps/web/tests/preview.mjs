import { preview } from "astro";

// The programmatic API stays in Playwright's process tree, including agent environments.
const server = await preview({
  server: { host: "127.0.0.1", port: 4321 },
  logLevel: "error",
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void server.stop());
}
