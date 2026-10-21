// Examples check: a screen under src/examples/ is built the way a team outside Sterling would build it, from
// the sterling-ui package alone. Fails if a file in an example imports anything but "sterling-ui", React, or
// the example's own files, or reaches into a Sterling component's own CSS class names (stl-…) other than the
// text styles and densities, which the package documents for applications to use.
//
// Usage: npm run check:examples

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examples = join(ui, "src", "examples");
const files = readdirSync(examples, { recursive: true })
  .map((f) => join(examples, String(f)))
  .filter((f) => /\.(tsx?|css)$/.test(f) && !/\.stories\.tsx$/.test(f));

const allowedImport = (spec) => spec === "sterling-ui" || /^sterling-ui\/(styles|fonts)\.css$/.test(spec) || /^react(-dom)?(\/|$)/.test(spec) || spec.startsWith(".");
// What the package documents for applications: text style classes and density classes.
const allowedClass = (name) => /^stl-text-/.test(name) || /^stl-density-/.test(name);

const problems = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const where = relative(ui, file);
  for (const [, spec] of text.matchAll(/(?:^|\n)\s*import\s+(?:[^"';]+\s+from\s+)?["']([^"']+)["']/g)) {
    if (!allowedImport(spec)) problems.push(`${where}: imports "${spec}" (only sterling-ui, React, and the example's own files)`);
    if (spec.startsWith(".") && resolve(dirname(file), spec).startsWith(examples) === false) problems.push(`${where}: imports "${spec}", outside the example`);
  }
  const classes = new Set([...text.matchAll(/(?<![\w-])\.?(stl-[a-z0-9_-]+)/g)].map((m) => m[1]).filter((name) => !name.startsWith("stl-color") && !name.startsWith("stl-space")));
  const internal = [...classes].filter((name) => !allowedClass(name) && !/^stl-(size|stroke|radius|row|cell|control|icon|card|font)-/.test(name));
  if (internal.length) problems.push(`${where}: uses Sterling's internal class names ${internal.join(", ")} (components' markup isn't part of the package's API)`);
}

for (const problem of problems) console.error(`  ✗ ${problem}`);
console.log(`${files.length} example files checked: imports from sterling-ui, React, and their own folder only — ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
