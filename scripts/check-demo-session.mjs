// Demo-session check: docs/demo/session.json, the record the website's replay page shows, holds nothing that
// identifies the machine the session ran on, and has the shape the page expects. Fails on:
//   • a local path, a user folder, a local server address, or an email address;
//   • a web address that isn't one of Sterling's (the addresses in ai/index.json's links);
//   • an event that isn't a note, a tool call, or an MCP call with its tool, arguments, and answer.
// Banned terms are kept out by the extractor (ui/scripts/demo-extract.ts), which reads them from outside the
// repository, and by the grep before every commit.
//
// Usage: npm run check:demo-session

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const text = readFileSync(resolve(root, "docs/demo/session.json"), "utf8");
const session = JSON.parse(text);
const links = Object.values(JSON.parse(readFileSync(resolve(root, "ai/index.json"), "utf8")).links);
const problems = [];

const LOCAL = [
  [/[A-Za-z]:[\\/]/, "a Windows path"],
  [/(?:^|[\s"'(`])\/(?:c|Users|home|tmp|var)\//, "a local path"],
  [/\\Users\\|AppData|\.claude[\\/]/, "a user folder"],
  [/localhost|127\.0\.0\.1|\[::1\]/, "a local server address"],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, "an email address"],
];
for (const [pattern, what] of LOCAL) if (pattern.test(text)) problems.push(`has ${what}: ${text.match(pattern)[0]}`);
for (const [url] of text.matchAll(/https?:\/\/[^\s"'`)\\]+/g)) {
  if (!links.some((link) => url.startsWith(String(link).replace(/\/$/, "")))) problems.push(`links ${url}, which isn't one of Sterling's addresses`);
}

for (const key of ["about", "answersLabel", "session", "request", "report", "events"]) if (!(key in session)) problems.push(`has no "${key}"`);
let mcp = 0;
for (const [index, event] of (session.events ?? []).entries()) {
  const where = `event ${index + 1}`;
  if (typeof event.at !== "number") problems.push(`${where} has no time`);
  if (event.kind === "mcp") {
    mcp++;
    if (!event.tool || !event.arguments || typeof event.answer !== "string") problems.push(`${where}: an MCP call needs its tool, arguments, and answer`);
  } else if (event.kind === "note") {
    if (!event.text) problems.push(`${where}: a note needs its text`);
  } else if (event.kind === "tool") {
    if (!event.tool || !event.what) problems.push(`${where}: a tool call needs its tool and what it was for`);
  } else problems.push(`${where}: unknown kind "${event.kind}"`);
}

for (const problem of problems) console.error(`  ✗ docs/demo/session.json ${problem}`);
console.log(`docs/demo/session.json: ${session.events?.length ?? 0} events (${mcp} MCP calls) checked — ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
