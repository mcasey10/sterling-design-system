// Shared by scripts/render-diagrams.mjs and scripts/check-diagrams.mjs: where diagrams are, how each is themed, and
// the stamp each rendered SVG carries on its first line (its source, and the hash of what it was rendered from).
//
// Two kinds of diagram:
//   • docs/diagrams/*.mmd, shown on the website: rendered once per color mode in tokens.json, in Sterling's own
//     colors (read from the Color tokens, never written here). The first mode is <name>.svg, every other is
//     <name>.<mode>.svg (ai-layer.dark.svg). The hash covers the source and the colors, so a token change needs a
//     re-render too.
//   • every other .mmd in docs/ (the example's planning diagrams, shown in Markdown): one SVG in Mermaid's default
//     colors on white, with the shared docs/mermaid-config.json and docs/mermaid.css.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { flattenPrimitives, loadTokens, resolveColor } from "./tokens.mjs";

/** The Mermaid CLI, at the version every diagram is rendered with. */
export const MERMAID_CLI = "@mermaid-js/mermaid-cli@12.0.0";
/** Diagrams in this folder are rendered in Sterling's colors, once per color mode. */
const THEMED = "docs/diagrams/";
const FONT = "Arial, Helvetica, sans-serif";

/** Every Mermaid source under docs/. */
export function diagramSources(root) {
  const found = [];
  const walk = (folder) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".mmd")) found.push(path);
    }
  };
  walk(join(root, "docs"));
  return found.sort();
}

/** Mermaid's settings and CSS for one color mode, from the Color tokens. */
function sterlingTheme(tokens, mode) {
  const primitives = flattenPrimitives(tokens);
  const color = (name) => resolveColor(tokens, primitives, name, mode).hex;
  const panel = color("surface/panel");
  return {
    background: panel,
    config: {
      theme: "base",
      htmlLabels: false,
      flowchart: { htmlLabels: false },
      fontFamily: FONT,
      themeVariables: {
        darkMode: mode !== tokens.color.$modes[0],
        fontFamily: FONT,
        background: panel,
        primaryColor: color("surface/hover"),
        primaryBorderColor: color("border/strong"),
        primaryTextColor: color("text/primary"),
        textColor: color("text/primary"),
        lineColor: color("text/secondary"),
        edgeLabelBackground: panel,
      },
    },
    // Opaque edge-label backgrounds, so arrows don't strike through the label text.
    css:
      `.edgeLabel rect, .edgeLabel .label rect { opacity: 1 !important; fill: ${panel} !important; }\n` +
      `.edgeLabel text, .edgeLabel tspan { fill: ${color("text/secondary")} !important; }\n`,
  };
}

/**
 * What to render for one source: each output's path, the Mermaid settings and CSS (as text), the background, and
 * the stamp it must carry.
 */
export function renders(root, source) {
  const name = relative(root, source).replace(/\\/g, "/");
  const text = readFileSync(source, "utf8").replace(/\r\n/g, "\n");
  if (!name.startsWith(THEMED)) {
    const config = readFileSync(join(root, "docs/mermaid-config.json"), "utf8");
    const css = readFileSync(join(root, "docs/mermaid.css"), "utf8");
    return [{ svg: source.replace(/\.mmd$/, ".svg"), config, css, background: "white", stamp: stamp(name, null, hash(text)) }];
  }
  const tokens = loadTokens();
  return tokens.color.$modes.map((mode, i) => {
    const theme = sterlingTheme(tokens, mode);
    const config = JSON.stringify(theme.config, null, 2);
    return {
      svg: source.replace(/\.mmd$/, i === 0 ? ".svg" : `.${mode.toLowerCase()}.svg`),
      config,
      css: theme.css,
      background: theme.background,
      stamp: stamp(name, mode, hash(text + config + theme.css)),
    };
  });
}

/** A short hash. */
const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

/** The first line of a rendered SVG. */
const stamp = (name, mode, digest) =>
  `<!-- Rendered from ${name}${mode ? ` in Sterling's ${mode} colors` : ""} (${mode ? "source and colors" : "source"} ${digest}) by npm run diagrams. Edit the source, not this file. -->`;
