#!/usr/bin/env node
// Builds the published site into site/: the token reference at the root and Storybook under storybook/, each
// with a link to the other, and the machine-readable export under ai/ (a copy of the committed ai/ folder,
// which `npm run check:ai` keeps in step with the sources). This is what the Pages workflow publishes.
//
// Usage: npm run site   (needs `npm install` in ui/ first)

import { spawnSync } from "node:child_process";
import { cpSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The token reference, linking to Storybook beside it.
run("node", ["scripts/build-token-site.mjs", "--storybook", "storybook/"]);
// Storybook, linking back to the token reference one folder up.
run("npm", ["run", "build-storybook", "--", "--output-dir", "../site/storybook"], {
  cwd: resolve(root, "ui"),
  env: { ...process.env, STORYBOOK_TOKEN_SITE_URL: "../" },
});
// The export for AI tools, as committed.
cpSync(resolve(root, "ai"), resolve(root, "site/ai"), { recursive: true });
console.log("Wrote site/ (token reference), site/storybook/ (Storybook), and site/ai/ (the export).");
