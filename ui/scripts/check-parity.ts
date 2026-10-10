// Compares the coded components (src/parity/coded.ts) with definitions/components.ts and exits 1 if a coded
// component doesn't follow its definition. Components that aren't coded yet are listed, not failed.
//
// Usage: npm run check:parity

import { COMPONENTS } from "../../definitions/components";
import { CODED } from "../src/parity/coded";
import { parityProblems } from "../src/parity/parity";

const problems: string[] = [];
for (const [name, coded] of Object.entries(CODED)) {
  const def = COMPONENTS[name];
  if (!def) problems.push(`${name}: coded, but definitions/components.ts has no such component`);
  else problems.push(...parityProblems(name, def, coded));
}
const notCoded = Object.keys(COMPONENTS).filter((name) => !(name in CODED));

for (const problem of problems) console.error(`  ✗ ${problem}`);
if (notCoded.length) console.log(`Not coded yet (${notCoded.length}): ${notCoded.join(", ")}`);
console.log(
  `${Object.keys(CODED).length} of ${Object.keys(COMPONENTS).length} components coded and compared with their definitions — ${problems.length} problem(s).`
);
process.exit(problems.length ? 1 : 0);
