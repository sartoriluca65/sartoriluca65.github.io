import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerPath = resolve(root, "dist/server/index.js");
const manifestPath = resolve(root, "dist/.openai/hosting.json");
const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const worker = await import(moduleUrl);
assert.equal(typeof worker.default?.fetch, "function", `${pathToFileURL(workerPath)} must export default.fetch`);
const home = await worker.default.fetch(new Request("https://luki-stickers.example/"));
assert.equal(home.status, 200);
assert.match(await home.text(), /Luki STICKERS/);
const api = await worker.default.fetch(new Request("https://luki-stickers.example/api/ai/sticker", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
assert.equal(api.status, 400);
console.log("Worker artifact is valid and serves the app and AI endpoint.");
