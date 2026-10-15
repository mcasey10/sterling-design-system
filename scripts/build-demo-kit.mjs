#!/usr/bin/env node
// Builds the demo kit into demo/kit/: everything a team outside Sterling would have, and nothing else. A
// fresh AI session in a copy of that folder builds a screen from it (demo/README.md has the steps).
//   sterling-ui-<version>.tgz     The React package (built here: npm run package in ui/)
//   mcp/server.js                 The MCP server (built here: npm run build in mcp/)
//   data/pool-2026-07.json        The example's data (demo/data/, checked against the plugin's example)
//   design/pool-loans.png         The designer's screen (docs/images/example-pool-loans.png)
//   the app scaffold, CLAUDE.md, .mcp.json, .claude/settings.json   (demo/template/)
// The kit's settings deny the web, the Figma servers, and Claude in Chrome (in the template). The folders the
// session must not read are this machine's own, so they come from demo/kit.local.json, which is never
// committed, and exist only in the built kit.
//
// Usage: npm run demo:kit

import { spawnSync } from "node:child_process";
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const kit = resolve(root, "demo/kit");
const at = (...parts) => resolve(root, ...parts);
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd: at(cwd), stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The parts, built fresh so the kit can't carry a stale package, server, or data file.
run("npm", ["run", "package"], "ui");
run("npm", ["run", "build"], "mcp");
run("npm", ["run", "check:demo-data"], "ui");

rmSync(kit, { recursive: true, force: true });
cpSync(at("demo/template"), kit, { recursive: true });

const tarball = readdirSync(at("ui/package")).find((file) => /^sterling-ui-.*\.tgz$/.test(file));
if (!tarball) throw new Error("ui/package has no sterling-ui tarball");
copyFileSync(at("ui/package", tarball), resolve(kit, tarball));
const pkgPath = resolve(kit, "package.json");
const pkgText = readFileSync(pkgPath, "utf8");
if (!pkgText.includes("STERLING_UI_TARBALL")) throw new Error("demo/template/package.json has no STERLING_UI_TARBALL placeholder");
writeFileSync(pkgPath, pkgText.replace("STERLING_UI_TARBALL", tarball));

mkdirSync(resolve(kit, "mcp"), { recursive: true });
copyFileSync(at("mcp/dist/server.js"), resolve(kit, "mcp/server.js"));
mkdirSync(resolve(kit, "data"), { recursive: true });
copyFileSync(at("demo/data/pool-2026-07.json"), resolve(kit, "data/pool-2026-07.json"));
mkdirSync(resolve(kit, "design"), { recursive: true });
copyFileSync(at("docs/images/example-pool-loans.png"), resolve(kit, "design/pool-loans.png"));
writeFileSync(resolve(kit, ".gitignore"), "node_modules/\ndist/\n");

// This machine's folders the session must not read, from the local setting.
const localPath = at("demo/kit.local.json");
const settingsPath = resolve(kit, ".claude/settings.json");
const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
let denied = [];
if (existsSync(localPath)) {
  denied = JSON.parse(readFileSync(localPath, "utf8")).denyPaths ?? [];
  for (const path of denied) {
    if (!/^\/\/[^/]/.test(path)) throw new Error(`demo/kit.local.json: "${path}" must be an absolute path with a leading double slash, e.g. //c/Users/name/project`);
    const base = path.replace(/\/+$/, "");
    settings.permissions.deny.push(`Read(${base}/**)`, `Edit(${base}/**)`);
  }
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

console.log(`\nBuilt demo/kit/ with ${tarball}, mcp/server.js, the data, and the design.`);
console.log(
  denied.length
    ? `Its settings deny reading ${denied.length} local folder(s) from demo/kit.local.json, the web, the Figma servers, and Claude in Chrome.`
    : "WARNING: demo/kit.local.json is missing, so the kit denies the web and the Figma servers but NO local folders.\n" +
        "Copy demo/kit.local.example.json to demo/kit.local.json, list this repository's path, and build again."
);
