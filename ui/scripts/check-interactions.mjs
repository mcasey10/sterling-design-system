// Interaction tests: opens every story with a play function (tagged "play-fn" in the built Storybook's index) in
// headless Chrome and fails if its play function throws, a story errors, or it doesn't finish in time. The same
// play functions run in Storybook's Interactions panel, step by step.
//
// It listens on Storybook's own channel from before the page loads, so it sees how each play function ended:
// storyFinished (with its status), playFunctionThrewException, or storyThrewException.
//
// Usage: npm run check:interactions   (needs storybook-static/: run `npm run build-storybook` first)
// Chrome: CHROME_PATH, or the usual install location.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(ui, "storybook-static");
if (!existsSync(join(site, "index.json"))) {
  console.error("storybook-static/ is missing. Run `npm run build-storybook` first.");
  process.exit(1);
}
const TIMEOUT = 60000;
const stories = Object.values(JSON.parse(readFileSync(join(site, "index.json"), "utf8")).entries).filter(
  (entry) => entry.type === "story" && entry.tags?.includes("play-fn")
);

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
const debugPort = 9900 + (process.pid % 90);
const chrome = spawn(
  CHROME,
  ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--window-size=1440,900", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "stl-play-"))}`, "about:blank"],
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

// Runs in the page before Storybook loads: waits for its channel, then records how the story's play function ends.
const LISTEN = `
  window.__stlPlay = { done: false };
  const listen = () => {
    const channel = window.__STORYBOOK_ADDONS_CHANNEL__;
    if (!channel) return setTimeout(listen, 5);
    const end = (outcome) => { if (!window.__stlPlay.done) window.__stlPlay = { done: true, ...outcome }; };
    channel.on("storyFinished", (e) => end({ ok: e?.status === "success", error: e?.status !== "success" ? "the story finished with status " + e?.status : null }));
    channel.on("playFunctionThrewException", (e) => end({ ok: false, error: String(e?.message ?? e).split("\\n")[0] }));
    channel.on("storyThrewException", (e) => end({ ok: false, error: String(e?.message ?? e).split("\\n")[0] }));
    channel.on("storyErrored", (e) => end({ ok: false, error: String(e?.title ?? e).split("\\n")[0] }));
  };
  listen();
`;

const problems = [];
try {
  const tab = await openTab();
  await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: LISTEN });
  for (const story of stories) {
    const title = `${story.title} › ${story.name}`;
    const started = Date.now();
    await tab.send("Page.navigate", { url: `${origin}/iframe.html?id=${story.id}&viewMode=story` });
    let outcome = null;
    while (!outcome && Date.now() - started < TIMEOUT) {
      await sleep(200);
      const state = await tab.evaluate("JSON.stringify(window.__stlPlay ?? null)").catch(() => null);
      const parsed = state ? JSON.parse(state) : null;
      if (parsed?.done) outcome = parsed;
    }
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (!outcome) problems.push(`${title}: didn't finish in ${TIMEOUT / 1000} seconds`);
    else if (!outcome.ok) problems.push(`${title}: ${outcome.error}`);
    else console.log(`  ✓ ${title} (${seconds} s)`);
  }
  tab.close();
} finally {
  chrome.kill();
  server.close();
}

for (const problem of problems) console.error(`  ✗ ${problem}`);
console.log(`${stories.length} stories with interaction tests — ${problems.length} failed.`);
process.exit(problems.length || !stories.length ? 1 : 0);
