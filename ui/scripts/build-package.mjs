#!/usr/bin/env node
// Builds the sterling-ui package into ui/package/ and packs it into a tarball an application can install
// (npm install ./sterling-ui-<version>.tgz). Nothing is published: the package is marked private.
//   dist/index.js        Every component, as one ES module (src/index.ts)
//   dist/types/          Type declarations for every component and prop, and the grid's data types
//   dist/styles.css      The token CSS, the page defaults, and every component's CSS
//   dist/fonts.css       Inter 3.19 (the version Figma renders), with the font files and license in dist/fonts/
//
// Usage: npm run package   (from ui/, or the repo root)

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(ui, "package");
const dist = resolve(out, "dist");
function run(command, args) {
  const result = spawnSync(command, args, { cwd: ui, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const read = (file) => readFileSync(resolve(ui, file), "utf8");

rmSync(out, { recursive: true, force: true });
run("npm", ["run", "tokens"]);
run("npx", ["vite", "build", "--config", "vite.lib.config.ts", "--logLevel", "warn"]);
run("npx", ["tsc", "-p", "tsconfig.package.json"]);

// One stylesheet: tokens first, so everything after it can use them.
writeFileSync(
  resolve(dist, "styles.css"),
  [read("src/styles/tokens.css"), read("src/styles/base.css"), readFileSync(resolve(dist, "components.css"), "utf8")].join("\n")
);
rmSync(resolve(dist, "components.css"));

// The fonts, beside a stylesheet that points at them.
const inter = resolve(ui, "node_modules/inter-ui");
mkdirSync(resolve(dist, "fonts"), { recursive: true });
const fontsCss = read("src/styles/fonts.css").replace(/url\("[^"]*\/(Inter-[A-Za-z]+\.woff2)"\)/g, (_, file) => {
  copyFileSync(resolve(inter, "Inter (web)", file), resolve(dist, "fonts", file));
  return `url("./fonts/${file}")`;
});
if (/node_modules/.test(fontsCss)) throw new Error("fonts.css still points into node_modules");
writeFileSync(resolve(dist, "fonts.css"), fontsCss);
copyFileSync(resolve(inter, "LICENSE.txt"), resolve(dist, "fonts", "LICENSE.txt"));

const source = JSON.parse(read("package.json"));
const pkg = {
  name: "sterling-ui",
  version: source.version,
  // Not on a package registry: installed from the tarball.
  private: true,
  license: source.license,
  description: "Sterling's React components, with their types and the token CSS. Install from the tarball; it isn't published to a registry.",
  type: "module",
  main: "./dist/index.js",
  module: "./dist/index.js",
  types: "./dist/types/ui/src/index.d.ts",
  exports: {
    ".": { types: "./dist/types/ui/src/index.d.ts", import: "./dist/index.js" },
    "./styles.css": "./dist/styles.css",
    "./fonts.css": "./dist/fonts.css",
  },
  sideEffects: ["*.css"],
  files: ["dist", "README.md", "LICENSE"],
  peerDependencies: { react: ">=19", "react-dom": ">=19" },
  dependencies: { "react-aria": source.dependencies["react-aria"], "react-stately": source.dependencies["react-stately"] },
};
writeFileSync(resolve(out, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
copyFileSync(resolve(ui, "../LICENSE"), resolve(out, "LICENSE"));
copyFileSync(resolve(ui, "package-readme.md"), resolve(out, "README.md"));

const pack = spawnSync("npm", ["pack", "--silent"], { cwd: out, encoding: "utf8", shell: process.platform === "win32" });
if (pack.status !== 0) {
  console.error(pack.stderr);
  process.exit(pack.status ?? 1);
}
const tarball = pack.stdout.trim().split("\n").pop();
console.log(`Built ui/package/${tarball}: ${readdirSync(dist).join(", ")}.`);
