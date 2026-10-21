// Renders every Mermaid diagram in docs/ (each .mmd file) to SVG beside it, and writes a stamp into each SVG's first
// line: its source, and the hash of what it was rendered from. Diagrams in docs/diagrams/ (on the website) are
// rendered once per color mode, in Sterling's colors from the tokens; the example's diagrams once, in Mermaid's
// default colors (scripts/lib/diagrams.mjs). The .mmd file is the source of truth: `npm run check:diagrams` fails if
// a source, or a color it uses, changed without a re-render.
//
// Usage: npm run diagrams                every diagram
//        npm run diagrams -- <file.mmd>  one diagram
// Uses the Mermaid CLI at a pinned version, through npx: the first run downloads it and a headless browser.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MERMAID_CLI, diagramSources, renders } from "./lib/diagrams.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const asked = process.argv.slice(2).map((file) => resolve(root, file));
const sources = asked.length ? asked : diagramSources(root);
const work = mkdtempSync(join(tmpdir(), "stl-diagrams-"));

try {
  for (const source of sources) {
    for (const render of renders(root, source)) {
      const config = join(work, "config.json");
      const css = join(work, "diagram.css");
      writeFileSync(config, render.config);
      writeFileSync(css, render.css);
      const result = spawnSync(
        "npx",
        ["-y", "-p", MERMAID_CLI, "mmdc", "-q", "-i", source, "-o", render.svg, "-c", config, "-C", css, "-b", render.background],
        { cwd: root, stdio: "inherit", shell: process.platform === "win32" }
      );
      if (result.status !== 0) process.exit(result.status ?? 1);
      writeFileSync(render.svg, `${render.stamp}\n${readFileSync(render.svg, "utf8").replace(/^<!--[^\n]*-->\n/, "")}`);
      console.log(`Rendered ${relative(root, render.svg).replace(/\\/g, "/")}`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
