// Website check: opens every page of the built website (site/) in headless Chrome and fails if
//   • a page has an axe violation, in any color mode (the system preference is emulated, as a reader's
//     operating system would set it, and the page is confirmed to be in that mode before axe runs), as it
//     loads and as it is without JavaScript: a page that shows one part at a time shows all of it without, so
//     every part is checked. (Its script marks what it adds, data-script-added, and the list it steps through,
//     data-stepping; the check undoes both. Turning scripts off in Chrome would stop axe too.);
//   • a page's step-through (the AI page, the demo replay) doesn't work by keyboard: Tab reaches Next, Enter and
//     Space work it, and a step's button opens that step;
//   • a page scrolls sideways at phone width (375px);
//   • an internal link or anchor goes nowhere: every link on every page is followed to its file, and an
//     anchor (#…) to an element with that id;
//   • a link or frame into Storybook names a story or docs page that the built Storybook doesn't have
//     (storybook/index.json): renaming Examples › Pool loans would otherwise leave /example/ blank;
//   • a page's link-preview picture (og:image) on this website isn't in site/;
//   • a page's menu doesn't mark its own group and itself, and only those, or doesn't list its group's pages in
//     order (NAV in scripts/lib/page-shell.mjs). A framed page (/example/) has a slim bar instead of the menu.
// Storybook (site/storybook/) is checked story by story by check:a11y; here only links into it are followed (and
// axe doesn't reach into the frame on /example/, which shows a story).
//
// Usage: npm run check:site   (needs site/: run `npm run site` at the repo root first)
// Chrome: CHROME_PATH, or the usual install location.

import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { startChrome } from "./lib/chrome.mjs";
import { NAV } from "../../scripts/lib/page-shell.mjs";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(ui, "../site");
if (!existsSync(join(site, "index.html"))) {
  console.error("site/ is missing. Run `npm run site` at the repo root first.");
  process.exit(1);
}
const THEMES = JSON.parse(readFileSync(resolve(ui, "../tokens/tokens.json"), "utf8")).color.$modes;
/**
 * Pages linked before they are built: each is allowed to be missing, and the check says so. The list must be
 * empty before a release: remove a page from it in the change that builds it.
 */
const PENDING = [];
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

// ------------------------------------------------------------ the site, served as GitHub Pages serves it

/** The file a site path serves: a folder serves its index.html. */
function fileFor(path) {
  const file = join(site, normalize(decodeURIComponent(path)).replace(/^[/\\]+/, ""));
  if (existsSync(file) && statSync(file).isDirectory()) return join(file, "index.html");
  return file;
}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const server = createServer((request, response) => {
  const url = new URL(request.url, "http://x");
  const file = fileFor(url.pathname);
  if (existsSync(join(site, url.pathname)) && statSync(join(site, url.pathname)).isDirectory() && !url.pathname.endsWith("/")) {
    response.writeHead(301, { location: `${url.pathname}/` });
    return response.end();
  }
  try {
    const body = readFileSync(file);
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;

// ------------------------------------------------------------ the pages, and every internal link on them

/** The website's own pages: every index.html outside storybook/ and ai/. */
const PAGES = ["", "tokens/", "install/", "ai-tools/", "demo/", "example/", "runs/", ...PENDING.filter((p) => existsSync(join(site, p, "index.html")))].filter((p) => existsSync(join(site, p, "index.html")));
const problems = [];
const pending = new Set();
/** Storybook's stories and docs pages, by id, as the built Storybook lists them. */
const storybookIndex = join(site, "storybook", "index.json");
const storyIds = existsSync(storybookIndex) ? new Set(Object.keys(JSON.parse(readFileSync(storybookIndex, "utf8")).entries)) : null;
if (!storyIds) problems.push("storybook/index.json is missing: the links into Storybook can't be checked");
/** The address the site is published at, from the export (ai/index.json), to find og:image pictures in site/. */
const websiteUrl = JSON.parse(readFileSync(join(site, "ai", "index.json"), "utf8")).links.website;
let stories = 0;
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
let links = 0;
for (const page of PAGES) {
  const html = readFileSync(join(site, page, "index.html"), "utf8");
  for (const [, raw] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const href = raw.replace(/&amp;/g, "&");
    if (/^(https?:|mailto:|data:)/.test(href)) continue;
    links++;
    const target = new URL(href, `${origin}/${page}`);
    const path = target.pathname.slice(1);
    const pathFolder = path.endsWith("/") || path === "" ? path : null;
    if (PENDING.some((p) => path === p || path.startsWith(p))) {
      if (!existsSync(join(site, path, pathFolder !== null ? "index.html" : ""))) {
        pending.add(path.split("#")[0] || path);
        continue;
      }
    }
    const file = fileFor(target.pathname);
    if (!existsSync(file)) {
      problems.push(`/${page}: "${href}" goes nowhere (${target.pathname})`);
      continue;
    }
    // Into Storybook: iframe.html?id=<id>, or the manager's ?path=/story/<id> or /docs/<id>.
    if (path.startsWith("storybook/") && storyIds) {
      const id = target.searchParams.get("id") ?? /^\/(?:story|docs)\/([^&]+)/.exec(target.searchParams.get("path") ?? "")?.[1];
      if (id) {
        stories++;
        if (!storyIds.has(id)) problems.push(`/${page}: "${href}" names "${id}", which the built Storybook doesn't have (storybook/index.json)`);
      }
    }
    if (target.hash && file.endsWith(".html") && !file.includes(`${join("site", "storybook")}`)) {
      const id = decodeURIComponent(target.hash.slice(1));
      if (!idsOf(readFileSync(file, "utf8")).has(id)) problems.push(`/${page}: "${href}" has no element with id "${id}"`);
    }
  }
}

// The menu: each page marks its own group (aria-current="true") and itself (aria-current="page"), and lists its
// group's pages in NAV's order.
let menus = 0;
const labelsOf = (html, attr) => [...html.matchAll(new RegExp(`<a [^>]*${attr}[^>]*>([^<]*)</a>`, "g"))].map((m) => m[1]);
for (const group of NAV) {
  for (const item of group.items) {
    if (item.path === undefined || !PAGES.includes(item.path)) continue;
    const html = readFileSync(join(site, item.path, "index.html"), "utf8");
    if (html.includes('class="frame-bar"')) continue;
    const nav = /<nav class="site-nav"[\s\S]*?<\/nav>/.exec(html)?.[0];
    if (!nav) {
      problems.push(`/${item.path}: has no site menu`);
      continue;
    }
    menus++;
    const marked = labelsOf(nav, 'aria-current="true"');
    if (marked.join() !== group.label) problems.push(`/${item.path}: the menu marks the group [${marked.join(", ")}], not "${group.label}"`);
    const here = labelsOf(nav, 'aria-current="page"');
    if (here.join() !== item.label) problems.push(`/${item.path}: the menu marks [${here.join(", ")}], not "${item.label}"`);
    const pages = labelsOf(/<ul class="site-nav__pages"[\s\S]*?<\/ul>/.exec(nav)?.[0] ?? "", "href");
    if (pages.join() !== group.items.map((i) => i.label).join()) problems.push(`/${item.path}: the menu's second row is [${pages.join(", ")}]`);
  }
}

for (const page of PAGES) {
  const html = readFileSync(join(site, page, "index.html"), "utf8");
  for (const [, image] of html.matchAll(/<meta property="og:image" content="([^"]+)"/g)) {
    const local = image.startsWith(websiteUrl) ? image.slice(websiteUrl.length) : null;
    if (!local) problems.push(`/${page}: og:image "${image}" isn't on this website`);
    else if (!existsSync(join(site, local))) problems.push(`/${page}: og:image "${image}" isn't in site/ (${local})`);
  }
}

// ------------------------------------------------------------ Chrome: axe in every color mode, and phone width

const chrome = startChrome({ name: "site", width: 1280, height: 900 });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function openTab() {
  const devtools = await chrome.devtools();
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const target = await (await fetch(`${devtools}/json/new?about:blank`, { method: "PUT" })).json();
      const socket = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((done, fail) => (socket.once("open", done), socket.once("error", fail)));
      let id = 0;
      const waiting = new Map();
      socket.on("message", (data) => {
        const message = JSON.parse(data);
        if (message.id && waiting.has(message.id)) {
          waiting.get(message.id)(message);
          waiting.delete(message.id);
        }
      });
      const send = (method, params = {}) => new Promise((done) => (waiting.set(++id, done), socket.send(JSON.stringify({ id, method, params }))));
      const evaluate = async (expression) => {
        const { result } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        if (result?.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "evaluation failed");
        return result?.result?.value;
      };
      await send("Page.enable");
      return { send, evaluate, close: () => socket.close() };
    } catch {
      await sleep(250);
    }
  }
  throw new Error("Chrome didn't start");
}

async function load(tab, url) {
  await tab.send("Page.navigate", { url });
  for (let waited = 0; waited < 15000; waited += 100) {
    await sleep(100);
    if ((await tab.evaluate("document.readyState").catch(() => "")) === "complete") break;
  }
  await tab.evaluate("document.fonts.ready.then(() => true)");
}

/** Presses a key in the page, as a keyboard does. */
async function press(tab, key) {
  const keys = { Tab: { code: "Tab", keyCode: 9 }, Enter: { code: "Enter", keyCode: 13, text: "\r" }, " ": { code: "Space", keyCode: 32, text: " " } };
  const { code, keyCode, text } = keys[key];
  await tab.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, text });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode });
  await sleep(50);
}

/** A page's step-through, by keyboard alone. */
async function checkSteps(tab, page) {
  const shown = () => tab.evaluate(`[...document.querySelectorAll(".steps > li")].filter((s) => !s.hidden).map((s) => s.id).join(",")`);
  const current = () => tab.evaluate(`document.querySelector('.stepper [aria-current="step"]')?.textContent ?? ""`);
  await load(tab, `${origin}/${page}`);
  if ((await shown()) !== "step-1") return problems.push(`/${page}: the step-through doesn't open on step 1 alone`);
  let tabs = 0;
  while (!(await tab.evaluate(`document.activeElement?.textContent === "Next"`))) {
    if (++tabs > 300) return problems.push(`/${page}: Tab never reaches Next`);
    await press(tab, "Tab");
  }
  await press(tab, "Enter");
  if ((await shown()) !== "step-2" || !(await current()).startsWith("2.")) problems.push(`/${page}: Enter on Next doesn't open step 2`);
  if (!(await tab.evaluate(`document.activeElement?.id === "step-2-title"`))) problems.push(`/${page}: after Next, focus isn't on the step's heading`);
  await tab.evaluate(`[...document.querySelectorAll(".stepper button")][5].focus()`);
  await press(tab, " ");
  if ((await shown()) !== "step-6" || !(await current()).startsWith("6.")) problems.push(`/${page}: Space on step 6's button doesn't open it`);
  await load(tab, `${origin}/${page}#step-4`);
  if ((await shown()) !== "step-4") problems.push(`/${page}#step-4: the address doesn't open step 4`);
}

let runs = 0;
try {
  const tab = await openTab();
  for (const page of PAGES) {
    for (const theme of THEMES) {
      for (const script of [true, false]) {
        runs++;
        const where = `/${page} (${theme}${script ? "" : ", as without JavaScript"})`;
        await tab.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme.toLowerCase() }] });
        await load(tab, `${origin}/${page}`);
        const mode = await tab.evaluate(`document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")`);
        if (mode !== theme.toLowerCase()) {
          problems.push(`${where}: rendered in ${mode}`);
          continue;
        }
        if (!script)
          await tab.evaluate(`document.querySelectorAll("[data-script-added]").forEach((e) => e.remove());
            document.querySelectorAll("[data-stepping]").forEach((list) => { list.removeAttribute("data-stepping"); [...list.children].forEach((c) => (c.hidden = false)); });`);
        await tab.evaluate(axeSource);
        const violations = await tab.evaluate(
          `axe.run(document, { iframes: false }).then((r) => r.violations.map((v) => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })))`
        );
        for (const v of violations) problems.push(`${where}: ${v.rule} [${v.impact}] — ${v.help}: ${v.nodes.join(", ")}`);
      }
    }
    // A page with a step-through (the AI page, the demo replay): by keyboard alone.
    if (readFileSync(join(site, page, "index.html"), "utf8").includes('class="steps"')) {
      await tab.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      await checkSteps(tab, page);
    }
    // Phone width: nothing may make the page scroll sideways.
    await tab.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    await load(tab, `${origin}/${page}`);
    const widths = await tab.evaluate("({ scroll: document.documentElement.scrollWidth, view: innerWidth })");
    if (widths.scroll > widths.view) problems.push(`/${page}: scrolls sideways at phone width (${widths.scroll}px content in a ${widths.view}px window)`);
  }
  tab.close();
} finally {
  chrome.kill();
  server.close();
}

for (const problem of problems) console.error(`  ✗ ${problem}`);
const notYet = pending.size ? ` Not built yet, and allowed for now: ${[...pending].map((p) => `/${p}`).join(", ")}.` : "";
console.log(
  `${PAGES.length} pages × ${THEMES.length} color modes (${THEMES.join(", ")}), as loaded and as without JavaScript, and phone width: ${runs} axe runs; ` +
    `the step-throughs by keyboard; the menu on ${menus} pages; ${links} internal links followed (${stories} of them name a Storybook story or docs page) — ${problems.length} problem(s).${notYet}`
);
process.exit(problems.length ? 1 : 0);
