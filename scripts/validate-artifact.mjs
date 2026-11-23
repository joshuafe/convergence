import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

console.log("Artifact is valid ESM and exports default.fetch");
for (const [pathname, contentType] of [["/", "text/html"], ["/lab/", "text/html"], ["/lab/app.js", "text/javascript"], ["/lab/engine.js", "text/javascript"], ["/lab/style.css", "text/css"], ["/lab/watch.html", "text/html"], ["/lab/watch.css", "text/css"]]) {
  const response = await workerModule.default.fetch(new Request("https://example.test" + pathname), {});
  assert.equal(response.status, 200, pathname + " must be served");
  assert(response.headers.get("Content-Type").startsWith(contentType));
  assert((await response.text()).length > 100);
}
const redirect = await workerModule.default.fetch(new Request("https://example.test/lab"), {});
assert.equal(redirect.status, 302);
assert.equal(redirect.headers.get("Location"), "https://example.test/lab/");
console.log("Original game and solo lab routes, module assets, and redirect are valid");

const walkthrough = await workerModule.default.fetch(new Request("https://example.test/lab/watch.html"), {});
assert.match(walkthrough.headers.get("Content-Security-Policy"), /media-src 'self' https:\/\/joshuafe\.github\.io\/convergence\/media\//);
for (const name of ["translation-lab-walkthrough.mp4", "translation-lab-walkthrough.jpg"]) {
  const [sourceMedia, publishedMedia] = await Promise.all([
    readFile(resolve(projectRoot, "media", name)),
    readFile(resolve(projectRoot, "docs/media", name)),
  ]);
  assert(sourceMedia.equals(publishedMedia), name + " must be copied without text conversion");
}
console.log("Walkthrough media is preserved byte-for-byte and allowed by the Worker policy");
