import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
function forbidden() {
  throw new Error("LinkCard build forbids fetch/http(s) requests");
}
globalThis.fetch = forbidden;
http.request = forbidden;
http.get = forbidden;
https.request = forbidden;
https.get = forbidden;
syncBuiltinESMExports();
