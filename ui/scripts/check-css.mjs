// Raw-value check: every design value in the coded layer's CSS comes from a token.
//
// Fails on, in any .css file under src/ (the generated tokens.css excepted):
//   • a color that isn't a token: hex, rgb(), hsl(), and other color functions
//   • a length or time with a fixed unit: px, rem, em, pt, ms, s (0 needs no unit)
//   • a number where a design value belongs: font-weight, font-size, line-height, z-index, opacity other than 0 / 1
//   • var(--stl-…) that names no token and isn't a custom property defined in the same file or set from a
//     component or story (style={{ "--stl-…": … }})
// and on a raw color or px value in an inline style in a .tsx file.
// src/styles/fonts.css is skipped too: its @font-face rules describe font files, not design values.
//
// Allowed: tokens, 0, percentages, viewport and fr units, unitless multipliers inside calc(), and keywords
// (transparent, currentColor, inherit, none, …). Those size things relative to their container; they aren't
// design values.
//
// Usage: npm run check:css   (needs src/styles/tokens.css: run `npm run tokens` first)

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(ui, "src");
const tokensFile = join(src, "styles", "tokens.css");
if (!existsSync(tokensFile)) {
  console.error("src/styles/tokens.css is missing. Run `npm run tokens` first.");
  process.exit(1);
}
const defined = (css) => new Set([...css.matchAll(/(--stl-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const tokens = defined(readFileSync(tokensFile, "utf8"));
const fontsFile = join(src, "styles", "fonts.css");

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
/** Properties whose plain numbers are design values. */
const NUMERIC = /^(font-weight|font-size|line-height|z-index|letter-spacing)$/;

// Custom properties that components and stories set themselves, e.g. style={{ "--stl-variant-columns": 6 }}.
const setInCode = new Set(files(src, ".tsx").flatMap((file) => [...readFileSync(file, "utf8").matchAll(/["'`](--stl-[a-z0-9-]+)["'`]\s*:/g)].map((m) => m[1])));

const problems = [];
let declarations = 0;
for (const file of files(src, ".css")) {
  if (file === tokensFile || file === fontsFile) continue;
  const name = relative(ui, file).replace(/\\/g, "/");
  const css = readFileSync(file, "utf8");
  const local = defined(css);
  // Blank out comments, keeping line breaks so line numbers stay right.
  const code = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  // Every "property: value" inside a rule, wherever it sits on its line. (A selector such as a:hover isn't
  // matched: its "value" would run into the rule's opening brace.)
  for (const declaration of code.matchAll(/(?<=[{;]\s*)(--[a-z0-9-]+|[a-z-]+)\s*:\s*([^;{}]+?)\s*(?=[;}])/g)) {
    declarations++;
    const [, property, value] = declaration;
    const where = `${name}:${code.slice(0, declaration.index).split("\n").length}`;
    // What is left once every var(--…) reference is taken out is what the file wrote by hand.
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
  const name = relative(ui, file).replace(/\\/g, "/");
  readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    // Only where a style is being written: style={{ … }} or a CSS property with a quoted value.
    if (!/style\s*=|(?:width|height|padding|margin|gap|color|background|border|fontSize|top|left|right|bottom)\w*\s*:\s*["'`]/.test(line)) return;
    const found = /["'`](?:#[0-9a-fA-F]{3,8}|\d*\.?\d+(?:px|rem|em|pt))["'`]/.exec(line);
    if (found) problems.push(`${name}:${index + 1}  ${line.trim()}  — ${found[0]} is a raw value in an inline style`);
  });
}

for (const problem of problems) console.error(`  ✗ ${problem}`);
console.log(`${declarations} CSS declarations checked against ${tokens.size} tokens — ${problems.length} raw value(s).`);
process.exit(problems.length ? 1 : 0);
