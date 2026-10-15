// Fingerprints a Sterling Figma file, to show that a rebuild changed nothing it shouldn't have: take one before
// Build library and one after, then compare them. The fingerprint itself is scripts/lib/figma-fingerprint.js
// (read-only Figma Plugin API code: every library page, every variable, every text style).
//
//   node scripts/figma-fingerprint.mjs <file key or file address>
//       Prints the call for an AI tool connected to Figma's MCP server: its use_figma tool runs the code in that
//       file and returns the fingerprint. Save what it returns as JSON (before.json, after.json).
//   node scripts/figma-fingerprint.mjs compare <before.json> <after.json>
//       Compares two fingerprints row by row; exits 1 if any row differs.
//
// The file key is the part of the file's address after /design/. Use a duplicate of the Sterling file for
// anything but a release.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [first, ...rest] = process.argv.slice(2);

/** A fingerprint's rows: each page, then the variables and the text styles, as [count, hash]. */
const rows = (fingerprint) => [
  ...Object.entries(fingerprint.pages ?? {}).map(([page, value]) => [page, value]),
  ["Variables", fingerprint.variables],
  ["Text styles", fingerprint.textStyles],
];

if (first === "compare") {
  const [before, after] = rest.map((file) => JSON.parse(readFileSync(file, "utf8")));
  if (!before || !after) {
    console.error("Usage: node scripts/figma-fingerprint.mjs compare <before.json> <after.json>");
    process.exit(1);
  }
  const afterRows = new Map(rows(after));
  let differ = 0;
  for (const [name, value] of rows(before)) {
    const same = JSON.stringify(value) === JSON.stringify(afterRows.get(name));
    if (!same) differ++;
    const show = (v) => (Array.isArray(v) ? `${v[1]} (${v[0]})` : String(v));
    console.log(`${same ? "  same   " : "✗ differs"}  ${name}: ${show(value)}${same ? "" : ` → ${show(afterRows.get(name))}`}`);
    afterRows.delete(name);
  }
  for (const name of afterRows.keys()) {
    differ++;
    console.log(`✗ new      ${name}`);
  }
  console.log(`${differ} row(s) differ.`);
  process.exit(differ ? 1 : 0);
}

const key = first?.match(/\/design\/([0-9a-zA-Z]+)/)?.[1] ?? first;
if (!key || !/^[0-9a-zA-Z]{16,128}$/.test(key)) {
  console.error("Usage: node scripts/figma-fingerprint.mjs <file key or file address>");
  console.error("       node scripts/figma-fingerprint.mjs compare <before.json> <after.json>");
  process.exit(1);
}
const code = readFileSync(resolve(here, "lib/figma-fingerprint.js"), "utf8");
console.log(
  JSON.stringify(
    {
      fileKey: key,
      description: "Read-only fingerprint of a Sterling file: every library page, every variable, every text style. Changes nothing.",
      code,
    },
    null,
    2
  )
);
