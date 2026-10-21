// Writes the machine-readable export to ai/ at the repo root (see scripts/lib/ai-export.ts for what is in it).
// The files are committed; `npm run check:ai` fails if they differ from what the sources give.
//
// Usage: npm run export:ai

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildExport } from "./lib/ai-export";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../../ai");
mkdirSync(out, { recursive: true });
const files = buildExport();
for (const [name, text] of Object.entries(files)) writeFileSync(resolve(out, name), text);
console.log(`Wrote ai/: ${Object.keys(files).join(", ")}.`);
