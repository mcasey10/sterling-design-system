#!/usr/bin/env node
// Builds a static token reference from tokens/tokens.json:
//   site/tokens.css   The token CSS from scripts/lib/token-css.mjs (the same text `npm run tokens:css`
//                     writes to dist/tokens.css)
//   site/index.html   Self-contained reference page (CSS inlined, no external requests):
//                     color tokens in both modes with their alias, primitive ramps, scales,
//                     density, type specimens, and every contrast pair with its ratio
// The contrast results come from scripts/lib/tokens.mjs, the same code as `npm run contrast`.
//
// Usage: npm run tokens:site   (output in site/, which is gitignored)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTokens, entries, flattenPrimitives, resolveColor, aliasOf, evaluateContrast } from "./lib/tokens.mjs";
import { PREFIX, cssVar, cssClass, defaultDensity, buildTokenCss } from "./lib/token-css.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../site");
const tokens = loadTokens();
const primitives = flattenPrimitives(tokens);
const [LIGHT, DARK] = tokens.color.$modes;
const DENSITY_MODES = tokens.density.$modes;
const DEFAULT_DENSITY = defaultDensity(tokens);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
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
      return `<tr><td>${esc(r.mode)}</td><td>${esc(r.rule)}</td><td><span class="pair" style="color:${r.fgHex};background:${r.bgHex}">Aa</span></td><td><code>${esc(r.fg)}</code><br><span class="muted">on</span> <code>${esc(r.bg)}</code></td><td class="num">${r.ratio.toFixed(2)}:1</td><td>${esc(r.level)} · ${req}</td><td><span class="status status-${status.toLowerCase()}">${icon} ${status}</span></td></tr>`;
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

const PAGE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--color-surface-background); color: var(--color-text-primary); font: 400 14px/1.5 var(--font-family); }
header, main { max-width: 1120px; margin: 0 auto; padding: 0 16px; }
header { padding-top: 32px; display: flex; flex-wrap: wrap; gap: 16px; align-items: end; justify-content: space-between; }
h1 { font-size: 28px; line-height: 36px; margin: 0; }
h2 { font-size: 20px; line-height: 28px; margin: 0 0 4px; }
h3 { font-size: 14px; margin: 16px 0 8px; text-transform: capitalize; }
p { color: var(--color-text-secondary); margin: 0 0 16px; max-width: 72ch; }
nav { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 16px auto 0; max-width: 1120px; padding: 0 16px; }
nav a { color: var(--color-accent-default); }
section { background: var(--color-surface-panel); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: 24px; margin: 24px 0; }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; vertical-align: top; padding: 8px 12px 8px 0; border-top: 1px solid var(--color-border-default); }
thead th { border-top: 0; color: var(--color-text-secondary); font-weight: 600; font-size: 12px; }
th[scope="row"] { font-weight: 600; }
code { font: 12px/16px "Roboto Mono", ui-monospace, monospace; }
.muted, .note { color: var(--color-text-secondary); font-size: 12px; font-weight: 400; }
.note { max-width: 36ch; }
.token-value { display: flex; gap: 8px; align-items: center; }
.swatch { display: inline-block; width: 32px; height: 32px; flex: none; border-radius: var(--radius-sm); border: 1px solid var(--color-border-default); }
.ramp ul { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0; }
.ramp li { display: grid; gap: 2px; font-size: 12px; width: 72px; }
.ramp .swatch { width: 72px; height: 40px; }
.bar { display: inline-block; height: 12px; background: var(--color-accent-default); border-radius: 2px; min-width: 1px; }
.radius-demo { display: inline-block; width: 48px; height: 32px; border: 2px solid var(--color-accent-default); }
.pair { display: inline-block; padding: 4px 8px; border-radius: var(--radius-sm); font-weight: 600; border: 1px solid var(--color-border-default); }
.num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.status { font-weight: 600; white-space: nowrap; }
.status-pass { color: var(--color-status-positive-strong); }
.status-fail { color: var(--color-status-critical-strong); }
.status-info { color: var(--color-text-secondary); }
.theme { display: flex; gap: 4px; }
.theme button { font: inherit; padding: 4px 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-strong); background: var(--color-surface-panel); color: var(--color-text-primary); cursor: pointer; }
.theme button[aria-pressed="true"] { background: var(--color-accent-default); color: var(--color-text-inverse); border-color: transparent; }
.theme button:focus-visible, nav a:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
footer { max-width: 1120px; margin: 0 auto 32px; padding: 0 16px; color: var(--color-text-secondary); font-size: 12px; }
`.replace(/var\(--/g, `var(--${PREFIX}-`); // the page styles itself with the prefixed tokens

const THEME_JS = `
const root = document.documentElement;
const buttons = document.querySelectorAll(".theme button");
function setTheme(t) {
  if (t === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === t)));
}
buttons.forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme)));
setTheme("system");
`;

function buildHtml(css, results) {
  const meta = tokens.$meta ?? {};
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.name ?? "Tokens")} tokens</title>
<style>
${css}
${PAGE_CSS}
</style>
</head>
<body>
<header>
  <div>
    <h1>${esc(meta.name ?? "Tokens")} — token reference</h1>
    <p>Generated from tokens/tokens.json (version ${esc(meta.version ?? "?")}). The same tokens drive the Figma library and <code>tokens.css</code>.</p>
  </div>
  <div class="theme" role="group" aria-label="Color mode">
    <button type="button" data-theme="system">System</button>
    <button type="button" data-theme="light">${esc(LIGHT)}</button>
    <button type="button" data-theme="dark">${esc(DARK)}</button>
  </div>
</header>
<nav aria-label="Sections">
  <a href="#color">Color</a><a href="#primitives">Primitives</a><a href="#scales">Spacing, radius, size</a>
  <a href="#density">Density</a><a href="#type">Typography</a><a href="#contrast">Contrast</a>
</nav>
<main>
${colorSection()}
${primitivesSection()}
${scaleSection()}
${densitySection()}
${typeSection()}
${contrastSection(results)}
</main>
<footer>Generated by scripts/build-token-site.mjs — run <code>npm run tokens:site</code> after changing tokens.json. Fictional data; no real brands.</footer>
<script>${THEME_JS}</script>
</body>
</html>
`;
}

const css = buildTokenCss(tokens);
const results = evaluateContrast(tokens);
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "tokens.css"), css);
writeFileSync(resolve(outDir, "index.html"), buildHtml(css, results));
const failures = results.filter((r) => !r.pass).length;
console.log(`Wrote site/index.html and site/tokens.css — ${results.length} contrast pairs, ${failures} failure(s).`);
