// Excerpt check: every excerpt on the website's AI page can still be read from its source. Fails if a selector
// finds nothing or more than one thing (a renamed key, entry, or symbol), if the excerpted code has changed since
// the commit the page says it was delivered in, or if the MCP exchange can't be made. The same selectors run when
// the page builds (lib/excerpts.ts); this runs them without building the site.
//
// Usage: npm run check:excerpts   (needs the MCP server built, npm run build in mcp/, and the repository's
//                                  history: a CI checkout with fetch-depth: 0)

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DELIVERED, excerptProblems, type Exchange } from "./lib/excerpts";

const mcp = resolve(dirname(fileURLToPath(import.meta.url)), "../../mcp");
let exchange: Exchange;
try {
  exchange = JSON.parse(execFileSync(process.execPath, ["scripts/exchange.mjs"], { cwd: mcp, encoding: "utf8" }));
} catch {
  console.error("The MCP exchange failed: build the server first (npm run build in mcp/).");
  process.exit(1);
}
const problems = excerptProblems(exchange);
for (const problem of problems) console.error(`  ✗ ${problem}`);
console.log(
  `The AI page's excerpts (each selector matches once, the code is as delivered in ${DELIVERED}, the MCP exchange runs) — ${problems.length} problem(s).`
);
process.exit(problems.length ? 1 : 0);
