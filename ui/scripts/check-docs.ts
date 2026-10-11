// Documentation link check: every published component has the Storybook Docs page its Figma documentation
// link would open when DOCS_TARGET is "storybook" (definitions/docRegistry.ts). Exits 1 if a page is missing.
//
// Usage: npm run check:docs   (needs storybook-static/: run `npm run build-storybook` first)

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPONENTS } from "../../definitions/components";
import { DOCS_TARGET, STORYBOOK_URL, storybookDocsId } from "../../definitions/docRegistry";

const index = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "storybook-static", "index.json");
if (!existsSync(index)) {
  console.error("storybook-static/ is missing. Run `npm run build-storybook` first.");
  process.exit(1);
}
const pages = new Set(Object.values(JSON.parse(readFileSync(index, "utf8")).entries as Record<string, { id: string; type: string }>).filter((entry) => entry.type === "docs").map((entry) => entry.id));
// Every defined component, plus the icons, which share one page.
const names = [...Object.keys(COMPONENTS), "Icon/plus"];
const missing = names.filter((name) => !pages.has(storybookDocsId(name)));
for (const name of missing) console.error(`  ✗ ${name}: no Storybook Docs page "${storybookDocsId(name)}"`);
console.log(
  `${names.length - missing.length} of ${names.length} documentation targets have a Storybook Docs page — ${missing.length} missing. ` +
    `Links point to ${DOCS_TARGET === "storybook" ? STORYBOOK_URL : "the Figma file (DOCS_TARGET is \"figma\")"}.`
);
process.exit(missing.length ? 1 : 0);
