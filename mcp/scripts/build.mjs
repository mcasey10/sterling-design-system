#!/usr/bin/env node
// Builds the Sterling MCP server into one file, dist/server.js, with its data inside it.
//   1. Copies the export (../ai/*.json) into data/, and writes data/meta.json: the server's version, the
//      export's version and release date, and a SHA-256 of the four files. The server carries its own copy
//      because it is meant to run from a folder with no access to this repository.
//   2. Bundles src/server.ts, the parts of the MCP SDK it uses, and data/ with esbuild.
//   3. Writes dist/build.json: the Node modules the bundle imports and the packages it contains.
// `npm test` fails if data/ or the bundle no longer matches ../ai (a stale copy), or if the bundle contains
// network code.
//
// Usage: npm run build          (npm run data does step 1 only, for the type-check)

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FILES = ["index.json", "components.json", "tokens.dtcg.json", "guidelines.json"];

/** The SHA-256 of the export's files, in FILES order: what `--version` prints and the tests compare. */
export function hashOf(dir) {
  const hash = createHash("sha256");
  for (const file of FILES) hash.update(readFileSync(resolve(dir, file)));
  return hash.digest("hex");
}

const source = resolve(here, "../ai");
const data = resolve(here, "data");
mkdirSync(data, { recursive: true });
for (const file of FILES) writeFileSync(resolve(data, file), readFileSync(resolve(source, file)));
const index = JSON.parse(readFileSync(resolve(source, "index.json"), "utf8"));
const meta = {
  version: JSON.parse(readFileSync(resolve(here, "package.json"), "utf8")).version,
  exportVersion: index.version,
  released: index.released,
  hash: hashOf(source),
};
writeFileSync(resolve(data, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

if (process.argv.includes("--data-only")) {
  console.log(`Copied the export to mcp/data/ (version ${meta.exportVersion}, data ${meta.hash.slice(0, 12)}).`);
} else {
  const { build } = await import("esbuild");
  const result = await build({
    metafile: true,
    entryPoints: [resolve(here, "src/server.ts")],
    outfile: resolve(here, "dist/server.js"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    logLevel: "warning",
    // Some of the SDK's dependencies are CommonJS and call require() for Node's own modules.
    banner: { js: 'import { createRequire as __createRequire } from "node:module";\nconst require = __createRequire(import.meta.url);' },
  });
  // What went into the bundle, from esbuild itself: the Node modules it imports at run time, and the packages
  // whose code it contains. The tests read this to confirm the server has no network code.
  const output = Object.values(result.metafile.outputs)[0];
  const packages = new Set();
  for (const input of Object.keys(result.metafile.inputs)) {
    const match = /node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(input.split("\\").join("/"));
    if (match) packages.add(match[1]);
  }
  const report = { nodeModules: output.imports.filter((i) => i.external).map((i) => i.path.replace(/^node:/, "")).sort(), packages: [...packages].sort() };
  writeFileSync(resolve(here, "dist/build.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`Built mcp/dist/server.js (version ${meta.version}, data ${meta.hash.slice(0, 12)}).`);
}
