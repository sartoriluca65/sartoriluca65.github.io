import { readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const read = name => readFile(resolve(root, name), "utf8");
const assets = {
  "/index.html": { type: "text/html; charset=utf-8", body: await read("index.html") },
  "/styles.css": { type: "text/css; charset=utf-8", body: await read("styles.css") },
  "/app.js": { type: "text/javascript; charset=utf-8", body: await read("app.js") },
  "/favicon.svg": { type: "image/svg+xml", body: await read("favicon.svg") },
  "/vendor/heic2any.min.js": { type: "text/javascript; charset=utf-8", body: await read("vendor/heic2any/heic2any.min.js") },
};
const workerTemplate = await read("worker/index.js");
if (!workerTemplate.includes("__SITE_ASSETS__")) throw new Error("Worker asset placeholder is missing.");
const worker = workerTemplate.replace("__SITE_ASSETS__", JSON.stringify(assets));
await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await writeFile(resolve(dist, "server/index.js"), worker);
await copyFile(resolve(root, ".openai/hosting.json"), resolve(dist, ".openai/hosting.json"));
console.log("Built the Luca STICKERS Worker and its static assets.");
