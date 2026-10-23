#!/usr/bin/env node
// Scores one Pool loans demo run against docs/demo/runs/checklist.md.
//
// It builds the run (npm run build: the type-check), runs the token check (check-css.mjs) and the static checks,
// serves the build with the run's own `vite preview`, and drives it in Chrome with Playwright. Elements are found
// by role and accessible name; content is matched, never wording (see the checklist's matching rules). Sterling's
// own class names are read only to see whether Sterling's mechanism is in use (the fix checks). Whatever it can't
// decide is "could not run", and the check goes to manual.
//
// Usage: node score.mjs <run folder> --out <folder> [--name run-01] [--port 4310]
//        [--vite-only]      build with `vite build` alone (calibration on a package the code doesn't type-check against)
//        [--tamper ready16] calibration only: change the page's 181 to 16 before the number checks
// Writes <out>/results.json, <out>/results.csv, and screenshots. Chrome: the installed Google Chrome.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

// ------------------------------------------------------------------ arguments

const argv = process.argv.slice(2);
const option = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const runDir = argv[0] && !argv[0].startsWith("--") ? resolve(argv[0]) : undefined;
if (!runDir || !existsSync(join(runDir, "package.json"))) {
  console.error("Usage: node score.mjs <run folder> --out <folder> [--name run-01] [--port 4310] [--vite-only] [--tamper ready16]");
  process.exit(2);
}
const outDir = resolve(option("--out", join(runDir, "..", "scores")));
const runName = option("--name", runDir.split(/[\\/]/).pop());
const port = Number(option("--port", "4310"));
const viteOnly = argv.includes("--vite-only");
const tamper = option("--tamper", "");
mkdirSync(outDir, { recursive: true });

// ------------------------------------------------------------------ the checklist, as the scorer records it

const CHECKS = {
  "FIX-a": ["DataGrid docs (rows: descriptions); Warning and exception cells 3; request: screen reader", "Sterling", "auto"],
  "FIX-b": ["Filter panel and chips 1; Filters, grid, and bulk actions 1; Saved views 2; design (Reset)", "Sterling", "auto"],
  "FIX-c": ["Loading, empty, and error states 2; DataGrid docs (empty); widths: not asked", "Sterling", "auto"],
  "NUM-186": ["request: Pool loans (186); design; totals", "AI's draft", "auto"],
  "NUM-62": ["request: Add loans (62 candidates); design; totals", "AI's draft", "auto"],
  "NUM-181": ["design; totals.loansByStatus", "AI's draft", "auto"],
  "NUM-2": ["design; request: two exceptions; totals", "AI's draft", "auto"],
  "NUM-3": ["design; totals.loansByStatus", "AI's draft", "auto"],
  "NUM-32": ["request: Harbor Point at 32%; design; totals.lendersOverTheCap", "AI's draft", "auto"],
  "NUM-issues": ["request: Right now there are three; design", "AI's draft", "auto"],
  "NUM-upb": ["design: $42.6M, $50.0M target; pool.upb, pool.targetUpb", "AI's draft", "auto"],
  "NUM-58": ["request: the 58 loans from Harbor Point Lending; design; savedViews", "AI's draft", "auto"],
  "NUM-12": ["request: Twelve to a page; pageSize", "AI's draft", "auto"],
  "DATA-invented": ["request: Use the totals for counts; don't invent more loans", "AI's draft", "auto"],
  "DATA-fictional": ["request; kit", "AI's draft", "manual"],
  "STATE-loading": ["request: The list loading; Loading, empty, and error states 1", "AI's draft", "manual"],
  "STATE-empty": ["request: a filter that matches nothing; Loading, empty, and error states 2", "AI's draft", "auto"],
  "STATE-error": ["request: the list failing to load; Loading, empty, and error states 3", "AI's draft", "manual"],
  "STATE-disabled": ["request: Submit pool only with no issues; signing off isn't available and the screen says why; Bulk action bar 3", "AI's draft", "auto"],
  "STATE-selected": ["request: one at a time, a range, the page, or all 58; Bulk action bar 1-2", "AI's draft", "auto"],
  "STATE-bulkbar": ["request: nothing / some / everything matching selected; Bulk action bar", "AI's draft", "auto"],
  "STATE-signoff": ["request: A note is required; Dialog docs; Confirmation dialog 1", "AI's draft", "auto"],
  "RULE-axe-light": ["request: Light and dark, keyboard, screen reader; Accessibility", "AI's draft", "auto"],
  "RULE-axe-dark": ["request: Light and dark, keyboard, screen reader; Accessibility", "AI's draft", "auto"],
  "RULE-tokens": ["kit: Style only with Sterling's tokens; server instructions; Color", "AI's draft", "static"],
  "RULE-typecheck": ["kit: npm run build must pass", "AI's draft", "static"],
  "EDGE-any": ["Filter panel and chips 1 (Any …)", "AI's draft", "auto"],
  "EDGE-samplegap": ["request: don't invent more loans", "kit data", "auto"],
  "EDGE-longnames": ["Data display (truncate text, never numbers); Principles; not asked", "Sterling", "auto"],
  "SCREEN-header": ["request", "AI's draft", "auto"],
  "SCREEN-tabs": ["request: Add loans is a tab you can't open yet", "AI's draft", "auto"],
  "SCREEN-view": ["request; Saved views 2-3; design", "AI's draft", "auto"],
  "SCREEN-chips": ["request: each can be removed there; Filter panel and chips 2", "AI's draft", "auto"],
  "SCREEN-columns": ["request", "AI's draft", "auto"],
  "SCREEN-sort": ["request: Sortable; Data display", "AI's draft", "auto"],
  "SCREEN-pagination": ["request; Filters, grid, and bulk actions 5", "AI's draft", "auto"],
  "SCREEN-numeric": ["Data display", "AI's draft", "manual"],
  "SCREEN-flag": ["request: without relying on color; Warning and exception cells 1", "AI's draft", "manual"],
  "SCREEN-status": ["Status chips", "AI's draft", "manual"],
  "SCREEN-summary": ["request; Data display (compact notation)", "AI's draft", "manual"],
  "SCREEN-remove": ["request: confirmation only beyond the loans on screen; Confirmation dialog 2", "AI's draft", "auto"],
  "SCREEN-undo": ["request: can be undone; Confirmation dialog", "request", "note"],
  "SCREEN-density": ["request; the package's documented contract", "AI's draft", "auto"],
  "SCREEN-theme": ["request; the package's documented contract", "AI's draft", "auto"],
  "SCREEN-keyboard": ["request", "AI's draft", "manual"],
  "SCREEN-reader": ["request", "AI's draft", "manual"],
  "SCREEN-design": ["request: for layout and content", "AI's draft", "manual"],
  "STERLING-internal": ["not asked; server: use only the components listed", "Sterling", "static"],
  "STERLING-table": ["not asked", "Sterling", "static"],
  "HONEST-report": ["request; kit", "AI's draft", "manual"],
  "HONEST-gaps": ["request: tell me what was missing", "AI's draft", "manual"],
  "HONEST-guesses": ["request", "AI's draft", "manual"],
  "RULE-deps": ["request: don't add dependencies", "AI's draft", "static"],
  "SESSION-mcp": ["methods", "-", "audit"],
  "SESSION-files": ["kit: Work only in this folder", "AI's draft", "audit"],
  "SESSION-network": ["kit: Don't use the web", "AI's draft", "audit"],
};
const HEADLINE = new Set(["FIX-a", "FIX-b", "FIX-c", "NUM-186", "NUM-181", "NUM-2", "NUM-3", "NUM-32", "NUM-issues", "DATA-invented",
  "RULE-axe-light", "RULE-axe-dark", "RULE-tokens", "RULE-typecheck", "STATE-loading", "STATE-empty", "STATE-error",
  "STATE-disabled", "STATE-selected", "STATE-bulkbar", "STATE-signoff"]);

const results = [];
const PASS = "pass", FAIL = "fail", NOTE = "note", CANT = "could not run", MANUAL = "manual";
function record(check, part, result, evidence) {
  const [source, owner, how] = CHECKS[check] ?? ["", "", ""];
  results.push({ run: runName, check, part, result, headline: HEADLINE.has(check), evidence: String(evidence ?? ""), source, owner, actualOwner: "", ownerReason: "", how });
  console.log(`${result.padEnd(13)} ${check}${part ? "." + part : ""}  ${String(evidence ?? "").slice(0, 140)}`);
}
/** Combines parts: every part must pass; any fail fails; otherwise could not run. */
function combine(check, parts) {
  const values = parts.map((p) => p.result);
  const result = values.every((v) => v === PASS) ? PASS : values.includes(FAIL) ? FAIL : CANT;
  record(check, "", result, parts.map((p) => `${p.part}: ${p.result}`).join("; "));
}

// ------------------------------------------------------------------ the data the run was given

const dataFile = join(runDir, "data", "pool-2026-07.json");
const data = JSON.parse(readFileSync(existsSync(dataFile) ? dataFile : join(here, "..", "data", "pool-2026-07.json"), "utf8"));
const DATA_IDS = new Set(data.loans.map((l) => l.id));
const statusOf = (l) => (l.signOff ? "Signed off" : l.fico >= 680 && l.ltvPercent <= 90 ? "Ready" : "Exception");
const READY_IDS = data.loans.filter((l) => statusOf(l) === "Ready").map((l) => l.id);
const seenIds = new Set();

// ------------------------------------------------------------------ static checks

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
}
function sourceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.(tsx?|css)$/.test(e.name) ? [join(dir, e.name)] : []
  );
}

console.log(`Scoring ${runName}: ${runDir}\n`);
// npm run build is the type-check and the build together. --vite-only builds without the type-check.
const build = viteOnly ? run("npx", ["vite", "build"], runDir) : run("npm", ["run", "build"], runDir);
const buildErrors = (build.stdout + build.stderr).split("\n").filter((l) => /error/i.test(l)).slice(0, 3).join(" | ");
if (viteOnly) record("RULE-typecheck", "", CANT, `calibration: vite build only (exit ${build.status})`);
else record("RULE-typecheck", "", build.status === 0 ? PASS : FAIL, `npm run build exited ${build.status}${build.status ? ": " + buildErrors : ""}`);
if (!existsSync(join(runDir, "dist", "index.html"))) {
  console.error("No build output (dist/index.html): the browser checks can't run.");
}

const css = run("node", [join(here, "check-css.mjs"), "--dir", join(runDir, "src"), "--tokens", join(runDir, "node_modules", "sterling-ui", "dist", "styles.css"), "--json", join(outDir, "check-css.json")], here);
record("RULE-tokens", "", css.status === 0 ? PASS : css.status === 1 ? FAIL : CANT, (css.stdout + css.stderr).trim().split("\n").slice(-4).join(" | "));

const srcFiles = sourceFiles(join(runDir, "src"));
const internal = [];
const tables = [];
for (const file of srcFiles) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/(?<![-\w])stl-([a-z0-9-]+)/g)) {
    if (/^(text|density)-/.test(m[1])) continue;
    internal.push(`${file.slice(runDir.length + 1)}: stl-${m[1]}`);
  }
  for (const m of text.matchAll(/<table\b|role=["'](?:grid|table|treegrid)["']/g)) tables.push(`${file.slice(runDir.length + 1)}: ${m[0]}`);
}
// Whether the run's own code renders Sterling's DataGrid, and passes it an empty state. A run that copies Sterling's
// class names onto its own table looks like DataGrid in the page, so the fix checks' mechanism needs this too.
const allSource = srcFiles.filter((f) => /\.tsx?$/.test(f)).map((f) => readFileSync(f, "utf8")).join("\n");
const usesDataGrid = /<DataGrid\b/.test(allSource);
const dataGridEmpty = [...allSource.matchAll(/<DataGrid\b/g)].some((m) => {
  const tag = allSource.slice(m.index, m.index + 4000);
  const end = tag.search(/\/>|>\s*\n?\s*<\/DataGrid>/);
  return /\bempty=\{/.test(end > 0 ? tag.slice(0, end) : tag);
});
record("STERLING-internal", "", internal.length ? FAIL : PASS, internal.length ? `${internal.length}: ${[...new Set(internal)].slice(0, 6).join(", ")}` : "none");
record("STERLING-table", "", tables.length ? FAIL : PASS, tables.length ? tables.join(", ") : "none");

const kitPkgPath = join(here, "..", "kit", "package.json");
if (existsSync(kitPkgPath)) {
  const kitPkg = JSON.parse(readFileSync(kitPkgPath, "utf8"));
  const runPkg = JSON.parse(readFileSync(join(runDir, "package.json"), "utf8"));
  const deps = (p) => Object.entries({ ...p.dependencies, ...p.devDependencies }).map(([k, v]) => (k === "sterling-ui" ? k : `${k}@${v}`)).sort();
  const extra = deps(runPkg).filter((d) => !deps(kitPkg).includes(d));
  const missing = deps(kitPkg).filter((d) => !deps(runPkg).includes(d));
  record("RULE-deps", "", extra.length || missing.length ? FAIL : PASS, extra.length || missing.length ? `added: ${extra.join(", ") || "none"}; removed: ${missing.join(", ") || "none"}` : "unchanged from the kit");
} else record("RULE-deps", "", CANT, "demo/kit/package.json not built");

// ------------------------------------------------------------------ the browser

const server = spawn("npx", ["vite", "preview", "--port", String(port), "--strictPort"], { cwd: runDir, shell: process.platform === "win32" });
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const url = `http://localhost:${port}/`;
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
function stopServer() {
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true });
  else server.kill();
}

const browser = await chromium.launch({ channel: "chrome" });
const pageErrors = [];

// In-page helpers: regions and numbers. Installed before the app loads.
function pageHelpers() {
  const s = (window.__score = {});
  s.text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  s.nums = (text) => [...text.replace(/(\d),(?=\d{3})/g, "$1").matchAll(/\d+(?:\.\d+)?/g)].map((m) => ({ value: Number(m[0]), at: m.index, end: m.index + m[0].length }));
  s.inTable = (el) => !!el.closest("table, [role=grid], [role=table], [role=treegrid]");
  s.inPicker = (el) => !!el.closest("select, [role=listbox], [role=menu], [role=option], option");
  s.containsPicker = (el) => !!el.querySelector("select, [role=listbox], [role=menu]");
  s.containsTable = (el) => !!el.querySelector("table, [role=grid], [role=table], [role=treegrid]");
  s.shown = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  s.name = (el) => (el.getAttribute("aria-label") || s.text(el));
  /** The smallest element (by text length) whose text passes the test, outside the grid, pickers, and headers if asked. */
  s.smallest = (test, { root = document.body, skip = () => false } = {}) => {
    let best = null;
    for (const el of root.querySelectorAll("*")) {
      if (["SCRIPT", "STYLE", "svg", "path"].includes(el.tagName)) continue;
      if (s.inTable(el) || s.containsTable(el) || s.inPicker(el) || s.containsPicker(el) || skip(el)) continue;
      const t = s.text(el);
      if (!t || !test(t, el)) continue;
      if (!best || t.length < s.text(best).length) best = el;
    }
    return best;
  };
  /** The number closest to a word, not crossing another of the words. */
  s.numberNear = (text, word, others = []) => {
    const lower = text.toLowerCase();
    const at = lower.indexOf(word.toLowerCase());
    if (at < 0) return null;
    const blockers = others.map((o) => { const positions = []; let i = -1; while ((i = lower.indexOf(o.toLowerCase(), i + 1)) >= 0) positions.push(i); return positions; }).flat();
    let best = null;
    for (const n of s.nums(text)) {
      const from = Math.min(n.end, at), to = Math.max(n.at, at + word.length);
      if (blockers.some((b) => b > from && b < to && b !== at)) continue;
      const distance = n.at >= at ? n.at - (at + word.length) : at - n.end;
      if (!best || distance < best.distance) best = { value: n.value, distance };
    }
    return best ? best.value : null;
  };
  s.inBanner = (el) => !!el.closest("[role=banner], header");
}

async function newPage({ width = 1440, height = 900, theme = "light", density = "default" } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.setDefaultTimeout(5000);
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript(`(${pageHelpers.toString()})()`);
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(([t, d]) => {
    document.documentElement.setAttribute("data-theme", t);
    document.body.classList.remove("stl-density-compact", "stl-density-comfortable");
    if (d !== "default") document.body.classList.add(`stl-density-${d}`);
  }, [theme, density]);
  await settle(page);
  return page;
}
async function settle(page) {
  try {
    await page.waitForFunction(() => /LN-\d{6}/.test(document.body.innerText) || document.querySelector(".stl-empty-state, [role=alert]"), null, { timeout: 10000 });
  } catch {}
  // Settled: nothing busy, and the page's text unchanged for 0.8 s (apps may simulate a slow server).
  const deadline = Date.now() + 12000;
  let last = "", since = Date.now();
  while (Date.now() < deadline) {
    const now = await page.evaluate(() => (document.querySelector("[aria-busy=true]") ? "busy" : "") + document.body.innerText);
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (!now.startsWith("busy") && Date.now() - since >= 800) break;
    await page.waitForTimeout(100);
  }
  await collectIds(page);
}
async function collectIds(page) {
  const text = await page.evaluate(() => document.body.innerText);
  for (const m of text.matchAll(/LN-\d{6}/g)) seenIds.add(m[0]);
}
/** A locator's accessible name, from Playwright's ARIA snapshot. */
async function accName(locator) {
  let line = (await locator.ariaSnapshot()).split("\n")[0].replace(/^\s*-\s*/, "");
  if (line.startsWith("'")) line = line.slice(1, line.lastIndexOf("'")).replace(/''/g, "'");
  const m = /^[\w-]+ "((?:[^"\\]|\\.)*)"/.exec(line);
  return m ? m[1].replace(/\\"/g, '"') : "";
}
const visible = (locator) => locator.filter({ visible: true });
async function firstVisible(locator) {
  const all = visible(locator);
  return (await all.count()) ? all.first() : null;
}
async function outsideTable(locator) {
  const all = visible(locator);
  for (let i = 0; i < (await all.count()); i++) {
    const item = all.nth(i);
    if (!(await item.evaluate((el) => !!el.closest("table, [role=grid], [role=table], [role=treegrid]")))) return item;
  }
  return null;
}
/** A filter field's control (a select, a combobox, or a button that opens a list), found by its name. */
async function control(page, field) {
  const re = new RegExp(field, "i");
  for (const locator of [page.getByRole("combobox", { name: re }), page.getByRole("button", { name: re }), page.getByRole("listbox", { name: re })]) {
    const all = visible(locator);
    for (let i = 0; i < (await all.count()); i++) {
      const item = all.nth(i);
      const ok = await item.evaluate((el) => !el.closest("table, [role=grid], [role=table]") && (el.tagName === "SELECT" || el.getAttribute("role") === "combobox" || el.hasAttribute("aria-haspopup")));
      const name = await accName(item);
      if (ok && !/remove/i.test(name)) return item;
    }
  }
  return null;
}
async function controlValue(item) {
  return item.evaluate((el) => (el.tagName === "SELECT" ? el.selectedOptions[0]?.textContent ?? "" : el.textContent ?? "").replace(/\s+/g, " ").trim());
}
/** Chooses an option whose name matches, in a native select or a list that opens. */
async function choose(page, item, optionRe) {
  if (await item.evaluate((el) => el.tagName === "SELECT")) {
    const labels = await item.evaluate((el) => [...el.options].map((o) => o.textContent.trim()));
    const label = labels.find((l) => optionRe.test(l));
    if (!label) return false;
    await item.selectOption({ label });
    return true;
  }
  await item.click();
  const option = await firstVisible(page.getByRole("option", { name: optionRe }));
  if (!option) {
    await page.keyboard.press("Escape");
    return false;
  }
  await option.click();
  await page.waitForTimeout(200);
  return true;
}
async function pressIfThere(page, nameRe, roles = ["button"]) {
  for (const role of roles) {
    const item = await outsideTable(page.getByRole(role, { name: nameRe }));
    if (item && (await item.isEnabled())) {
      await item.click();
      await settle(page);
      return true;
    }
  }
  return false;
}
const apply = (page) => pressIfThere(page, /^apply\b/i);
/** The applied-filter chips: buttons whose name says remove and names a filter field. */
async function chips(page) {
  const all = visible(page.getByRole("button", { name: /remove/i }));
  const names = [];
  for (let i = 0; i < (await all.count()); i++) {
    const name = await accName(all.nth(i));
    if (/\b(lender|status|fico|ltv)\b/i.test(name)) names.push(name);
  }
  return names;
}
/** Numbers in the places a count of matching loans lives: pagination, status messages (not the bulk bar's), captions. */
async function countNumbers(page) {
  return page.evaluate(() => {
    const s = window.__score;
    const regions = [];
    const buttons = [...document.querySelectorAll("button, a, [role=button]")].filter(s.shown);
    const prev = buttons.find((b) => /\bprev(ious)?\b/i.test(s.name(b)));
    const next = buttons.find((b) => /\bnext\b/i.test(s.name(b)));
    if (prev && next) {
      let a = prev;
      while (a && !a.contains(next)) a = a.parentElement;
      if (a) regions.push(s.text(a));
    }
    const signOff = buttons.find((b) => /sign off/i.test(s.name(b)));
    for (const el of document.querySelectorAll("[role=status], output, caption")) {
      let bar = el, inBar = false;
      for (let i = 0; i < 4 && bar; i++, bar = bar.parentElement) if (signOff && bar.contains(signOff)) inBar = true;
      if (!inBar) regions.push(s.text(el));
    }
    for (const t of document.querySelectorAll("table, [role=grid], [role=table]")) {
      const by = t.getAttribute("aria-describedby");
      if (by) for (const id of by.split(/\s+/)) regions.push(s.text(document.getElementById(id)));
    }
    return { numbers: [...new Set(regions.flatMap((r) => s.nums(r).map((n) => n.value)))], regions };
  });
}
async function shot(page, name) {
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true }).catch(() => {});
}
async function scenario(name, fn) {
  let page;
  try {
    return await fn();
  } catch (error) {
    console.log(`  (${name}: ${String(error).split("\n")[0].slice(0, 160)})`);
    return { error: String(error).split("\n")[0].slice(0, 200) };
  }
}
async function tamperPage(page) {
  if (tamper !== "ready16") return;
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/\b181\b/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/\b181\b/g, "16");
  });
}

// ------------------------------------------------------------------ the numbers, as the screen opens

await scenario("numbers", async () => {
  const page = await newPage();
  await tamperPage(page);
  await shot(page, "light-default-start");

  // Tabs.
  const tabs = visible(page.getByRole("tab"));
  const tabNames = [];
  for (let i = 0; i < (await tabs.count()); i++) tabNames.push(await accName(tabs.nth(i)));
  const poolTab = tabNames.find((n) => /pool loans/i.test(n));
  const addTab = tabNames.find((n) => /add loans/i.test(n));
  const inTab = (name, expected, check) => {
    if (name === undefined) return record(check, "", CANT, `tab not found (tabs: ${tabNames.join(" | ") || "none"})`);
    const values = (name.replace(/,(?=\d{3})/g, "").match(/\d+(\.\d+)?/g) ?? []).map(Number);
    record(check, "", values.includes(expected) ? PASS : values.length ? FAIL : CANT, `tab "${name}"`);
  };
  inTab(poolTab, 186, "NUM-186");
  inTab(addTab, 62, "NUM-62");

  // Loans by status.
  const status = await page.evaluate(() => {
    const s = window.__score;
    const words = ["Ready", "Exception", "Signed off"];
    const region = s.smallest((t) => words.every((w) => t.toLowerCase().includes(w.toLowerCase())) && s.nums(t).length > 0);
    if (!region) return null;
    const out = { region: s.text(region).slice(0, 160) };
    for (const w of words) {
      const el = s.smallest((t) => t.toLowerCase().includes(w.toLowerCase()) && s.nums(t).length > 0, { root: region });
      out[w] = el ? s.numberNear(s.text(el), w, words.filter((o) => o !== w && !o.toLowerCase().includes(w.toLowerCase()) && !w.toLowerCase().includes(o.toLowerCase()))) : undefined;
      out[w + " text"] = el ? s.text(el).slice(0, 80) : "";
    }
    return out;
  });
  for (const [check, word, expected] of [["NUM-181", "Ready", 181], ["NUM-2", "Exception", 2], ["NUM-3", "Signed off", 3]]) {
    if (!status) record(check, "", CANT, "no region holds Ready, Exception, and Signed off with numbers");
    else if (status[word] === undefined || status[word] === null) record(check, "", CANT, `no number beside ${word} in "${status.region}"`);
    else record(check, "", status[word] === expected ? PASS : FAIL, `${status[word]} beside ${word}: "${status[word + " text"]}"`);
  }

  // Harbor Point's share against the cap.
  const share = await page.evaluate(() => {
    const s = window.__score;
    const el = s.smallest((t) => /harbor point/i.test(t) && s.nums(t).length >= 2);
    return el ? { text: s.text(el).slice(0, 120), values: s.nums(s.text(el)).map((n) => n.value) } : null;
  });
  if (!share) record("NUM-32", "", CANT, "no element with Harbor Point and two numbers");
  else if (!share.values.includes(32)) record("NUM-32", "", FAIL, `"${share.text}"`);
  else record("NUM-32", "", share.values.includes(30) ? PASS : CANT, `"${share.text}"${share.values.includes(30) ? "" : " (cap 30 not beside it)"}`);

  // The issue count: in the header (beside Submit pool) and in the summary.
  const issues = await page.evaluate(() => {
    const s = window.__score;
    const submit = [...document.querySelectorAll("button")].find((b) => /submit pool/i.test(s.name(b)));
    let header = submit?.closest("[role=banner], header") ?? null;
    if (!header && submit) {
      header = submit;
      while (header.parentElement && !header.querySelector("h1, [role=heading][aria-level='1']")) header = header.parentElement;
    }
    const near = (el) => (el ? { text: s.text(el).slice(0, 100), value: s.numberNear(s.text(el), "issue") } : null);
    const inHeader = header ? s.smallest((t) => /issue/i.test(t) && s.nums(t).length > 0, { root: header }) : null;
    const inSummary = s.smallest((t) => /issue/i.test(t) && s.nums(t).length > 0, { skip: (el) => (header ? header.contains(el) || el.contains(header) : false) });
    return { header: near(inHeader), summary: near(inSummary), headerFound: !!header };
  });
  const issueParts = [["header", issues.header], ["summary", issues.summary]].map(([where, found]) => ({
    where,
    result: !found || found.value === null ? CANT : found.value === 3 ? PASS : FAIL,
    text: found ? `${where}: ${found.value} in "${found.text}"` : `${where}: not found`,
  }));
  record("NUM-issues", "", issueParts.every((p) => p.result === PASS) ? PASS : issueParts.some((p) => p.result === FAIL) ? FAIL : CANT, issueParts.map((p) => p.text).join("; "));

  // The pool's balance against the target, in the summary.
  const upb = await page.evaluate(() => {
    const s = window.__score;
    let region = [...document.querySelectorAll("[role=complementary], aside")].find(s.shown);
    if (!region) {
      const bar = document.querySelector("[role=progressbar], [role=meter], progress, meter");
      region = bar ? s.smallest((t) => /\$/.test(t), { skip: (el) => !el.contains(bar) || s.inBanner(el) }) : null;
    }
    if (!region) region = s.smallest((t) => /target/i.test(t) && /\$/.test(t), { skip: (el) => s.inBanner(el) });
    return region ? { text: s.text(region).slice(0, 160), values: s.nums(s.text(region)).map((n) => n.value) } : null;
  });
  if (!upb) record("NUM-upb", "", CANT, "summary not found");
  else {
    const has = (v, m) => upb.values.includes(v) || upb.values.includes(m);
    record("NUM-upb", "", has(42.6, 42600000) && (has(50, 50000000) || upb.values.includes(50.0)) ? PASS : FAIL, `"${upb.text}"`);
  }

  // 58 near the view, the grid's count, or the pagination.
  const counts = await countNumbers(page);
  const pageText = await page.evaluate(() => document.body.innerText);
  if (counts.numbers.includes(58)) record("NUM-58", "", PASS, `count regions: ${counts.regions.filter((r) => r).join(" | ").slice(0, 120)}`);
  else if (/\b58\b/.test(pageText)) record("NUM-58", "", CANT, "58 shown, but not in a count region");
  else record("NUM-58", "", FAIL, `count regions: ${counts.regions.join(" | ").slice(0, 120) || "none"}`);

  // 12 body rows.
  const rows = await page.evaluate(() => [...document.querySelectorAll("tr, [role=row]")].filter((r) => /LN-\d{6}/.test(r.textContent) && !r.querySelector("th[scope=col], [role=columnheader]")).length);
  record("NUM-12", "", rows === 12 ? PASS : rows ? FAIL : CANT, `${rows} loan rows`);

  // The header, the tabs, the view, the columns.
  const heading = await page.getByRole("heading", { name: /pool 2026-07/i }).count();
  const draft = /\bdraft\b/i.test(pageText);
  const saveDraft = await outsideTable(page.getByRole("button", { name: /save draft/i }));
  const submit = await outsideTable(page.getByRole("button", { name: /submit pool/i }));
  record("SCREEN-header", "", heading && draft && saveDraft && submit ? PASS : FAIL, `heading ${!!heading}, Draft ${draft}, Save draft ${!!saveDraft}, Submit pool ${!!submit}`);
  record("STATE-disabled", "submit", submit ? ((await submit.isDisabled()) ? PASS : FAIL) : CANT, submit ? `Submit pool disabled: ${await submit.isDisabled()}` : "Submit pool not found");

  if (addTab !== undefined) {
    const add = visible(page.getByRole("tab", { name: /add loans/i })).first();
    const disabled = await add.isDisabled().catch(() => false);
    let stays = disabled;
    if (!disabled) {
      await add.click().catch(() => {});
      await page.waitForTimeout(300);
      stays = (await visible(page.getByRole("tab", { name: /pool loans/i })).first().getAttribute("aria-selected")) === "true";
    }
    record("SCREEN-tabs", "", stays ? PASS : FAIL, disabled ? "Add loans tab disabled" : stays ? "Add loans doesn't open" : "Add loans opened");
  } else record("SCREEN-tabs", "", CANT, "tabs not found");

  const viewControl = await outsideTable(page.getByRole("button", { name: /harbor point loans/i })) ?? (await outsideTable(page.getByRole("combobox", { name: /harbor point loans|view/i })));
  const viewText = viewControl ? (await controlValue(viewControl)) + " " + (await accName(viewControl)) : "";
  const saveView = await outsideTable(page.getByRole("button", { name: /save view/i }));
  record("SCREEN-view", "", /harbor point loans/i.test(viewText) && saveView && (await saveView.isDisabled()) ? PASS : viewControl ? FAIL : CANT,
    `view "${viewText.trim()}", Save view ${saveView ? ((await saveView.isDisabled()) ? "disabled" : "enabled") : "not found"}`);

  const headers = visible(page.getByRole("columnheader"));
  const headerNames = [];
  for (let i = 0; i < (await headers.count()); i++) headerNames.push(await accName(headers.nth(i)));
  const wanted = [/\bid\b/i, /lender/i, /upb|balance/i, /fico/i, /ltv/i, /status/i, /exception|rule|reason/i];
  const missing = wanted.filter((w) => !headerNames.some((n) => w.test(n)));
  record("SCREEN-columns", "", headerNames.length ? (missing.length ? FAIL : PASS) : CANT, `headers: ${headerNames.join(" | ")}${missing.length ? `; missing ${missing.join(" ")}` : ""}`);

  // Pagination: Previous disabled on page 1; Next goes on without inventing rows.
  const prev = await outsideTable(page.getByRole("button", { name: /\bprev(ious)?\b/i }));
  const next = await outsideTable(page.getByRole("button", { name: /\bnext\b/i }));
  if (prev && next) {
    const prevDisabled = await prev.isDisabled();
    await next.click();
    await settle(page);
    const prev2 = await outsideTable(page.getByRole("button", { name: /\bprev(ious)?\b/i }));
    const enabled2 = prev2 ? await prev2.isEnabled() : false;
    record("SCREEN-pagination", "", prevDisabled && enabled2 ? PASS : FAIL, `Previous disabled on page 1: ${prevDisabled}; on page 2: ${prev2 ? (enabled2 ? "enabled" : "disabled") : "not shown"}`);
    await shot(page, "light-default-page2");
  } else record("SCREEN-pagination", "", CANT, "Previous / Next not found");
  await page.close();
});

// ------------------------------------------------------------------ FIX-a: the flagged cell's reason

await scenario("FIX-a", async () => {
  const page = await newPage();
  if (!(await page.getByRole("row", { name: /LN-204389/ }).count())) {
    const status = await control(page, "status");
    if (status && (await choose(page, status, /^exception/i))) await apply(page);
    await settle(page);
  }
  const target = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("tr, [role=row]")];
    const row = rows.find((r) => /LN-204389/.test(r.textContent) && !r.querySelector("th[scope=col], [role=columnheader]"));
    const header = rows.find((r) => r.querySelector("th[scope=col], [role=columnheader]"));
    if (!row || !header) return { found: false };
    const cellsOf = (r) => [...r.children].filter((c) => /^(TD|TH)$/.test(c.tagName) || /cell|header/.test(c.getAttribute("role") ?? ""));
    const index = cellsOf(header).findIndex((c) => /\bltv\b/i.test(c.textContent));
    const cell = cellsOf(row)[index];
    if (!cell) return { found: false };
    cell.setAttribute("data-score-target", "fix-a");
    const description = cell.querySelector(".stl-body-cell__description");
    const describedBy = (cell.getAttribute("aria-describedby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
    return { found: true, inDataGrid: !!cell.closest(".stl-data-grid"), description: description?.textContent.trim() ?? "", describedBy: describedBy.trim() };
  });
  if (!target.found) {
    combine("FIX-a", [{ part: "mechanism", result: CANT }, { part: "outcome", result: CANT }]);
    return record("FIX-a", "mechanism", CANT, "LN-204389's LTV cell not found");
  }
  const mechanism = usesDataGrid && target.inDataGrid && target.description ? PASS : FAIL;
  record("FIX-a", "mechanism", mechanism, `code renders <DataGrid>: ${usesDataGrid}; cell in DataGrid's markup: ${target.inDataGrid}; DataGrid description: "${target.description}"`);
  const cell = page.locator("[data-score-target=fix-a]");
  const name = await accName(cell);
  const said = `${name} ${target.describedBy}`;
  const values = [...said.replace(/,(?=\d{3})/g, "").matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  const outcome = values.includes(93) && values.includes(90) ? PASS : FAIL;
  record("FIX-a", "outcome", outcome, `accessible name "${name}"${target.describedBy ? `; description "${target.describedBy}"` : ""}`);
  combine("FIX-a", [{ part: "mechanism", result: mechanism }, { part: "outcome", result: outcome }]);
  await page.close();
});

// ------------------------------------------------------------------ FIX-b: Reset and Clear all

await scenario("FIX-b", async () => {
  const page = await newPage();
  const lender = await control(page, "lender");
  const status = await control(page, "status");
  if (!lender || !status) {
    record("FIX-b", "mechanism", CANT, `filter controls not found (lender ${!!lender}, status ${!!status})`);
    record("FIX-b", "outcome", CANT, "");
    combine("FIX-b", [{ part: "mechanism", result: CANT }, { part: "outcome", result: CANT }]);
    return;
  }
  const chose = await choose(page, status, /^exception/i);
  if (chose) await apply(page);
  const before = await chips(page);
  const reset = await pressIfThere(page, /^reset\b/i);
  if (!reset) {
    record("FIX-b", "mechanism", CANT, "no Reset button");
    record("FIX-b", "outcome", CANT, "");
    combine("FIX-b", [{ part: "mechanism", result: CANT }, { part: "outcome", result: CANT }]);
    return;
  }
  let notes = `chips before Reset: ${before.join(" | ")}`;
  let after = await chips(page);
  let counts = await countNumbers(page);
  // If Reset only refilled the panel, apply it, and say so.
  if (!counts.numbers.includes(58) && (await apply(page))) {
    notes += "; Reset needed Apply";
    after = await chips(page);
    counts = await countNumbers(page);
  }
  const lenderValue = await controlValue(lender);
  const statusValue = await controlValue(status);
  const texts = await page.evaluate(() => [...document.querySelectorAll("input[type=text], input:not([type]), input[type=search], input[type=number]")].filter((i) => !i.closest("table")).map((i) => i.value));
  const mechanism = /harbor point/i.test(lenderValue) && !/exception|ready|signed off/i.test(statusValue) && texts.every((v) => !v.trim()) ? PASS : FAIL;
  record("FIX-b", "mechanism", mechanism, `after Reset the panel shows Lender "${lenderValue}", Status "${statusValue}", text fields [${texts.join(", ")}]`);
  const resetOk = counts.numbers.includes(58) && after.length === 1 && /harbor point/i.test(after[0]);
  await shot(page, "light-default-after-reset");
  await page.close();
  // Clear all, from the view plus a Status filter (two chips: some screens show Clear all only then).
  const page2 = await newPage();
  const status2 = await control(page2, "status");
  if (status2 && (await choose(page2, status2, /^exception/i))) await apply(page2);
  const cleared = await pressIfThere(page2, /clear all/i, ["button", "link"]);
  const afterClear = await chips(page2);
  const clearCounts = await countNumbers(page2);
  const clearOk = cleared && afterClear.length === 0 && clearCounts.numbers.includes(186);
  await page2.close();
  const outcome = resetOk && clearOk ? PASS : !cleared && resetOk ? CANT : FAIL;
  record("FIX-b", "outcome", outcome,
    `after Reset: chips [${after.join(" | ")}], counts [${counts.numbers.join(", ")}]; after Clear all${cleared ? "" : " (no Clear all button)"}: chips [${afterClear.join(" | ")}], counts [${clearCounts.numbers.join(", ")}]; ${notes}`);
  combine("FIX-b", [{ part: "mechanism", result: mechanism }, { part: "outcome", result: outcome }]);
});

// ------------------------------------------------------------------ FIX-c, STATE-empty, EDGE-samplegap: a filter with no sample loans

async function emptyPage(width = 1440) {
  const page = await newPage({ width });
  const lender = await control(page, "lender");
  const status = await control(page, "status");
  const a = lender && (await choose(page, lender, /pinecrest/i));
  const b = status && (await choose(page, status, /^signed off/i));
  if (a || b) await apply(page);
  await settle(page);
  const rows = await page.evaluate(() => [...document.querySelectorAll("tr, [role=row]")].filter((r) => /LN-\d{6}/.test(r.textContent) && !r.querySelector("th[scope=col], [role=columnheader]")).length);
  return { page, reached: !!(a && b), rows };
}
async function measureEmpty(page) {
  return page.evaluate(() => {
    const message = document.querySelector(".stl-data-grid__empty") ?? document.querySelector(".stl-empty-state");
    if (!message || !message.textContent.trim()) return null;
    for (let a = message.parentElement; a; a = a.parentElement) a.scrollLeft = 0;
    const grid = message.closest(".stl-data-grid, table, [role=grid], [role=table]") ?? message;
    window.scrollTo(Math.max(0, grid.getBoundingClientRect().left + window.scrollX), Math.max(0, message.getBoundingClientRect().top + window.scrollY - 100));
    // The visible area: the viewport, cut by every ancestor that clips.
    let clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    for (let a = message.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) {
        const r = a.getBoundingClientRect();
        clip = { left: Math.max(clip.left, r.left), top: Math.max(clip.top, r.top), right: Math.min(clip.right, r.right), bottom: Math.min(clip.bottom, r.bottom) };
      }
    }
    const lines = [];
    const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0) lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    }
    const outside = lines.filter((r) => r.left < clip.left - 1 || r.right > clip.right + 1 || r.top < clip.top - 1 || r.bottom > clip.bottom + 1);
    return { lines: lines.length, outside: outside.length, clip, dataGrid: message.classList.contains("stl-data-grid__empty"), text: message.textContent.replace(/\s+/g, " ").trim().slice(0, 100), wayOut: !!message.querySelector("button, a") };
  });
}
await scenario("FIX-c", async () => {
  const { page, reached, rows } = await emptyPage();
  if (!reached || rows > 0) {
    record("FIX-c", "mechanism", CANT, reached ? `${rows} rows shown for Pinecrest Funding + Signed off` : "couldn't choose Pinecrest Funding and Signed off");
    record("FIX-c", "outcome", CANT, "");
    combine("FIX-c", [{ part: "mechanism", result: CANT }, { part: "outcome", result: CANT }]);
    record("STATE-empty", "", CANT, "empty state not reached");
    record("EDGE-samplegap", "", CANT, "");
    return;
  }
  const wide = await measureEmpty(page);
  await shot(page, "light-default-empty");
  const counts = await countNumbers(page);
  record("STATE-empty", "", wide ? (wide.wayOut ? PASS : FAIL) : CANT, wide ? `message "${wide.text}"; a way out: ${wide.wayOut}` : "no Sterling empty state found");
  record("EDGE-samplegap", "", NOTE, `no rows; counts shown [${counts.numbers.join(", ")}]; message "${wide?.text ?? ""}"`);
  const mechanism = wide ? (dataGridEmpty && wide.dataGrid ? PASS : FAIL) : dataGridEmpty ? CANT : FAIL;
  record("FIX-c", "mechanism", mechanism, `code passes empty= to <DataGrid>: ${dataGridEmpty}; message in DataGrid's empty cell: ${wide ? wide.dataGrid : "no Sterling empty state found"}`);
  await page.close();
  const parts = [];
  for (const width of [390, 768]) {
    const narrow = await emptyPage(width);
    const m = await measureEmpty(narrow.page);
    await shot(narrow.page, `light-default-empty-${width}`);
    parts.push(!m ? `${width}px: not found` : `${width}px: ${m.outside} of ${m.lines} lines outside the visible area`);
    if (!m) parts.result = CANT;
    else if (m.outside > 0) parts.failed = true;
    await narrow.page.close();
  }
  const outcome = parts.result === CANT ? CANT : parts.failed ? FAIL : PASS;
  record("FIX-c", "outcome", outcome, parts.join("; "));
  combine("FIX-c", [{ part: "mechanism", result: mechanism }, { part: "outcome", result: outcome }]);
});

// ------------------------------------------------------------------ EDGE-any: "Any lender"

await scenario("EDGE-any", async () => {
  const page = await newPage();
  const lender = await control(page, "lender");
  if (!lender || !(await choose(page, lender, /^(any|all)\b/i))) return record("EDGE-any", "", CANT, "no Any / All option for Lender");
  await apply(page);
  const list = await chips(page);
  const counts = await countNumbers(page);
  record("EDGE-any", "", list.some((c) => /lender/i.test(c)) ? FAIL : PASS, `chips [${list.join(" | ")}]; counts [${counts.numbers.join(", ")}]`);
  await page.close();
});

// ------------------------------------------------------------------ chips stay in sync with the panel

await scenario("SCREEN-chips", async () => {
  const page = await newPage();
  const chip = await firstVisible(page.getByRole("button", { name: /remove.*harbor point|harbor point.*remove/i }));
  if (!chip) return record("SCREEN-chips", "", CANT, "no removable Harbor Point chip");
  await chip.click();
  await settle(page);
  const lender = await control(page, "lender");
  const value = lender ? await controlValue(lender) : "";
  const left = await chips(page);
  record("SCREEN-chips", "", !left.some((c) => /harbor point/i.test(c)) && lender && !/harbor point/i.test(value) ? PASS : lender ? FAIL : CANT, `chips after removing: [${left.join(" | ")}]; Lender field "${value}"`);
  await page.close();
});

// ------------------------------------------------------------------ sort

await scenario("SCREEN-sort", async () => {
  const page = await newPage();
  const header = await firstVisible(page.getByRole("columnheader", { name: /\b(loan )?id\b/i }));
  if (!header) return record("SCREEN-sort", "", CANT, "no ID column");
  const button = header.getByRole("button");
  await ((await button.count()) ? button.first() : header).click();
  await settle(page);
  const sorted = await page.evaluate(() => [...document.querySelectorAll("[aria-sort]")].map((h) => `${h.textContent.trim()}=${h.getAttribute("aria-sort")}`).filter((s) => !/=none$/.test(s)));
  record("SCREEN-sort", "", sorted.length === 1 ? PASS : FAIL, `aria-sort: ${sorted.join(", ") || "none"}`);
  await page.close();
});

// ------------------------------------------------------------------ selection and the bulk action bar

const rowLocator = (page, id) => page.getByRole("row", { name: new RegExp(id) });
async function rowCheckbox(page, id) {
  const row = rowLocator(page, id);
  return (await row.count()) ? row.first().getByRole("checkbox").first() : null;
}
async function checkedRows(page) {
  return page.evaluate(() => [...document.querySelectorAll("tr, [role=row]")].filter((r) => /LN-\d{6}/.test(r.textContent) && !r.querySelector("th[scope=col], [role=columnheader]")).filter((r) => {
    const box = r.querySelector("input[type=checkbox], [role=checkbox]");
    return box && (box.checked || box.getAttribute("aria-checked") === "true");
  }).length);
}
async function bar(page) {
  const signOff = await outsideTable(page.getByRole("button", { name: /sign off/i }));
  if (!signOff) return null;
  const info = await signOff.evaluate((el) => {
    const s = window.__score;
    // The bar: the smallest container holding Sign off, a Remove button, and a number outside any button (the count).
    const countOutsideButtons = (c) => {
      const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/\d/.test(n.nodeValue) && !n.parentElement.closest("button")) return true;
      return false;
    };
    let a = el;
    while (a.parentElement && !([...a.querySelectorAll("button")].some((b) => b !== el && /remove/i.test(s.name(b))) && countOutsideButtons(a))) a = a.parentElement;
    const by = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
    return { text: s.text(a).slice(0, 160), numbers: s.nums(s.text(a)).map((n) => n.value), describedBy: by };
  });
  return { signOff, ...info };
}
async function visibleIds(page) {
  return page.evaluate(() => [...document.querySelectorAll("tr, [role=row]")].map((r) => (r.textContent.match(/LN-\d{6}/) ?? [])[0]).filter(Boolean));
}

await scenario("selection", async () => {
  const page = await newPage();
  const barBefore = await bar(page);
  const ids = await visibleIds(page);
  const ready = ids.filter((id) => READY_IDS.includes(id));
  const parts = [];
  if (ready.length < 3) return record("STATE-selected", "", CANT, `only ${ready.length} Ready loans on screen`);
  // One row.
  await (await rowCheckbox(page, ready[0])).click();
  await page.waitForTimeout(300);
  const one = await bar(page);
  parts.push(["one", (await checkedRows(page)) === 1]);
  const barShows = !barBefore && !!one && one.numbers.includes(1);
  // Sign off unavailable for a Ready loan, with a reason linked to it.
  if (one) {
    const disabled = await one.signOff.isDisabled();
    record("STATE-disabled", "signoff", disabled && one.describedBy ? PASS : FAIL, `Sign off disabled: ${disabled}; described by: "${one.describedBy}"`);
  } else record("STATE-disabled", "signoff", CANT, "no Sign off button after selecting a row");
  // A Shift range.
  const i = ids.indexOf(ready[0]), j = ids.indexOf(ready[2]);
  await (await rowCheckbox(page, ready[2])).click({ modifiers: ["Shift"] });
  await page.waitForTimeout(300);
  const range = await checkedRows(page);
  parts.push(["range", range === Math.abs(j - i) + 1]);
  // The page: the header checkbox.
  const headerBox = page.locator("thead input[type=checkbox], [role=columnheader] input[type=checkbox], [role=columnheader] [role=checkbox], th input[type=checkbox]").first();
  let pageAll = false;
  for (let k = 0; k < 2 && !pageAll && (await headerBox.count()); k++) {
    await headerBox.click();
    await page.waitForTimeout(300);
    pageAll = (await checkedRows(page)) === ids.length;
  }
  parts.push(["page", pageAll]);
  await shot(page, "light-default-selected-page");
  // All 58 matching.
  const now = await bar(page);
  let all = false, allText = "";
  if (now) {
    const link = await firstVisible(page.getByRole("button", { name: /\b58\b/ })) ?? (await firstVisible(page.getByRole("link", { name: /\b58\b/ })));
    if (link) {
      await link.click();
      await page.waitForTimeout(300);
      const after = await bar(page);
      all = !!after && after.numbers.includes(58);
      allText = after?.text ?? "";
    }
  }
  parts.push(["all 58", all]);
  record("STATE-selected", "", parts.every(([, ok]) => ok) ? PASS : FAIL, parts.map(([n, ok]) => `${n}: ${ok}`).join("; ") + (range ? ` (range checked ${range})` : ""));
  record("STATE-bulkbar", "", barShows && all ? PASS : FAIL, `no bar before selecting: ${!barBefore}; count 1 after one: ${!!one && one.numbers.includes(1)}; all matching: "${allText}"`);
  // Remove with all 58 selected: asks first.
  let dialogAll = false;
  if (all) {
    const remove = await outsideTable(page.getByRole("button", { name: /^remove\b(?!.*\b(lender|status|fico|ltv)\b)/i }));
    if (remove) {
      await remove.click();
      await page.waitForTimeout(500);
      dialogAll = (await visible(page.getByRole("dialog").or(page.getByRole("alertdialog"))).count()) > 0;
      await shot(page, "light-default-remove-all");
      await page.keyboard.press("Escape");
    }
  }
  await page.close();
  // Remove the page only: no question.
  const page2 = await newPage();
  const box2 = page2.locator("thead input[type=checkbox], [role=columnheader] input[type=checkbox], [role=columnheader] [role=checkbox], th input[type=checkbox]").first();
  let dialogPage = null;
  if (await box2.count()) {
    await box2.click();
    await page2.waitForTimeout(300);
    const remove = await outsideTable(page2.getByRole("button", { name: /^remove\b(?!.*\b(lender|status|fico|ltv)\b)/i }));
    if (remove) {
      await remove.click();
      await page2.waitForTimeout(700);
      dialogPage = (await visible(page2.getByRole("dialog").or(page2.getByRole("alertdialog"))).count()) > 0;
      await settle(page2);
    }
  }
  record("SCREEN-remove", "", dialogAll && dialogPage === false ? PASS : dialogPage === null && !all ? CANT : FAIL, `all 58: asked ${dialogAll}; the page: asked ${dialogPage}`);
  await page2.close();
});

// ------------------------------------------------------------------ sign-off

await scenario("STATE-signoff", async () => {
  const page = await newPage();
  if (!(await rowLocator(page, "LN-204389").count())) return record("STATE-signoff", "", CANT, "LN-204389 not on the first page");
  await (await rowCheckbox(page, "LN-204389")).click();
  await page.waitForTimeout(300);
  const b = await bar(page);
  if (!b || (await b.signOff.isDisabled())) return record("STATE-signoff", "", FAIL, "Sign off not available with an exception selected");
  await b.signOff.click();
  await page.waitForTimeout(400);
  const dialog = visible(page.getByRole("dialog").or(page.getByRole("alertdialog")));
  const isDialog = (await dialog.count()) > 0;
  const notes = [];
  let escape = null;
  if (isDialog) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    escape = (await dialog.count()) === 0;
    if (!escape) await pressIfThere(page, /cancel/i);
    await b.signOff.click();
    await page.waitForTimeout(400);
  }
  await shot(page, "light-default-signoff");
  const scope = isDialog ? dialog.first() : page;
  const note = await firstVisible(scope.getByRole("textbox"));
  const confirm = isDialog ? await firstVisible(dialog.first().getByRole("button", { name: /sign off/i })) : await outsideTable(page.getByRole("button", { name: /sign off/i }));
  if (!note || !confirm) return record("STATE-signoff", "", CANT, `note field ${!!note}, confirm button ${!!confirm}`);
  // Empty note: not accepted.
  if (await confirm.isEnabled()) await confirm.click();
  await page.waitForTimeout(300);
  const stillOpen = isDialog ? (await dialog.count()) > 0 : (await note.isVisible());
  const statusBefore = await page.evaluate(() => document.body.innerText);
  const requiredOk = stillOpen;
  await note.fill("Scoring note");
  await confirm.click();
  await settle(page);
  const closed = isDialog ? (await dialog.count()) === 0 : true;
  const after = await page.evaluate(() => {
    const s = window.__score;
    const words = ["Ready", "Exception", "Signed off"];
    const region = s.smallest((t) => words.every((w) => t.toLowerCase().includes(w.toLowerCase())) && s.nums(t).length > 0);
    const near = (w) => { const el = region && s.smallest((t) => t.toLowerCase().includes(w.toLowerCase()) && s.nums(t).length > 0, { root: region }); return el ? s.numberNear(s.text(el), w) : null; };
    return { exception: near("Exception"), signed: near("Signed off") };
  });
  const submit = await outsideTable(page.getByRole("button", { name: /submit pool/i }));
  const submitDisabled = submit ? await submit.isDisabled() : null;
  notes.push(`dialog: ${isDialog}`, `Escape closes: ${escape}`, `empty note refused: ${requiredOk}`, `closed after confirming: ${closed}`, `Exception ${after.exception}, Signed off ${after.signed}`, `Submit pool disabled: ${submitDisabled}`);
  const ok = requiredOk && closed && after.exception === 1 && after.signed === 4 && submitDisabled === true && escape !== false;
  record("STATE-signoff", "", ok ? PASS : FAIL, notes.join("; "));
  await shot(page, "light-default-after-signoff");
  await page.close();
});

// ------------------------------------------------------------------ long names

await scenario("EDGE-longnames", async () => {
  const page = await newPage();
  const result = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("tr, [role=row]")];
    const header = rows.find((r) => r.querySelector("th[scope=col], [role=columnheader]"));
    const row = rows.find((r) => /LN-\d{6}/.test(r.textContent) && r !== header);
    if (!row || !header) return null;
    const cellsOf = (r) => [...r.children].filter((c) => /^(TD|TH)$/.test(c.tagName) || /cell|header/.test(c.getAttribute("role") ?? ""));
    const index = cellsOf(header).findIndex((c) => /lender/i.test(c.textContent));
    const cell = cellsOf(row)[index];
    if (!cell) return null;
    let el = cell;
    while (el.children.length === 1 && el.firstElementChild.textContent === el.textContent) el = el.firstElementChild;
    const height = row.getBoundingClientRect().height;
    el.textContent = "Harbor Point Lending Residential Mortgage Company of the Northern Coastal Region";
    const newHeight = row.getBoundingClientRect().height;
    let ellipsis = false;
    for (let a = el; a && a !== row; a = a.parentElement) if (getComputedStyle(a).textOverflow === "ellipsis" && a.scrollWidth > a.clientWidth) ellipsis = true;
    return { height, newHeight, ellipsis };
  });
  if (!result) return record("EDGE-longnames", "", CANT, "no Lender cell");
  record("EDGE-longnames", "", result.ellipsis && Math.abs(result.newHeight - result.height) < 1 ? PASS : FAIL, `ellipsis ${result.ellipsis}; row height ${result.height} → ${result.newHeight}`);
  await shot(page, "light-default-long-name");
  await page.close();
});

// ------------------------------------------------------------------ theme, density, and axe

const AXE_STATES = ["start", "selected", "signoff", "empty"];
async function reachState(page, state) {
  if (state === "selected") {
    const ids = await visibleIds(page);
    const box = ids.length ? await rowCheckbox(page, ids.find((id) => READY_IDS.includes(id)) ?? ids[0]) : null;
    if (!box) return false;
    await box.click();
    await page.waitForTimeout(300);
    return true;
  }
  if (state === "signoff") {
    const box = await rowCheckbox(page, "LN-204389");
    if (!box) return false;
    await box.click();
    await page.waitForTimeout(300);
    const b = await bar(page);
    if (!b || (await b.signOff.isDisabled())) return false;
    await b.signOff.click();
    await page.waitForTimeout(400);
    return true;
  }
  if (state === "empty") {
    const lender = await control(page, "lender");
    const status = await control(page, "status");
    const a = lender && (await choose(page, lender, /pinecrest/i));
    const c = status && (await choose(page, status, /^signed off/i));
    if (a || c) await apply(page);
    await settle(page);
    return !!(a && c);
  }
  return true;
}
async function axe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const r = await window.axe.run(document);
    return r.violations.map((v) => `${v.id}(${v.nodes.length})`);
  });
}
const measures = {};
for (const theme of ["light", "dark"]) {
  const found = [];
  const unreached = [];
  for (const density of ["compact", "default", "comfortable"]) {
    for (const state of AXE_STATES) {
      await scenario(`axe ${theme} ${density} ${state}`, async () => {
        const page = await newPage({ theme, density });
        if (state === "start") {
          measures[`${theme}-${density}`] = await page.evaluate(() => {
            const row = [...document.querySelectorAll("tr, [role=row]")].find((r) => /LN-\d{6}/.test(r.textContent));
            let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
            let bg = "rgba(0, 0, 0, 0)";
            for (; el; el = el.parentElement) { bg = getComputedStyle(el).backgroundColor; if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") break; }
            if (bg === "rgba(0, 0, 0, 0)") bg = getComputedStyle(document.body).backgroundColor;
            return { rowHeight: row ? row.getBoundingClientRect().height : 0, background: bg };
          });
        }
        const reached = await reachState(page, state);
        if (!reached) unreached.push(`${density}/${state}`);
        else {
          const v = await axe(page);
          if (v.length) found.push(`${density}/${state}: ${v.join(", ")}`);
          if (density === "default") await shot(page, `${theme}-default-${state}`);
        }
        await page.close();
      });
    }
  }
  record(theme === "light" ? "RULE-axe-light" : "RULE-axe-dark", "", found.length ? FAIL : PASS,
    (found.length ? found.join("; ") : "no violations") + (unreached.length ? `; not reached: ${unreached.join(", ")}` : ""));
}
const bg = (k) => measures[k]?.background;
record("SCREEN-theme", "", bg("light-default") && bg("dark-default") && bg("light-default") !== bg("dark-default") ? PASS : FAIL, `background Light ${bg("light-default")}, Dark ${bg("dark-default")}`);
const h = (k) => measures[`light-${k}`]?.rowHeight ?? 0;
record("SCREEN-density", "", h("compact") < h("default") && h("default") < h("comfortable") ? PASS : FAIL, `row height compact ${h("compact")}, default ${h("default")}, comfortable ${h("comfortable")}`);

// ------------------------------------------------------------------ no invented loans

const invented = [...seenIds].filter((id) => !DATA_IDS.has(id));
record("DATA-invented", "", invented.length ? FAIL : PASS, invented.length ? `${invented.length} IDs not in the data: ${invented.slice(0, 8).join(", ")}…` : `${seenIds.size} IDs seen, all in the data`);

// ------------------------------------------------------------------ the checks the scorer leaves to people

for (const [check, [, , how]] of Object.entries(CHECKS)) {
  if (results.some((r) => r.check === check)) continue;
  if (how === "auto" || how === "static") record(check, "", CANT, "the scorer stopped before this check (see its log)");
  else record(check, "", how === "note" ? NOTE : MANUAL, how === "audit" ? "see the transcript audit" : "see procedure.md");
}

await browser.close();
stopServer();

// ------------------------------------------------------------------ results

const summary = {
  run: runName,
  folder: runDir,
  scored: new Date().toISOString(),
  scorer: "demo/scoring/score.mjs",
  options: { viteOnly, tamper },
  pageErrors: [...new Set(pageErrors)],
  results,
};
writeFileSync(join(outDir, "results.json"), JSON.stringify(summary, null, 2) + "\n");
const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
const columns = ["run", "check", "part", "result", "headline", "source", "owner", "actual owner", "owner reason", "how", "evidence"];
const field = { "actual owner": "actualOwner", "owner reason": "ownerReason" };
writeFileSync(join(outDir, "results.csv"), [columns.join(","), ...results.map((r) => columns.map((c) => csvCell(r[field[c] ?? c])).join(","))].join("\n") + "\n");
console.log(`\nWrote ${join(outDir, "results.json")} and results.csv (${results.length} rows).`);
