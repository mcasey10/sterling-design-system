// Website check: opens every page of the built website (site/) in headless Chrome and fails if
//   • a page has an axe violation, in any color mode (the system preference is emulated, as a reader's
//     operating system would set it, and the page is confirmed to be in that mode before axe runs);
//   • a page scrolls sideways at phone width (375px);
//   • an internal link or anchor goes nowhere: every link on every page is followed to its file, and an
//     anchor (#…) to an element with that id.
// Storybook (site/storybook/) is checked story by story by check:a11y; here only links into it are followed.
//
// Usage: npm run check:site   (needs site/: run `npm run site` at the repo root first)
// Chrome: CHROME_PATH, or the usual install location.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(ui, "../site");
if (!existsSync(join(site, "index.html"))) {
  console.error("site/ is missing. Run `npm run site` at the repo root first.");
  process.exit(1);
}
const THEMES = JSON.parse(readFileSync(resolve(ui, "../tokens/tokens.json"), "utf8")).color.$modes;
/**
 * Pages linked before they are built: each is allowed to be missing, and the check says so. The list must be
 * empty before a release: remove a page from it in the change that builds it (ai-tools/: the AI page).
 */
const PENDING = ["ai-tools/"];
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
const PAGES = ["", "tokens/", "install/", ...PENDING.filter((p) => existsSync(join(site, p, "index.html")))].filter((p) => existsSync(join(site, p, "index.html")));
const problems = [];
const pending = new Set();
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
    if (target.hash && file.endsWith(".html") && !file.includes(`${join("site", "storybook")}`)) {
      const id = decodeURIComponent(target.hash.slice(1));
      if (!idsOf(readFileSync(file, "utf8")).has(id)) problems.push(`/${page}: "${href}" has no element with id "${id}"`);
    }
  }
}

// ------------------------------------------------------------ Chrome: axe in every color mode, and phone width

const CHROME = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => path && existsSync(path));
if (!CHROME) {
  console.error("Chrome not found. Set CHROME_PATH to a Chrome or Chromium executable.");
  process.exit(1);
}
const debugPort = 9300 + ((process.pid + 300) % 600);
const chrome = spawn(
  CHROME,
  ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--window-size=1280,900", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "stl-site-"))}`, "about:blank"],
  { stdio: "ignore" }
);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function openTab() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" })).json();
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

let runs = 0;
try {
  const tab = await openTab();
  for (const page of PAGES) {
    for (const theme of THEMES) {
      runs++;
      await tab.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme.toLowerCase() }] });
      await load(tab, `${origin}/${page}`);
      const mode = await tab.evaluate(`document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")`);
      if (mode !== theme.toLowerCase()) {
        problems.push(`/${page} (${theme}): rendered in ${mode}`);
        continue;
      }
      await tab.evaluate(axeSource);
      const violations = await tab.evaluate(
        `axe.run(document).then((r) => r.violations.map((v) => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })))`
      );
      for (const v of violations) problems.push(`/${page} (${theme}): ${v.rule} [${v.impact}] — ${v.help}: ${v.nodes.join(", ")}`);
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
  `${PAGES.length} pages × ${THEMES.length} color modes (${THEMES.join(", ")}) and phone width: ${runs} axe runs; ${links} internal links followed — ${problems.length} problem(s).${notYet}`
);
process.exit(problems.length ? 1 : 0);
