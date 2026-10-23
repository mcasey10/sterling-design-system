#!/usr/bin/env node
// Raw-value check for a demo run: a copy of Sterling's own check (ui/scripts/check-css.mjs), with the folder to
// check and the token file as arguments instead of Sterling's src/. The rules are the same:
//
// Fails on, in any .css file under the folder:
//   • a color that isn't a token: hex, rgb(), hsl(), and other color functions
//   • a length or time with a fixed unit: px, rem, em, pt, ms, s (0 needs no unit)
//   • a number where a design value belongs: font-weight, font-size, line-height, z-index, letter-spacing,
//     opacity other than 0 / 1
//   • var(--stl-…) that names no token and isn't a custom property defined in the same file or set from code
// and on a raw color or px value in an inline style in a .tsx file.
//
// Allowed: tokens, 0, percentages, viewport and fr units, unitless multipliers inside calc(), and keywords.
//
// Usage: node check-css.mjs --dir <run>/src --tokens <run>/node_modules/sterling-ui/dist/styles.css [--json <file>]

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const src = arg("--dir") && resolve(arg("--dir"));
const tokensFile = arg("--tokens") && resolve(arg("--tokens"));
const jsonOut = arg("--json");
if (!src || !tokensFile) {
  console.error("Usage: node check-css.mjs --dir <run>/src --tokens <run>/node_modules/sterling-ui/dist/styles.css [--json <file>]");
  process.exit(2);
}
if (!existsSync(src) || !existsSync(tokensFile)) {
  console.error(`Missing: ${!existsSync(src) ? src : tokensFile}`);
  process.exit(2);
}

const defined = (css) => new Set([...css.matchAll(/(--stl-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const tokens = defined(readFileSync(tokensFile, "utf8"));

function files(dir, ext) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name), ext) : entry.name.endsWith(ext) ? [join(dir, entry.name)] : []
  );
}

const RULES = [
  [/#[0-9a-fA-F]{3,8}\b/, "a hex color"],
  [/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/, "a color function"],
  [/(?<![\w.-])\d*\.?\d+(?:px|rem|em|pt|ms|s)\b/, "a fixed length or time"],
];
const NUMERIC = /^(font-weight|font-size|line-height|z-index|letter-spacing)$/;

const setInCode = new Set(files(src, ".tsx").flatMap((file) => [...readFileSync(file, "utf8").matchAll(/["'`](--stl-[a-z0-9-]+)["'`]\s*:/g)].map((m) => m[1])));

const problems = [];
let declarations = 0;
for (const file of files(src, ".css")) {
  const name = relative(src, file).replace(/\\/g, "/");
  const css = readFileSync(file, "utf8");
  const local = defined(css);
  const code = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  for (const declaration of code.matchAll(/(?<=[{;]\s*)(--[a-z0-9-]+|[a-z-]+)\s*:\s*([^;{}]+?)\s*(?=[;}])/g)) {
    declarations++;
    const [, property, value] = declaration;
    const where = `${name}:${code.slice(0, declaration.index).split("\n").length}`;
    const rest = value.replace(/var\(\s*--[a-z0-9-]+\s*\)/g, "");
    for (const [pattern, what] of RULES) {
      const found = pattern.exec(rest);
      if (found) problems.push(`${where}  ${property}: ${value}  — "${found[0]}" is ${what}, not a token`);
    }
    if (NUMERIC.test(property) && /(?<![\w.-])\d*\.?\d+(?![\w%.-])/.test(rest)) {
      problems.push(`${where}  ${property}: ${value}  — a plain number where a token belongs`);
    }
    if (property === "opacity" && !/^(0|1)$/.test(rest.trim())) {
      problems.push(`${where}  ${property}: ${value}  — an opacity other than 0 or 1`);
    }
    for (const [, used] of value.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
      if (!tokens.has(used) && !local.has(used) && !setInCode.has(used)) problems.push(`${where}  ${property}: ${value}  — ${used} is not a token, nor a property defined here or set in code`);
    }
  }
}

for (const file of files(src, ".tsx")) {
  const name = relative(src, file).replace(/\\/g, "/");
  readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    if (!/style\s*=|(?:width|height|padding|margin|gap|color|background|border|fontSize|top|left|right|bottom)\w*\s*:\s*["'`]/.test(line)) return;
    const found = /["'`](?:#[0-9a-fA-F]{3,8}|\d*\.?\d+(?:px|rem|em|pt))["'`]/.exec(line);
    if (found) problems.push(`${name}:${index + 1}  ${line.trim()}  — ${found[0]} is a raw value in an inline style`);
  });
}

for (const problem of problems) console.error(`  ✗ ${problem}`);
console.log(`${declarations} CSS declarations checked against ${tokens.size} tokens — ${problems.length} raw value(s).`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ declarations, tokens: tokens.size, problems }, null, 2) + "\n");
process.exit(problems.length ? 1 : 0);
