// Token checks that need no Figma file. Run: `npm run check:tokens` (repo root). Exits 1 on any failure.
// Optional argument: the path of another tokens file to check instead of tokens/tokens.json.
//   • Every published token (color, spacing, size, density) has a description in its group's "$descriptions".
//   • No description is left over for a token that no longer exists.
//   • tokens.json "$meta.version" matches the version in package.json.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTokens, entries } from "./lib/tokens.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = loadTokens(process.argv[2]);
const pkg = JSON.parse(readFileSync(resolve(here, "../package.json"), "utf8"));

const PUBLISHED_GROUPS = ["color", "spacing", "size", "density"];
const failures = [];
let described = 0;

for (const group of PUBLISHED_GROUPS) {
  const descriptions = tokens[group].$descriptions ?? {};
  const names = entries(tokens[group]).map(([name]) => name);
  for (const name of names) {
    const text = descriptions[name];
    if (typeof text === "string" && text.trim()) described++;
    else failures.push(`${group}: "${name}" has no description — add it to "$descriptions"`);
  }
  for (const name of Object.keys(descriptions)) {
    if (!names.includes(name)) failures.push(`${group}: "$descriptions" has an entry for "${name}", which isn't a token`);
  }
}

if (tokens.$meta?.version !== pkg.version) {
  failures.push(`version mismatch: tokens.json $meta.version is ${tokens.$meta?.version}, package.json is ${pkg.version}`);
}

for (const f of failures) console.error(`FAIL  ${f}`);
console.log(
  `${described} published tokens described across ${PUBLISHED_GROUPS.length} groups; version ${pkg.version} — ${failures.length} failure(s).`
);
process.exit(failures.length ? 1 : 0);
