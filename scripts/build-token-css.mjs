#!/usr/bin/env node
// Writes the token CSS (scripts/lib/token-css.mjs) to dist/tokens.css, or to the path given as the first
// argument. This is the file code consumes; never edit it by hand.
//
// Usage: npm run tokens:css   (output in dist/, which is gitignored)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTokens } from "./lib/tokens.mjs";
import { buildTokenCss } from "./lib/token-css.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? resolve(root, "dist/tokens.css"));
const css = buildTokenCss(loadTokens());
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, css);
console.log(`Wrote ${relative(process.cwd(), out)} (${css.split("\n").filter((l) => /^\s*--stl-/.test(l)).length} custom property declarations).`);
