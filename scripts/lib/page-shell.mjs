// The Sterling website's page shell: the head, Sterling's own fonts and token CSS, the header with the site
// navigation and the color-mode switch, and the footer. Every page of the website uses it (Start here, the
// token reference, the AI page), so they look and work alike. Styled only with Sterling's tokens, in Light and
// Dark, and laid out to work from phone width up.
// No imports beyond the token helpers, so both the Node scripts and the TypeScript page builder can use it.

import { loadTokens } from "./tokens.mjs";
import { PREFIX, buildTokenCss } from "./token-css.mjs";

const tokens = loadTokens();
const [LIGHT, DARK] = tokens.color.$modes;
/** The Inter files the site serves (copied by build-token-site.mjs into site/fonts/). */
export const FONT_FILES = { 400: "Inter-Regular.woff2", 500: "Inter-Medium.woff2", 600: "Inter-SemiBold.woff2" };

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Page styles written with short token names (var(--color-…)); they get Sterling's prefix here. */
export const tokenStyles = (css) => css.replace(/var\(--/g, `var(--${PREFIX}-`);

const SHELL_CSS = tokenStyles(`
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--color-surface-background); color: var(--color-text-primary); font: 400 14px/1.5 var(--font-family); overflow-wrap: anywhere; }
a { color: var(--color-accent-default); }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.skip { position: absolute; left: 16px; top: -64px; padding: 8px 12px; background: var(--color-surface-raised); border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); z-index: 1; }
.skip:focus { top: 8px; }
.site-header { border-bottom: 1px solid var(--color-border-default); background: var(--color-surface-panel); }
.site-header__inner { max-width: 1120px; margin: 0 auto; padding: 12px 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; }
.brand { font-weight: 600; font-size: 16px; color: var(--color-text-primary); text-decoration: none; }
.brand span { color: var(--color-text-secondary); font-weight: 400; font-size: 12px; margin-left: 4px; }
.site-nav ul { display: flex; flex-wrap: wrap; gap: 4px 16px; list-style: none; margin: 0; padding: 0; }
.site-nav a { color: var(--color-text-primary); text-decoration: none; padding: 4px 0; border-bottom: 2px solid transparent; }
.site-nav a:hover { border-bottom-color: var(--color-border-strong); }
.site-nav a[aria-current="page"] { border-bottom-color: var(--color-accent-default); font-weight: 600; }
.theme { display: flex; gap: 4px; margin-left: auto; }
.theme button { font: inherit; font-size: 12px; padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-strong); background: var(--color-surface-panel); color: var(--color-text-primary); cursor: pointer; }
.theme button[aria-pressed="true"] { background: var(--color-accent-default); color: var(--color-text-inverse); border-color: transparent; }
main { display: block; max-width: 1120px; margin: 0 auto; padding: 24px 16px 32px; }
h1 { font-size: 28px; line-height: 36px; margin: 0 0 8px; }
h2 { font-size: 20px; line-height: 28px; margin: 0 0 8px; }
h3 { font-size: 16px; line-height: 22px; margin: 16px 0 8px; }
p { margin: 0 0 16px; max-width: 72ch; }
.lead { font-size: 16px; color: var(--color-text-secondary); }
.muted { color: var(--color-text-secondary); }
code { font: 13px/18px "Roboto Mono", ui-monospace, monospace; background: var(--color-surface-hover); border-radius: var(--radius-xs); padding: 0 4px; }
pre { margin: 0 0 12px; padding: 12px 16px; background: var(--color-surface-hover); border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); overflow-x: auto; max-width: 100%; }
pre code { background: none; padding: 0; white-space: pre; overflow-wrap: normal; }
.panel { background: var(--color-surface-panel); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: 24px; margin: 24px 0; }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; vertical-align: top; padding: 8px 12px 8px 0; border-top: 1px solid var(--color-border-default); }
thead th { border-top: 0; color: var(--color-text-secondary); font-weight: 600; font-size: 12px; }
.site-footer { border-top: 1px solid var(--color-border-default); }
.site-footer__inner { max-width: 1120px; margin: 0 auto; padding: 16px 16px 32px; color: var(--color-text-secondary); font-size: 12px; display: flex; flex-wrap: wrap; gap: 4px 16px; }
@media (max-width: 640px) {
  .panel { padding: 16px; }
  h1 { font-size: 24px; line-height: 32px; }
}
`);

const THEME_JS = `
(() => {
  const root = document.documentElement;
  const buttons = document.querySelectorAll(".theme button");
  function setTheme(t) {
    if (t === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === t)));
  }
  buttons.forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme)));
  setTheme("system");
})();
`;

/** The site's sections, in navigation order. `path` is relative to the site root. */
export const NAV = [
  { id: "start", label: "Start here", path: "" },
  { id: "install", label: "Install", path: "install/" },
  { id: "tokens", label: "Tokens", path: "tokens/" },
  { id: "storybook", label: "Storybook", path: "storybook/" },
  { id: "ai-tools", label: "AI tools", path: "ai-tools/" },
];

/**
 * A whole page. `base` is the way back to the site root from the page ("" at the root, "../" one folder
 * down), so every link and the fonts work wherever the site is published. `current` is the NAV id.
 */
export function renderPage({ title, description, base, current, main, css = "", script = "", version, repositoryUrl, releasesUrl }) {
  const fontCss = Object.entries(FONT_FILES)
    .map(([weight, file]) => `@font-face { font-family: "${tokens.typography.fontFamily}"; font-style: normal; font-weight: ${weight}; font-display: swap; src: url("${base}fonts/${file}") format("woff2"); }`)
    .join("\n");
  const nav = NAV.map((item) => {
    const here = item.id === current ? ' aria-current="page"' : "";
    return `<li><a href="${esc(base + item.path) || "./"}"${here}>${esc(item.label)}</a></li>`;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<style>
${fontCss}
${buildTokenCss(tokens)}
${SHELL_CSS}
${tokenStyles(css)}
</style>
</head>
<body class="${PREFIX}-text-body">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="site-header__inner">
    <a class="brand" href="${esc(base) || "./"}">Sterling<span>${esc(version)}</span></a>
    <nav class="site-nav" aria-label="Site"><ul>${nav}<li><a href="${esc(repositoryUrl)}">GitHub</a></li></ul></nav>
    <div class="theme" role="group" aria-label="Color mode">
      <button type="button" data-theme="system">System</button>
      <button type="button" data-theme="light">${esc(LIGHT)}</button>
      <button type="button" data-theme="dark">${esc(DARK)}</button>
    </div>
  </div>
</header>
<main id="main">
${main}
</main>
<footer class="site-footer">
  <div class="site-footer__inner">
    <span>Sterling ${esc(version)}</span>
    <a href="${esc(releasesUrl)}">Releases</a>
    <a href="${esc(repositoryUrl)}">Source on GitHub</a>
    <span>Code under MIT; documentation and design under CC BY 4.0.</span>
    <span>All example data is fictional.</span>
  </div>
</footer>
<script>${THEME_JS}${script}</script>
</body>
</html>
`;
}
