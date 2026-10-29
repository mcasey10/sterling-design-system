// Address check: Sterling's public addresses are written once, in definitions/site.ts (or, for the ones the
// Figma plugin uses, definitions/pluginAddresses.ts, which site.ts re-exports). Fails if:
//   • source code (a .ts, .tsx, .mjs, or .js file) writes a Sterling address itself instead of importing it
//     from definitions/site.ts;
//   • the view-only Figma file is linked anywhere but site.ts and the maintainer documents (ARCHITECTURE.md,
//     CONTRIBUTING.md, docs/reference.md): everyone else gets the Figma Community page;
//   • a document or generated file links a Sterling address that site.ts doesn't name: a page of the website
//     that doesn't exist, or an old address such as the token reference at the site's root path.
//
// Usage: npm run check:urls

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AI_FILES_URL, AI_PAGE_URL, DEMO_PAGE_URL, EXAMPLE_PAGE_URL, FIGMA_COMMUNITY_URL, FIGMA_FILE_URL, INSTALL_PACKAGE_URL, LLMS_TXT_URL, RAW_URL, REPOSITORY_URL, RUNS_PAGE_URL, STORYBOOK_URL,
  TOKENS_URL, WEBSITE_URL,
} from "../../definitions/site";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !/package-lock\.json$|\.(png|svg|jpg|woff2?|tgz|ico)$/i.test(f));

const SITE_FILE = "definitions/site.ts";
const PLUGIN_ADDRESSES = "definitions/pluginAddresses.ts";
const THIS_FILE = "ui/scripts/check-urls.ts";
const MAINTAINER_DOCS = new Set(["ARCHITECTURE.md", "CONTRIBUTING.md", "docs/reference.md", SITE_FILE]);
const FIGMA_FILE_ID = FIGMA_FILE_URL.split("/design/")[1].split("/")[0];

/** Every address of Sterling's own: the website, the repository and its raw files, and the Figma file and page. */
const STERLING = /https:\/\/(?:mcasey10\.github\.io\/sterling-design-system|github\.com\/mcasey10\/sterling-design-system|raw\.githubusercontent\.com\/mcasey10\/sterling-design-system|www\.figma\.com\/(?:design|file|community\/file)\/[A-Za-z0-9]+)[^\s"'`)<>\]]*/g;
/** The addresses a document may link: each named in site.ts, as a whole address or the start of one. */
const PAGES = [TOKENS_URL, INSTALL_PACKAGE_URL, AI_PAGE_URL, DEMO_PAGE_URL, EXAMPLE_PAGE_URL, RUNS_PAGE_URL, STORYBOOK_URL, AI_FILES_URL, LLMS_TXT_URL];
const allowed = (url: string, file: string) => {
  const clean = url.replace(/[.,;:]+$/, "");
  if (clean.startsWith(FIGMA_FILE_URL) || clean.includes(FIGMA_FILE_ID)) return MAINTAINER_DOCS.has(file);
  if (clean.startsWith(FIGMA_COMMUNITY_URL)) return true;
  if (clean.startsWith(RAW_URL) || clean.startsWith(REPOSITORY_URL)) return true;
  // The website: its home page (with or without an anchor), or one of its pages.
  if (clean === WEBSITE_URL || clean.startsWith(`${WEBSITE_URL}#`)) return true;
  return PAGES.some((page) => clean.startsWith(page));
};

const problems: string[] = [];
let checked = 0;
for (const file of files) {
  if (file === SITE_FILE || file === PLUGIN_ADDRESSES || file === THIS_FILE) continue;
  let text: string;
  try {
    text = readFileSync(resolve(root, file), "utf8");
  } catch {
    continue;
  }
  const code = /\.(ts|tsx|mjs|js)$/.test(file);
  for (const match of text.matchAll(STERLING)) {
    checked++;
    const url = match[0];
    const line = text.slice(0, match.index).split("\n").length;
    if (code) problems.push(`${file}:${line}: writes ${url} itself; import it from ${SITE_FILE}`);
    else if (!allowed(url, file)) {
      problems.push(
        url.includes(FIGMA_FILE_ID)
          ? `${file}:${line}: links the view-only Figma file; link the Figma Community page (FIGMA_COMMUNITY_URL)`
          : `${file}:${line}: ${url} isn't an address named in ${SITE_FILE}`
      );
    }
  }
  if (!code && text.includes(FIGMA_FILE_ID) && !MAINTAINER_DOCS.has(file) && ![...text.matchAll(STERLING)].some((m) => m[0].includes(FIGMA_FILE_ID))) {
    problems.push(`${file}: names the view-only Figma file; link the Figma Community page`);
  }
}

for (const problem of problems) console.error(`  ✗ ${problem}`);
console.log(`${checked} Sterling addresses checked in ${files.length} files against ${SITE_FILE} — ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
