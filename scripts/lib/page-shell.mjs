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
.site-header__inner { max-width: 1120px; margin: 0 auto; padding: 12px 16px 8px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px 24px; }
.brand { font-weight: 600; font-size: 16px; color: var(--color-text-primary); text-decoration: none; }
.brand span { color: var(--color-text-secondary); font-weight: 400; font-size: 12px; margin-left: 4px; }
/* Two rows: the brand and the two groups, then the pages of the current page's group. */
.site-nav { flex: 1 1 auto; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 8px 24px; }
.site-nav ul { display: flex; flex-wrap: wrap; gap: 4px 16px; list-style: none; margin: 0; padding: 0; }
.site-nav__pages { grid-column: 1 / -1; }
/* A thin rule between the brand and the groups, so "Sterling 1.2.0" doesn't read as the first group. */
.site-nav ul.site-nav__groups { border-left: 1px solid var(--color-border-default); padding-left: 24px; }
.site-nav ul a { color: var(--color-text-primary); text-decoration: none; padding: 4px 0; border-bottom: 2px solid transparent; }
.site-nav ul a:hover { border-bottom-color: var(--color-border-strong); }
.site-nav__groups a { font-weight: 600; color: var(--color-text-secondary); }
.site-nav__groups a[aria-current="true"] { color: var(--color-text-primary); border-bottom-color: var(--color-accent-default); }
.site-nav__pages a[aria-current="page"] { border-bottom-color: var(--color-accent-default); font-weight: 600; }
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
  .site-nav { gap: 8px 16px; }
  .site-nav ul { gap: 4px 12px; }
  .site-nav ul.site-nav__groups { padding-left: 16px; }
  h1 { font-size: 24px; line-height: 32px; }
}
`);

// The color mode a visitor chose (light or dark), kept in localStorage under this key; nothing saved means System.
// Storage can be unavailable (private windows, blocked site data), so every access is wrapped and System is the fallback.
const THEME_KEY = "sterling-color-mode";

// In the head, before first paint: applies a saved choice, so a page never flashes in the other mode.
const THEME_HEAD_JS = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

// Sets the color mode, and tells the page (a "themechange" event on document) so a page can follow it. The switch
// starts from the saved choice (applied in the head) and saves each new one.
const THEME_JS = `
(() => {
  const root = document.documentElement;
  const buttons = document.querySelectorAll(".theme button");
  const key = ${JSON.stringify(THEME_KEY)};
  function setTheme(t, save) {
    if (t === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === t)));
    if (save) {
      try {
        if (t === "system") localStorage.removeItem(key); else localStorage.setItem(key, t);
      } catch (e) {}
    }
    document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }
  buttons.forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme, true)));
  setTheme(root.getAttribute("data-theme") || "system", false);
})();
`;

/**
 * The site's navigation: two groups, each with its pages in order. `path` is relative to the site root; `external`
 * marks an item that isn't on this website (its address is passed to renderPage). A group's link opens its first page.
 * The header shows both groups, then the pages of the current page's group.
 */
export const NAV = [
  {
    id: "sterling",
    label: "Sterling",
    items: [
      { id: "start", label: "Start here", path: "" },
      { id: "install", label: "Install", path: "install/" },
      { id: "tokens", label: "Tokens", path: "tokens/" },
      { id: "storybook", label: "Storybook", path: "storybook/" },
      { id: "github", label: "GitHub", external: "repository" },
    ],
  },
  {
    id: "build-with-ai",
    label: "Build with AI",
    items: [
      { id: "ai-tools", label: "Set up", path: "ai-tools/" },
      { id: "demo", label: "Watch it build", path: "demo/" },
      { id: "example", label: "Live example", path: "example/" },
      { id: "runs", label: "Follow-up runs", path: "runs/" },
    ],
  },
];
/** The group a page (a NAV item id) belongs to. */
export const navGroupOf = (current) => NAV.find((group) => group.items.some((item) => item.id === current));

/**
 * The document head: title, description, Open Graph tags when `og` is given ({ url, image, imageWidth, imageHeight,
 * imageAlt }: absolute addresses, as link previews need), the fonts, the token CSS, and the shell's styles.
 */
function head({ title, description, base, css, og = /** @type {any} */ (undefined) }) {
  const fontCss = Object.entries(FONT_FILES)
    .map(([weight, file]) => `@font-face { font-family: "${tokens.typography.fontFamily}"; font-style: normal; font-weight: ${weight}; font-display: swap; src: url("${base}fonts/${file}") format("woff2"); }`)
    .join("\n");
  const ogTags = og
    ? `
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sterling">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(og.url)}">
<meta property="og:image" content="${esc(og.image)}">
<meta property="og:image:width" content="${esc(og.imageWidth)}">
<meta property="og:image:height" content="${esc(og.imageHeight)}">
<meta property="og:image:alt" content="${esc(og.imageAlt)}">
<meta name="twitter:card" content="summary_large_image">`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${ogTags}
<script>${THEME_HEAD_JS}</script>
<style>
${fontCss}
${buildTokenCss(tokens)}
${SHELL_CSS}
${tokenStyles(css)}
</style>
</head>`;
}

const themeSwitch = () => `<div class="theme" role="group" aria-label="Color mode">
      <button type="button" data-theme="system">System</button>
      <button type="button" data-theme="light">${esc(LIGHT)}</button>
      <button type="button" data-theme="dark">${esc(DARK)}</button>
    </div>`;

/**
 * A whole page. `base` is the way back to the site root from the page ("" at the root, "../" one folder
 * down), so every link and the fonts work wherever the site is published. `current` is the NAV id.
 */
export function renderPage({ title, description, base, current, main, css = "", script = "", version, repositoryUrl, releasesUrl, og = /** @type {any} */ (undefined) }) {
  const group = navGroupOf(current);
  if (!group) throw new Error(`renderPage: "${current}" isn't a page in NAV`);
  const href = (item) => (item.external === "repository" ? esc(repositoryUrl) : esc(base + item.path) || "./");
  const groups = NAV.map((g) => {
    const here = g === group ? ' aria-current="true"' : "";
    return `<li><a href="${href(g.items[0])}"${here}>${esc(g.label)}</a></li>`;
  }).join("");
  const pages = group.items.map((item) => {
    const here = item.id === current ? ' aria-current="page"' : "";
    return `<li><a href="${href(item)}"${here}>${esc(item.label)}</a></li>`;
  }).join("");
  const nav = `<nav class="site-nav" aria-label="Site">
      <a class="brand" href="${esc(base) || "./"}">Sterling<span>${esc(version)}</span></a>
      <ul class="site-nav__groups">${groups}</ul>
      <ul class="site-nav__pages" aria-label="${esc(group.label)}">${pages}</ul>
    </nav>`;
  return `${head({ title, description, base, css, og })}
<body class="${PREFIX}-text-body">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="site-header__inner">
    ${nav}
    ${themeSwitch()}
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

const FRAME_CSS = `
html, body { height: 100%; }
body { display: flex; flex-direction: column; }
.frame-bar { flex: none; border-bottom: 1px solid var(--color-border-default); background: var(--color-surface-panel); }
.frame-bar__inner { padding: 8px 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; }
.frame-bar h1 { margin: 0; font-size: 13px; line-height: 20px; font-weight: 400; }
.frame-bar .links { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 13px; }
.frame-bar .note { margin: 0; font-size: 13px; color: var(--color-text-secondary); max-width: none; flex-basis: 100%; }
.frame-main { flex: 1 1 auto; min-height: 0; display: flex; max-width: none; margin: 0; padding: 0; }
.frame-main iframe { flex: 1 1 auto; width: 100%; min-height: 480px; border: 0; display: block; }
`;

/**
 * A page that is one framed screen: a slim bar (the brand, a line of text, links, and the color-mode switch) above
 * an iframe that fills the rest of the window. `bar` (the page's h1, set small), `note` (an optional line under it) and
 * `links` are HTML; `frame` is { src, title }.
 */
export function renderFramePage({ title, description, base, bar, note = "", links, frame, css = "", script = "", version, og = /** @type {any} */ (undefined) }) {
  return `${head({ title, description, base, css: FRAME_CSS + css, og })}
<body class="${PREFIX}-text-body">
<a class="skip" href="#main">Skip to the example</a>
<header class="frame-bar">
  <div class="frame-bar__inner">
    <a class="brand" href="${esc(base) || "./"}">Sterling<span>${esc(version)}</span></a>
    <h1>${bar}</h1>
    <div class="links">${links}</div>
    ${themeSwitch()}
    ${note ? `<p class="note">${note}</p>` : ""}
  </div>
</header>
<main id="main" class="frame-main">
<iframe src="${esc(frame.src)}" title="${esc(frame.title)}"></iframe>
</main>
<script>${THEME_JS}${script}</script>
</body>
</html>
`;
}
