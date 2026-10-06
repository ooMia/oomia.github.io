import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";

// Build probe, not a production security sandbox. Propagated to Node workers.
function forbidden() {
  throw new Error("Markdown spike forbids fetch/http(s) requests during build");
}
globalThis.fetch = forbidden;
http.request = forbidden;
http.get = forbidden;
https.request = forbidden;
https.get = forbidden;
syncBuiltinESMExports();
