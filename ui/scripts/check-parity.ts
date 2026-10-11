// Compares the coded components (src/parity/coded.ts) with definitions/components.ts and exits 1 if a coded
// component doesn't follow its definition, or if a defined component (every published Figma component
// except icons) has no coded counterpart.
//
// Usage: npm run check:parity

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPONENTS } from "../../definitions/components";
import { CODED } from "../src/parity/coded";
import { parityProblems } from "../src/parity/parity";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems: string[] = [];
for (const [name, coded] of Object.entries(CODED)) {
  const def = COMPONENTS[name];
  const source = resolve(ui, coded.source);
  if (!def) problems.push(`${name}: coded, but definitions/components.ts has no such component`);
  else if (!existsSync(source)) problems.push(`${name}: ${coded.source} doesn't exist`);
  else problems.push(...parityProblems(name, def, coded, readFileSync(source, "utf8")));
}
for (const name of Object.keys(COMPONENTS)) {
  if (!(name in CODED)) problems.push(`${name}: defined, but not coded (add it to src/parity/coded.ts when it is built)`);
}

for (const problem of problems) console.error(`  ✗ ${problem}`);
const coded = Object.keys(COMPONENTS).filter((name) => name in CODED).length;
console.log(`${coded} of ${Object.keys(COMPONENTS).length} components coded and compared with their definitions — ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
