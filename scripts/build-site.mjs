#!/usr/bin/env node
// Builds the published website into site/: Start here at the root, the token reference under tokens/,
// Storybook under storybook/, the machine-readable export under ai/ (a copy of the committed ai/ folder,
// which `npm run check:ai` keeps in step with the sources), and llms.txt at the root, written from
// ai/index.json (scripts/lib/llms.mjs). This is what the Pages workflow publishes; `npm run check:site` checks
// it (accessibility in every color mode, and every internal link).
//
// Usage: npm run site   (needs `npm install` in ui/ first)

import { spawnSync } from "node:child_process";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderLlmsTxt } from "./lib/llms.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The token reference (and the token CSS and fonts every page uses), then Start here.
run("node", ["scripts/build-token-site.mjs"]);
run("npm", ["run", "pages"], { cwd: resolve(root, "ui") });
// Storybook. Its title and Introduction link back to the website, one folder up.
run("npm", ["run", "build-storybook", "--", "--output-dir", "../site/storybook"], {
  cwd: resolve(root, "ui"),
  env: { ...process.env, STORYBOOK_TOKEN_SITE_URL: "../" },
});
// The export for AI tools, as committed.
cpSync(resolve(root, "ai"), resolve(root, "site/ai"), { recursive: true });
// llms.txt: the entry point for AI tools, from the export's index.
writeFileSync(resolve(root, "site/llms.txt"), renderLlmsTxt(JSON.parse(readFileSync(resolve(root, "ai/index.json"), "utf8"))));
console.log("Wrote site/: Start here, tokens/, storybook/, ai/ (the export), and llms.txt.");
