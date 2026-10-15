// Diagram check: every Mermaid source in docs/ (.mmd) has its SVGs beside it, rendered from the source as it is now:
// one for an example diagram, one per color mode for a diagram in docs/diagrams/ (in Sterling's colors, so a change
// to a color token needs a re-render too). Fails if any is missing or stale. Needs no network and no browser: it
// compares the stamp on each SVG's first line with what it should be.
//
// Usage: npm run check:diagrams   (fix with npm run diagrams)

import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diagramSources, renders } from "./lib/diagrams.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
let svgs = 0;
const sources = diagramSources(root);
for (const source of sources) {
  for (const render of renders(root, source)) {
    svgs++;
    const name = relative(root, render.svg).replace(/\\/g, "/");
    if (!existsSync(render.svg)) problems.push(`${name}: missing`);
    else if (readFileSync(render.svg, "utf8").split(/\r?\n/, 1)[0] !== render.stamp) problems.push(`${name}: its source or colors changed since it was rendered`);
  }
}
for (const problem of problems) console.error(`  ✗ ${problem}`);
console.log(`${sources.length} diagrams, ${svgs} SVGs, checked against their sources — ${problems.length} problem(s).${problems.length ? " Run npm run diagrams." : ""}`);
process.exit(problems.length ? 1 : 0);
