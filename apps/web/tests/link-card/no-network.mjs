import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
// Disable telemetry in every preloaded child as well as the offline build wrapper.
process.env.ASTRO_TELEMETRY_DISABLED = "1";
function forbidden() {
  throw new Error("LinkCard build forbids fetch/http(s) requests");
}
globalThis.fetch = forbidden;
http.request = forbidden;
http.get = forbidden;
https.request = forbidden;
https.get = forbidden;
syncBuiltinESMExports();
