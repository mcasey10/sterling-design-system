#!/usr/bin/env node
// Builds the website's token reference from tokens/tokens.json:
//   site/tokens/index.html  The token reference, in the website's page shell (scripts/lib/page-shell.mjs):
//                     color tokens in both modes with their alias, primitive ramps, scales, density, type
//                     specimens, and every contrast pair with its ratio. CSS inlined; nothing is loaded from
//                     another site
//   site/tokens.css   The token CSS from scripts/lib/token-css.mjs (the same text `npm run tokens:css`
//                     writes to dist/tokens.css)
//   site/fonts/       Inter 3.19, the same files Storybook bundles (ui/node_modules/inter-ui), with its
//                     license, for every page of the website. Skipped, with a note, when ui/ has no
//                     node_modules: the pages then use Inter only if it's installed
// The site's addresses come from ai/index.json (generated from definitions/site.ts), so this script needs no
// TypeScript. The rest of the website is built by ui/scripts/build-pages.ts.
// The contrast results come from scripts/lib/tokens.mjs, the same code as `npm run contrast`.
//
// Usage: npm run tokens:site   (output in site/, which is gitignored)

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTokens, entries, flattenPrimitives, resolveColor, aliasOf, evaluateContrast } from "./lib/tokens.mjs";
import { PREFIX, cssVar, cssClass, defaultDensity, buildTokenCss } from "./lib/token-css.mjs";
import { FONT_FILES, esc, renderPage } from "./lib/page-shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../site");
const tokens = loadTokens();
const primitives = flattenPrimitives(tokens);
const [LIGHT, DARK] = tokens.color.$modes;
const DENSITY_MODES = tokens.density.$modes;
const DEFAULT_DENSITY = defaultDensity(tokens);

// Inter, from the package ui/src/styles/fonts.css loads (FONT_FILES in page-shell.mjs). Change both together.
const INTER = resolve(here, "../ui/node_modules/inter-ui");
const HAS_FONTS = Object.values(FONT_FILES).every((file) => existsSync(resolve(INTER, "Inter (web)", file)));
/** The website's addresses, as the export wrote them from definitions/site.ts. */
const LINKS = JSON.parse(readFileSync(resolve(here, "../ai/index.json"), "utf8")).links;
const VERSION = tokens.$meta?.version ?? "?";
// ------------------------------------------------------------ index.html

const colorNotes = tokens.color.$notes ?? {};
const noteFor = (name) => colorNotes[name] ?? colorNotes[name.split("/")[0]] ?? "";

function swatch(hex, label) {
  return `<span class="swatch" style="background:${hex}" role="img" aria-label="${esc(label)}"></span>`;
}

function colorSection() {
  const rows = entries(tokens.color).map(([name]) => {
    const l = resolveColor(tokens, primitives, name, LIGHT);
    const d = resolveColor(tokens, primitives, name, DARK);
    const cell = (r, mode) =>
      `<td><div class="token-value">${swatch(r.hex, `${name} in ${mode}: ${r.hex}`)}<span><code>${esc(r.alias ?? r.hex)}</code><br><span class="muted">${r.hex}</span></span></div></td>`;
    return `<tr><th scope="row"><code>${esc(name)}</code><div class="note">${esc([tokens.color.$descriptions?.[name], noteFor(name)].filter(Boolean).join(" "))}</div></th>${cell(l, LIGHT)}${cell(d, DARK)}<td><code>${cssVar(`color/${name}`)}</code></td></tr>`;
  });
  return `
  <section id="color">
    <h2>Color</h2>
    <p>Semantic tokens alias the primitives. Components use these, never raw hex.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Token</th><th>${LIGHT}</th><th>${DARK}</th><th>CSS</th></tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table></div>
  </section>`;
}

function primitivesSection() {
  const ramps = Object.entries(tokens.primitives).map(([ramp, steps]) => {
    const chips = Object.entries(steps)
      .map(([step, hex]) => `<li>${swatch(hex, `${ramp}/${step}: ${hex}`)}<span>${esc(step)}</span><span class="muted">${hex}</span></li>`)
      .join("");
    return `<div class="ramp"><h3>${esc(ramp)}</h3><ul>${chips}</ul></div>`;
  });
  return `<section id="primitives"><h2>Primitives</h2><p>Raw color ramps. Only semantic tokens should reference them.</p>${ramps.join("")}</section>`;
}

function scaleSection() {
  const bars = (group, label) =>
    entries(group)
      .map(([name, v]) => {
        const radius = name.startsWith("radius/");
        const shape = radius
          ? `<span class="radius-demo" style="border-radius:${Math.min(v, 24)}px"></span>`
          : `<span class="bar" style="width:${Math.min(v, 240)}px"></span>`;
        return `<tr><th scope="row"><code>${esc(name)}</code></th><td>${v}px</td><td>${shape}</td><td><code>${cssVar(name)}</code></td></tr>`;
      })
      .join("");
  return `
  <section id="scales">
    <h2>Spacing, radius, and size</h2>
    <p>Gaps and padding use spacing; fixed widths and heights use size; stroke/* are border widths.</p>
    <div class="table-wrap"><table><thead><tr><th>Token</th><th>Value</th><th>Preview</th><th>CSS</th></tr></thead>
      <tbody>${bars(tokens.spacing)}${bars(tokens.size)}</tbody></table></div>
  </section>`;
}

function densitySection() {
  const head = DENSITY_MODES.map((m) => `<th>${esc(m)}</th>`).join("");
  const rows = entries(tokens.density)
    .map(([name, t]) => {
      const cells = DENSITY_MODES.map((m) => {
        const a = aliasOf(t[m]);
        const px = a ? (tokens.size[a] ?? tokens.spacing[a]) : t[m];
        return `<td><code>${esc(a ?? t[m])}</code> <span class="muted">${px}px</span></td>`;
      }).join("");
      return `<tr><th scope="row"><code>${esc(name)}</code></th>${cells}</tr>`;
    })
    .join("");
  return `
  <section id="density">
    <h2>Density</h2>
    <p>Every value is an alias to the Size or Spacing scale. In CSS, ${esc(DEFAULT_DENSITY)} is the default; add
      ${DENSITY_MODES.filter((m) => m !== DEFAULT_DENSITY).map((m) => `<code>.${cssClass(`density-${m}`)}</code>`).join(" or ")} to a container to switch.</p>
    <div class="table-wrap"><table><thead><tr><th>Token</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

function typeSection() {
  const rows = entries(tokens.typography.styles)
    .map(([name, s]) => {
      const sample = s.tabularFigures ? "1,234,567.89  −0.80%  +12.50" : s.fontFamily ? "numericColumnWidth(value)" : "Review the pending orders";
      const spec = `${s.fontFamily ?? tokens.typography.fontFamily} ${s.fontStyle} · ${s.fontSize}/${s.lineHeight} · ${s.letterSpacing}px`;
      return `<tr><th scope="row">${esc(name)}<div class="note">${esc(spec)}${s.tabularFigures ? " · tabular figures" : ""}${s.textDecoration ? " · underlined" : ""}</div></th><td class="${cssClass(`text-${name}`)}">${esc(sample)}</td><td><code>.${cssClass(`text-${name}`)}</code></td></tr>`;
    })
    .join("");
  return `
  <section id="type">
    <h2>Typography</h2>
    <p>${esc(tokens.typography.fontFamily)} with system fallbacks (this page makes no network requests). Numeric uses tabular figures so digits line up.</p>
    <div class="table-wrap"><table><thead><tr><th>Style</th><th>Specimen</th><th>CSS</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

function contrastSection(results) {
  const failures = results.filter((r) => !r.pass).length;
  const rows = results
    .map((r) => {
      const status = r.exempt ? "Info" : r.pass ? "Pass" : "Fail";
      const icon = r.exempt ? "ⓘ" : r.pass ? "✓" : "✕";
      const req = r.min === null ? "reported only" : `${r.min}:1`;
      // The sample is drawn the way the rule judges it: large (24px) for the 3:1 levels, and marked disabled
      // for disabled content, which WCAG exempts (so automated contrast checks skip it, as they should).
      const sample = `<span class="pair${r.level === "body" ? "" : " pair--large"}" style="color:${r.fgHex};background:${r.bgHex}"${r.exempt ? ' aria-disabled="true"' : ""}>Aa</span>`;
      return `<tr><td>${esc(r.mode)}</td><td>${esc(r.rule)}</td><td>${sample}</td><td><code>${esc(r.fg)}</code><br><span class="muted">on</span> <code>${esc(r.bg)}</code></td><td class="num">${r.ratio.toFixed(2)}:1</td><td>${esc(r.level)} · ${req}</td><td><span class="status status-${status.toLowerCase()}">${icon} ${status}</span></td></tr>`;
    })
    .join("");
  return `
  <section id="contrast">
    <h2>Contrast</h2>
    <p><strong>${results.length} pairs checked across ${tokens.color.$modes.length} modes — ${failures} failure(s).</strong>
      Text needs 4.5:1; large text and UI graphics need 3:1; disabled content is reported only. Same results as <code>npm run contrast</code>.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Mode</th><th>Rule</th><th>Sample</th><th>Pair</th><th>Ratio</th><th>Requirement</th><th>Result</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

// The token reference's own styles; the page shell styles the rest. Short token names (--color-…), which the
// shell prefixes.
const PAGE_CSS = `
.intro { margin-bottom: 8px; }
.sections { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 16px 0 0; padding: 0; list-style: none; }
main section { background: var(--color-surface-panel); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: 24px; margin: 24px 0; scroll-margin-top: 16px; }
main section h2 { margin-bottom: 4px; }
main section p { color: var(--color-text-secondary); }
h3 { font-size: 14px; text-transform: capitalize; }
th[scope="row"] { font-weight: 600; }
td code, th code { font-size: 12px; line-height: 16px; background: none; padding: 0; }
.note { color: var(--color-text-secondary); font-size: 12px; font-weight: 400; max-width: 36ch; }
.token-value { display: flex; gap: 8px; align-items: center; }
.swatch { display: inline-block; width: 32px; height: 32px; flex: none; border-radius: var(--radius-sm); border: 1px solid var(--color-border-default); }
.ramp ul { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0; }
.ramp li { display: grid; gap: 2px; font-size: 12px; width: 72px; }
.ramp .swatch { width: 72px; height: 40px; }
.bar { display: inline-block; height: 12px; background: var(--color-accent-default); border-radius: 2px; min-width: 1px; }
.radius-demo { display: inline-block; width: 48px; height: 32px; border: 2px solid var(--color-accent-default); }
.pair { display: inline-block; padding: 4px 8px; border-radius: var(--radius-sm); font-weight: 600; border: 1px solid var(--color-border-default); }
.pair--large { font-size: 24px; line-height: 28px; }
.num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.status { font-weight: 600; white-space: nowrap; }
.status-pass { color: var(--color-status-positive-strong); }
.status-fail { color: var(--color-status-critical-strong); }
.status-info { color: var(--color-text-secondary); }
@media (max-width: 640px) { main section { padding: 16px; } }
`;


function buildHtml(results) {
  const main = `
<h1>Token reference</h1>
<p class="lead intro">Every Sterling token, with its value in ${esc(LIGHT)} and ${esc(DARK)}, and the contrast of every text and
background pair. Generated from tokens/tokens.json, version ${esc(VERSION)}. The same tokens drive the Figma library, the React
components, and <code>tokens.css</code>.</p>
<nav aria-label="Token sections"><ul class="sections">
  <li><a href="#color">Color</a></li><li><a href="#primitives">Primitives</a></li><li><a href="#scales">Spacing, radius, size</a></li>
  <li><a href="#density">Density</a></li><li><a href="#type">Typography</a></li><li><a href="#contrast">Contrast</a></li>
</ul></nav>
${colorSection()}
${primitivesSection()}
${scaleSection()}
${densitySection()}
${typeSection()}
${contrastSection(results)}`;
  return renderPage({
    title: "Sterling tokens",
    description: "Every Sterling design token, with its value in each color mode, and the contrast of every text and background pair.",
    base: "../",
    current: "tokens",
    main,
    css: PAGE_CSS,
    version: VERSION,
    repositoryUrl: LINKS.repository,
    releasesUrl: LINKS.releases,
  });
}

const css = buildTokenCss(tokens);
const results = evaluateContrast(tokens);
mkdirSync(resolve(outDir, "tokens"), { recursive: true });
writeFileSync(resolve(outDir, "tokens.css"), css);
writeFileSync(resolve(outDir, "tokens/index.html"), buildHtml(results));
if (HAS_FONTS) {
  mkdirSync(resolve(outDir, "fonts"), { recursive: true });
  for (const file of Object.values(FONT_FILES)) copyFileSync(resolve(INTER, "Inter (web)", file), resolve(outDir, "fonts", file));
  copyFileSync(resolve(INTER, "LICENSE.txt"), resolve(outDir, "fonts", "LICENSE.txt"));
} else {
  console.log("Inter isn't installed in ui/node_modules, so site/fonts/ was skipped (run `npm install` in ui/ to include it).");
}
const failures = results.filter((r) => !r.pass).length;
console.log(`Wrote site/tokens/index.html and site/tokens.css — ${results.length} contrast pairs, ${failures} failure(s).`);
