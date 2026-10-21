// Accessibility run: opens every story of the built Storybook in headless Chrome, in every color mode, and
// runs axe-core on it. Exits 1 if any story has a violation, or doesn't render.
//
// It checks what the Accessibility panel checks, on every story at once: the story itself (#storybook-root),
// against axe's default rules. Three rules about whole pages are off, because a story is a fragment: region,
// landmark-one-main, and page-has-heading-one. Docs pages aren't run; they show the same stories.
//
// Usage: npm run check:a11y   (needs storybook-static/: run `npm run build-storybook` first)
// Chrome: CHROME_PATH, or the usual install location. The run writes a11y-report.json (not committed).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { startChrome } from "./lib/chrome.mjs";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(ui, "storybook-static");
if (!existsSync(join(site, "index.json"))) {
  console.error("storybook-static/ is missing. Run `npm run build-storybook` first.");
  process.exit(1);
}
const THEMES = JSON.parse(readFileSync(resolve(ui, "../tokens/tokens.json"), "utf8")).color.$modes;
const PAGE_RULES_OFF = ["region", "landmark-one-main", "page-has-heading-one"];
const TABS = 4;
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const stories = Object.values(JSON.parse(readFileSync(join(site, "index.json"), "utf8")).entries).filter((entry) => entry.type === "story");
const only = process.argv[2]; // optional: a part of a story id, to run a few stories
const jobs = stories.filter((story) => !only || story.id.includes(only)).flatMap((story) => THEMES.map((theme) => ({ story, theme })));

// ------------------------------------------------------------ a static server for the built Storybook

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon" };
const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(/^[/\\]+/, "") || "index.html";
  try {
    const body = readFileSync(join(site, path));
    response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;

// ------------------------------------------------------------ Chrome, driven over the DevTools protocol

const chrome = startChrome({ name: "a11y", width: 1440, height: 900 });
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

/** Opens one story in one theme and returns its violations, or an error if it didn't render. */
async function check(tab, { story, theme }) {
  // The system preference matches the theme too, so a story that follows the system (an example screen with its
  // own color-mode setting) is checked in the mode asked for, not in the browser's default Light.
  await tab.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme.toLowerCase() }] });
  await tab.send("Page.navigate", { url: `${origin}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}` });
  // Confirm the mode: the root's data-theme if something set it, otherwise the system preference.
  const modeCheck = `(document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"))`;
  let state = "";
  for (let waited = 0; waited < 20000 && state !== "ready" && state !== "error"; waited += 100) {
    await sleep(100);
    state = await tab
      .evaluate(
        `document.body.classList.contains("sb-show-errordisplay") ? "error"
          : document.body.classList.contains("sb-show-main") && document.getElementById("storybook-root")?.childElementCount > 0 ? "ready" : ""`
      )
      .catch(() => "");
  }
  if (state !== "ready") return { error: state === "error" ? "the story threw an error" : "the story didn't render in 20 seconds" };
  // Fonts, and the forced hover / focus / pressed states, settle just after the story renders.
  await tab.evaluate("document.fonts.ready.then(() => new Promise((done) => setTimeout(done, 350)))");
  const mode = await tab.evaluate(modeCheck);
  if (mode !== theme.toLowerCase()) return { error: `rendered in ${mode}, not ${theme}: something on the page overrode the color mode` };
  await tab.evaluate(axeSource);
  const run = `axe.run(document.getElementById("storybook-root"), { rules: ${JSON.stringify(Object.fromEntries(PAGE_RULES_OFF.map((rule) => [rule, { enabled: false }])))} })
    .then((results) => results.violations.map((v) => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(" "), summary: (n.failureSummary || "").split("\\n").slice(1).join(" ").trim() })) })))`;
  // Storybook's own Accessibility panel runs axe when a story renders, and axe runs one check at a time.
  for (let attempt = 0; ; attempt++) {
    try {
      return { violations: await tab.evaluate(run) };
    } catch (error) {
      if (attempt >= 40 || !String(error.message).includes("already running")) throw error;
      await sleep(250);
    }
  }
}

const results = [];
let failed = 0;
try {
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: Math.min(TABS, queue.length) }, async () => {
      const tab = await openTab();
      for (let job = queue.shift(); job; job = queue.shift()) {
        const outcome = await check(tab, job).catch((error) => ({ error: String(error.message ?? error).split("\n")[0] }));
        results.push({ story: job.story.id, title: `${job.story.title} › ${job.story.name}`, theme: job.theme, ...outcome });
      }
      tab.close();
    })
  );
} finally {
  chrome.kill();
  server.close();
}

results.sort((a, b) => a.story.localeCompare(b.story) || a.theme.localeCompare(b.theme));
for (const result of results) {
  if (result.error) {
    failed++;
    console.error(`  ✗ ${result.title} (${result.theme}): ${result.error}`);
  }
  for (const violation of result.violations ?? []) {
    failed++;
    console.error(`  ✗ ${result.title} (${result.theme}): ${violation.rule} [${violation.impact}] — ${violation.help}, ${violation.nodes.length} element(s)`);
    for (const node of violation.nodes.slice(0, 3)) console.error(`      ${node.target}${node.summary ? ` — ${node.summary}` : ""}`);
  }
}
writeFileSync(join(ui, "a11y-report.json"), JSON.stringify(results, null, 2));
const clean = results.filter((result) => !result.error && !result.violations?.length).length;
console.log(`${stories.length} stories × ${THEMES.length} color modes (${THEMES.join(", ")}): ${clean} of ${results.length} clean — ${failed} problem(s).`);
process.exit(failed ? 1 : 0);
