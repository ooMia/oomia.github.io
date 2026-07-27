import assert from "node:assert";
import { parse, serialize } from "parse5";

const html_file = Bun.file("./expect/skin.html");

const html_text = await html_file.text();

const document = parse(html_text);
const serial = serialize(document);
assert.deepStrictEqual(document, parse(serial));

const dist_file = await Bun.write("./dist/skin.html", serial);
