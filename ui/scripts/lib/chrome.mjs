// Headless Chrome for the checks that drive a browser (check-site, check-a11y, check-interactions).
//
// Chrome picks a free debugging port itself (--remote-debugging-port=0) and writes it to DevToolsActivePort in
// its profile folder; the checks read it from there. A port worked out from the process ID could already be in
// use, and Chrome then never answers. If Chrome doesn't start, the error includes the end of its own output.
//
// Chrome: CHROME_PATH, or the usual install location.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Starts Chrome with a window of `width` × `height` and a new profile named after `name`. Returns `devtools()`,
 * which resolves to Chrome's DevTools address (http://127.0.0.1:<port>) once it answers, and `kill()`.
 */
export function startChrome({ name, width, height }) {
  if (!CHROME) {
    console.error("Chrome not found. Set CHROME_PATH to a Chrome or Chromium executable.");
    process.exit(1);
  }
  const profile = mkdtempSync(join(tmpdir(), `stl-${name}-`));
  const chrome = spawn(
    CHROME,
    ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", `--window-size=${width},${height}`, "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  let output = "";
  chrome.stderr.on("data", (data) => (output = (output + data).slice(-4000)));
  let exited = null;
  chrome.on("exit", (code, signal) => (exited = signal ?? `code ${code}`));
  chrome.on("error", (error) => (exited = error.message));

  let address = null;
  async function devtools() {
    if (address) return address;
    for (let waited = 0; waited < 30000; waited += 250) {
      if (exited) break;
      try {
        const port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]);
        if (port > 0) {
          const candidate = `http://127.0.0.1:${port}`;
          await fetch(`${candidate}/json/version`);
          return (address = candidate);
        }
      } catch {
        // not written yet, or not answering yet
      }
      await sleep(250);
    }
    const why = exited ? `it exited (${exited})` : "it didn't answer within 30 seconds";
    throw new Error(`Chrome didn't start: ${why}.${output.trim() ? `\nChrome's output:\n${output.trim()}` : ""}`);
  }

  return { devtools, kill: () => chrome.kill() };
}
