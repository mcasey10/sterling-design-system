// Builds the website's pages that come from TypeScript data: Start here (site/index.html), from the
// audience matrix in definitions/audiences.ts, and Install sterling-ui (site/install/index.html), from the
// setup block in definitions/setup.ts. The token reference is built by scripts/build-token-site.mjs; all use
// the same page shell (scripts/lib/page-shell.mjs).
//
// Usage: npm run pages   (scripts/build-site.mjs runs it as part of `npm run site`)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { installPackage, type SetupBlock } from "../../definitions/setup";
import { AUDIENCES, HOW, NO_SETUP, type Audience, type How, type Place } from "../../definitions/audiences";
import { COMPONENTS } from "../../definitions/components";
import { ICONS } from "../../definitions/icons";
import { INSTALL_PACKAGE_URL, MCP_SETUP_URL, RELEASES_URL, REPOSITORY_URL, WEBSITE_URL } from "../../definitions/site";
import { esc, renderPage } from "../../scripts/lib/page-shell.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const site = resolve(root, "site");
const VERSION = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version as string;

/** An address on this website, made relative to a page `base` levels below the root, so the site works wherever it's served. */
const local = (url: string, base: string) => (url.startsWith(WEBSITE_URL) ? base + url.slice(WEBSITE_URL.length) || "./" : url);
/** Text with `backticks` for code; addresses become links (relative ones for this website, from the root). */
const inlineText = (text: string, base = "") =>
  esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\((https:\/\/[^\s)]+)\)/g, (_, url) => `(<a href="${esc(local(url, base))}">${esc(url.replace(/^https:\/\//, "").replace(/\/$/, ""))}</a>)`);

/**
 * A setup block, with the same headings in the same order everywhere it appears. Its title is the page's h1
 * when the block is the page (`level` 1), so the section is labelled by that heading.
 */
export function setupHtml(block: SetupBlock, level = 2, base = ""): string {
  const h = `h${level}`;
  const sub = `h${level + 1}`;
  const inline = (text: string) => inlineText(text, base);
  const title = level === 1 ? "" : `\n  <${h} id="${block.id}-title">${esc(block.title)}</${h}>`;
  return `
<section class="panel setup" id="${block.id}" aria-labelledby="${block.id}-title">${title}
  <${sub}>Where</${sub}>
  <p>${inline(block.where)}</p>
  <${sub}>You need</${sub}>
  <ul class="needs">${block.need
    .map((n) => `<li><strong>${esc(n.what)}.</strong> Check: <code>${esc(n.check)}</code> shows ${inline(n.expect)}. If not, get ${inline(n.get)}</li>`)
    .join("")}</ul>
  <${sub}>Do</${sub}>
  ${block.steps.map((s) => (s.command ? `<pre><code>${esc(s.command)}</code></pre>` : `<p>${inline(s.text ?? "")}</p>`)).join("\n  ")}
  ${block.scope ? `<${sub}>Scope</${sub}>\n  <p>${inline(block.scope)}</p>` : ""}
  <${sub}>It worked if</${sub}>
  <p>${inline(block.worked)}</p>
  <${sub}>If it didn't</${sub}>
  <ul>${block.failed.map((f) => `<li>${inline(f)}</li>`).join("")}</ul>
</section>`;
}

// ---------------------------------------------------------------- Start here

/** How you get it, as a pill. Its text carries the meaning; the one quiet difference is a fill when setup is needed. */
const pill = (how: How) =>
  `<span class="how${NO_SETUP.includes(how) ? "" : " how--setup"}"><span class="visually-hidden">How you get it: </span>${esc(how)}</span>`;

/** A place: its links on one line, what it gives you under them, and how you get it in the top-right corner. */
function place(p: Place, base: string): string {
  const links = p.links.map((l) => `<a href="${esc(local(l.url, base))}">${esc(l.label)}</a>`).join(" and ");
  return `<li class="place"><div class="links">${p.or ? "Or " : ""}${links}</div>${pill(p.how)}<div class="note">${esc(p.note)}</div></li>`;
}

const row = (a: Audience, base: string) => `<tr id="${a.id}">
  <th scope="row"><span class="role">${esc(a.role)}</span><span class="why">${esc(a.why)}</span></th>
  <td><ul class="places">${a.places.map((p) => place(p, base)).join("")}</ul></td>
</tr>`;

function startHere(): string {
  const base = "";
  const key = (hows: How[]) =>
    `<dl class="hows">${hows.map((how) => `<div><dt>${pill(how)}</dt><dd>${esc(HOW[how])}</dd></div>`).join("")}</dl>`;
  const all = Object.keys(HOW) as How[];
  const main = `<div class="column">
<h1>Sterling</h1>
<p class="lead">Sterling is a design system: design tokens, components and usage guidance that keep product screens
consistent. Designers use it in Figma, developers use it in React, and AI tools can look it up while they write code. All
three come from one set of definitions, so they always describe the same thing, and automated checks fail if they drift
apart. It's intentionally small: ${Object.keys(COMPONENTS).length} components and ${Object.keys(ICONS).length} icons.</p>

<section class="panel" aria-labelledby="start-title">
  <h2 id="start-title">Start with your role</h2>
  <p>Find the row that matches what you want to do with Sterling, then follow its links.</p>
  <table class="matrix">
    <thead><tr><th scope="col">Who you are</th><th scope="col">Where to go</th></tr></thead>
    <tbody>
${AUDIENCES.map((a) => row(a, base)).join("\n")}
    </tbody>
  </table>
  <h3>How you get each</h3>
  <div class="key">
    <div><h4>Nothing to set up</h4>${key(all.filter((h) => NO_SETUP.includes(h)))}</div>
    <div><h4>Setup needed, once</h4>${key(all.filter((h) => !NO_SETUP.includes(h)))}</div>
  </div>
</section>

<section class="panel" aria-labelledby="set-up-title">
  <h2 id="set-up-title">Set up</h2>
  <ul class="setups">
    <li><a href="${esc(local(INSTALL_PACKAGE_URL, base))}">Install sterling-ui</a>: add the components to a React project</li>
    <li><a href="${esc(local(MCP_SETUP_URL, base))}">Set up the MCP server</a>: connect Sterling to your AI tool</li>
  </ul>
</section>
</div>`;
  return renderPage({
    title: "Sterling Design System",
    description: "Sterling, a design system for data-dense applications: where to start, for each kind of reader.",
    base,
    current: "start",
    main,
    css: START_CSS,
    script: FORWARD_JS,
    version: VERSION,
    repositoryUrl: REPOSITORY_URL,
    releasesUrl: RELEASES_URL,
  });
}

// ---------------------------------------------------------------- Install sterling-ui

function installPage(): string {
  const base = "../";
  const block = installPackage(VERSION);
  const main = `
<h1 id="${block.id}-title">${esc(block.title)}</h1>
<p class="lead">The Sterling components in your React project, version ${esc(VERSION)}, from the GitHub Release.</p>
${setupHtml(block, 1, base)}`;
  return renderPage({
    title: "Install sterling-ui",
    description: "How to install sterling-ui, Sterling's React components, into a React project.",
    base,
    current: "install",
    main,
    css: SETUP_CSS,
    version: VERSION,
    repositoryUrl: REPOSITORY_URL,
    releasesUrl: RELEASES_URL,
  });
}

const SETUP_CSS = `
.setup h2, .setup h3 { font-size: 14px; margin-top: 16px; }
.setup h2:first-child { margin-top: 0; }
.setup ul { margin: 0 0 12px; padding-left: 20px; }
`;

const START_CSS = `
.visually-hidden { position: absolute; width: var(--stroke-1); height: var(--stroke-1); overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
/* One content column, the page's full width: the introduction, the table, and Set up share its edges. */
.column p { max-width: none; }
.matrix th[scope="row"] { width: 40%; padding-right: 24px; }
.role { display: block; font-weight: 600; }
.why { display: block; margin-top: 2px; color: var(--color-text-secondary); font-weight: 400; font-size: 13px; }
.places { list-style: none; margin: 0; padding: 0; }
.place { display: grid; grid-template-columns: 1fr auto; align-items: start; column-gap: 12px; padding: 8px 0; }
.place .how { grid-column: 2; grid-row: 1 / span 2; }
.place .note { grid-column: 1; }
.place:first-child { padding-top: 0; }
.place:last-child { padding-bottom: 0; }
.place + .place { border-top: 1px solid var(--color-border-default); }
.note { font-size: 13px; color: var(--color-text-secondary); }
/* How you get it. Not Chip/Status: that is for a record's status. Neutral colors, no status tone; the text
   carries the meaning, and "setup needed" adds one quiet difference, a fill. */
.how { display: inline-block; flex: none; font-size: 12px; line-height: 16px; padding: 1px 8px; border: 1px solid var(--color-border-default); border-radius: var(--radius-pill); color: var(--color-text-secondary); white-space: nowrap; }
.how--setup { background: var(--color-surface-hover); }
.key { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; }
.key h4 { margin: 0 0 8px; font-size: 13px; color: var(--color-text-secondary); }
.hows { display: grid; grid-template-columns: max-content 1fr; gap: 8px 12px; align-items: baseline; margin: 0; }
.hows div { display: contents; }
.hows dd { margin: 0; }
.setups { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
@media (max-width: 720px) {
  .matrix thead { position: absolute; width: var(--stroke-1); height: var(--stroke-1); overflow: hidden; clip-path: inset(50%); }
  .matrix, .matrix tbody, .matrix tr, .matrix th, .matrix td, .matrix th[scope="row"] { display: block; width: auto; }
  .matrix tr { border-top: 1px solid var(--color-border-default); padding: 12px 0; }
  .matrix th, .matrix td { border-top: 0; padding: 4px 0; }
  .matrix th[scope="row"] { padding: 0 0 8px; }
  .place .how { grid-row: 1; }
  .place .note { grid-column: 1 / -1; }
  .key { grid-template-columns: 1fr; }
  .hows { grid-template-columns: 1fr; gap: 4px; }
  .hows dt { justify-self: start; }
  .hows dd { margin-bottom: 8px; }
}
`;

// The token reference used to be the home page. Its section links (/#color and the rest) still arrive here,
// so send them on to the same section of /tokens/.
const FORWARD_JS = `
(() => {
  const sections = ["color", "primitives", "scales", "density", "type", "contrast"];
  const forward = () => {
    const target = location.hash.slice(1);
    if (sections.includes(target)) location.replace("tokens/#" + target);
  };
  forward();
  addEventListener("hashchange", forward);
})();
`;

mkdirSync(resolve(site, "install"), { recursive: true });
writeFileSync(resolve(site, "index.html"), startHere());
writeFileSync(resolve(site, "install/index.html"), installPage());
console.log("Wrote site/index.html (Start here) and site/install/index.html (Install sterling-ui).");
