// Release-date check: fails while the placeholder RELEASE-DATE is still where the release date belongs. The version
// is set first, with the placeholder in its CHANGELOG heading (copied from there into the AI files, llms.txt, and
// the MCP server); the date is written in last, before the push. Run it before every push: it must pass.
//
// Checks: CHANGELOG.md, the AI files (ai/), and, when they are built, the website's llms.txt (site/) and the MCP
// server (mcp/dist/server.js).
//
// Usage: npm run check:release-date

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDER = "RELEASE-DATE";
const files = [
  "CHANGELOG.md",
  ...readdirSync(join(root, "ai")).map((file) => `ai/${file}`),
  "site/llms.txt",
  "mcp/dist/server.js",
].filter((file) => existsSync(join(root, file)));

const found = files.filter((file) => readFileSync(join(root, file), "utf8").includes(PLACEHOLDER));
for (const file of found) console.error(`  ✗ ${relative(root, join(root, file)).replace(/\\/g, "/")} still has ${PLACEHOLDER}`);
console.log(
  `${files.length} files checked for the release-date placeholder — ${found.length} still have it.${found.length ? " Set the release date before pushing." : ""}`
);
process.exit(found.length ? 1 : 0);
