#!/usr/bin/env node
// Audits a demo run's transcript (the session's .jsonl) for what deny rules can't stop. Lists, for a person to
// review (it judges nothing by itself):
//   • the session: Claude Code version, model, effort, permission mode, entry point, folder
//   • every MCP call, by server
//   • every file-tool path (Read, Write, Edit, Glob, Grep, NotebookEdit) outside the run folder
//   • every shell command (Bash, PowerShell) that names a path outside the run folder, or reaches the network
//   • reads of the package's built files in node_modules (inside the folder; listed on their own)
//   • web tools, and every tool call that was refused
//
// Usage: node audit-transcript.mjs <transcript.jsonl> <run folder> [--out <file.md>]
// Writes a Markdown report (and the same as JSON beside it).

import { readFileSync, writeFileSync } from "node:fs";

const [transcriptPath, runFolder] = process.argv.slice(2);
const outIndex = process.argv.indexOf("--out");
const out = outIndex > 0 ? process.argv[outIndex + 1] : undefined;
if (!transcriptPath || !runFolder) {
  console.error("Usage: node audit-transcript.mjs <transcript.jsonl> <run folder> [--out <file.md>]");
  process.exit(2);
}

// Paths compared in one form: lower case, forward slashes, drive as c:/.
const norm = (p) => {
  let s = p.replace(/\\/g, "/").replace(/^["'`]|["'`]$/g, "");
  s = s.replace(/^\/([a-z])\//i, "$1:/"); // Git Bash /c/… → c:/…
  return s.toLowerCase().replace(/\/+$/, "");
};
const run = norm(runFolder);
const inside = (p) => norm(p) === run || norm(p).startsWith(run + "/");
const packageInternals = (p) => /\/node_modules\/sterling-ui\//.test(norm(p) + "/");
// Places a run uses legitimately, listed on their own: Claude Code's temporary files for the session, and the
// session's own saved tool outputs (in its configuration folder's projects/).
const ownTemp = (p) => /\/appdata\/local\/temp\/claude\/|^(\$temp|\$env:temp|%temp%|\$tmpdir)/.test(norm(p));
const ownSession = (p) => /\/projects\/[^/]+\/[0-9a-f-]{36}\//.test(norm(p) + "/");

const records = readFileSync(transcriptPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const meta = { versions: new Set(), models: new Set(), effort: new Set(), modes: new Set(), entry: new Set(), cwd: new Set() };
const uses = []; // { id, name, input, n }
const resultsById = new Map();
let n = 0;
for (const r of records) {
  n++;
  if (r.version) meta.versions.add(r.version);
  if (r.message?.model) meta.models.add(r.message.model);
  if (r.effort) meta.effort.add(`${r.effort} (field "effort", line ${n})`);
  if (r.permissionMode) meta.modes.add(r.permissionMode);
  if (r.entrypoint) meta.entry.add(r.entrypoint);
  if (r.cwd) meta.cwd.add(r.cwd);
  const content = Array.isArray(r.message?.content) ? r.message.content : [];
  for (const block of content) {
    if (block.type === "tool_use") uses.push({ id: block.id, name: block.name, input: block.input ?? {}, line: n });
    if (block.type === "tool_result") {
      const text = Array.isArray(block.content) ? block.content.map((c) => c.text ?? "").join(" ") : String(block.content ?? "");
      resultsById.set(block.tool_use_id, { error: !!block.is_error, text: text.slice(0, 300) });
    }
  }
}
// Keep one entry per effort value (the first line it appears on).
const effortByValue = new Map();
for (const e of meta.effort) {
  const value = e.split(" ")[0];
  if (!effortByValue.has(value)) effortByValue.set(value, e);
}

const mcp = new Map();
const fileOutside = [];
const fileInternals = [];
const shellFlags = [];
const shellInternals = [];
const web = [];
const refused = [];
const allShell = [];

// A path in a command: a drive path (not the "e:/" inside "file:///"), a Git Bash /c/ path, a home or environment
// folder, or ".." as a path step.
const PATH_IN_COMMAND = /(?:(?<![\w/])[A-Za-z]:[\\/][^\s"'`|;,)<>]*|(?<![\w.:/])\/[a-z]\/[^\s"'`|;,)<>]+|(?<![\w])~[\\/][^\s"'`|;,)<>]*|\$HOME[^\s"'`|;,)<>]*|\$TEMP[^\s"'`|;,)<>]*|\$TMPDIR[^\s"'`|;,)<>]*|\$env:\w+[^\s"'`|;,)<>]*|%\w+%[^\s"'`|;,)<>]*|(?<![\w.])\.\.(?=[\\/]|["'\s]|$)[^\s"'`|;,)<>]*)/g;
const NETWORK = /\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm|Start-BitsTransfer|git\s+(clone|fetch|pull|ls-remote)|npm\s+(install|i|add|view|info|search|update|outdated)\b|npx\s+(?!tsc\b|vite\b|tsx\b)[\w@]|pnpm|yarn\s+add|pip\s+install|https?:\/\/(?!localhost|127\.0\.0\.1|\[::1\]))/i;
const LOCAL_URL = /https?:\/\/(localhost|127\.0\.0\.1|\[::1\])\b/i;
const ownFiles = [];
const localServer = [];

for (const use of uses) {
  const result = resultsById.get(use.id);
  if (result?.error && /denied|not allowed|permission|blocked|refus/i.test(result.text)) refused.push(`line ${use.line}: ${use.name} ${JSON.stringify(use.input).slice(0, 200)} — ${result.text.slice(0, 160)}`);
  if (use.name.startsWith("mcp__")) {
    const [, server, tool] = use.name.split("__");
    if (!mcp.has(server)) mcp.set(server, []);
    mcp.get(server).push(`${tool} ${JSON.stringify(use.input).slice(0, 80)}`);
    continue;
  }
  if (/^(WebFetch|WebSearch)$/.test(use.name)) {
    web.push(`line ${use.line}: ${use.name} ${JSON.stringify(use.input).slice(0, 160)}`);
    continue;
  }
  if (/^(Read|Write|Edit|MultiEdit|NotebookEdit|Glob|Grep|LS)$/.test(use.name)) {
    const paths = [use.input.file_path, use.input.notebook_path, use.input.path].filter(Boolean);
    if (use.name === "Glob" && /^[A-Za-z]:|^\//.test(use.input.pattern ?? "")) paths.push(use.input.pattern);
    if ((use.name === "Glob" || use.name === "Grep") && !use.input.path) paths.push(runFolder); // defaults to the folder
    for (const p of paths) {
      const where = `line ${use.line}: ${use.name} ${p}`;
      if (ownTemp(p) || ownSession(p)) ownFiles.push(where);
      else if (!inside(p)) fileOutside.push(where);
      else if (packageInternals(p)) fileInternals.push(where);
    }
    continue;
  }
  if (/^(Bash|PowerShell)$/.test(use.name)) {
    const command = String(use.input.command ?? "");
    allShell.push(`line ${use.line}: ${command.replace(/\s+/g, " ").slice(0, 200)}`);
    const reasons = [];
    let own = false;
    for (const m of command.matchAll(PATH_IN_COMMAND)) {
      const p = m[0];
      if (ownTemp(p) || ownSession(p)) own = true;
      else if (p.startsWith("..")) reasons.push(`goes up from the folder (${p})`);
      else if (/^(~|\$HOME|\$env:|%)/i.test(p)) reasons.push(`names a home or environment folder (${p})`);
      else if (!inside(p)) reasons.push(`outside the folder (${p})`);
    }
    const remote = command.replace(new RegExp(LOCAL_URL.source + "[^\\s\"'`]*", "gi"), "");
    if (NETWORK.test(remote) && !(/^\s*(curl|wget|iwr|irm|Invoke-\w+)\b/i.test(remote.match(NETWORK)[0]) && LOCAL_URL.test(command) && !/https?:\/\//i.test(remote))) reasons.push(`network: ${remote.match(NETWORK)[0]}`);
    else if (LOCAL_URL.test(command)) localServer.push(`line ${use.line}: ${command.replace(/\s+/g, " ").slice(0, 160)}`);
    if (own) ownFiles.push(`line ${use.line}: ${command.replace(/\s+/g, " ").slice(0, 160)}`);
    if (/node_modules[\\/]sterling-ui/i.test(command)) shellInternals.push(`line ${use.line}: ${command.replace(/\s+/g, " ").slice(0, 200)}`);
    if (reasons.length) shellFlags.push(`line ${use.line}: ${command.replace(/\s+/g, " ").slice(0, 200)}\n    → ${[...new Set(reasons)].join("; ")}`);
  }
}

const list = (items) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- none");
const report = `# Transcript audit

Transcript: \`${transcriptPath.split(/[\\/]/).pop()}\` · ${records.length} records · ${uses.length} tool calls · run folder \`${runFolder}\`

## The session

- Claude Code: ${[...meta.versions].join(", ") || "not recorded"}
- Model: ${[...meta.models].join(", ") || "not recorded"}
- Effort: ${[...effortByValue.values()].join("; ") || "not recorded"}
- Permission mode: ${[...meta.modes].join(", ") || "not recorded"}
- Started from: ${[...meta.entry].join(", ") || "not recorded"}
- Folder: ${[...meta.cwd].join(", ") || "not recorded"}

## MCP calls, by server

${mcp.size ? [...mcp].map(([server, calls]) => `- **${server}**: ${calls.length} calls`).join("\n") : "- none"}

## File tools outside the run folder

${list(fileOutside)}

## Shell commands to review (paths outside the folder, or the network)

${list(shellFlags)}

## The session's own files (Claude Code's temporary folder, saved tool outputs)

${list(ownFiles)}

## Calls to a local server (localhost)

${list(localServer)}

## Reads of the package's built files (inside the folder)

${list([...fileInternals, ...shellInternals])}

## Web tools

${list(web)}

## Refused tool calls

${list(refused)}

## Every shell command

${list(allShell)}
`;
if (out) {
  writeFileSync(out, report);
  writeFileSync(out.replace(/\.md$/, "") + ".json", JSON.stringify({ meta: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, [...v]])), mcp: Object.fromEntries(mcp), fileOutside, ownFiles, localServer, shellFlags, packageInternals: [...fileInternals, ...shellInternals], web, refused, shell: allShell }, null, 2) + "\n");
  console.log(`Wrote ${out}: ${fileOutside.length} file-tool paths outside, ${shellFlags.length} shell commands to review, ${[...mcp.values()].flat().length} MCP calls.`);
} else console.log(report);
