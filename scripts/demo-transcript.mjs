#!/usr/bin/env node
// Reads a Claude Code session transcript (the .jsonl file of the demo session) and prints the record the case
// study needs: the prompt, every Sterling MCP tool call with its arguments and outcome, every other tool call,
// and an isolation audit (files touched outside the session's folder, web and Figma calls, shell commands that
// reach the network, and calls the settings denied). The transcript's path is an argument, never stored here.
//
// Usage: node scripts/demo-transcript.mjs <transcript.jsonl> [--json]

import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/demo-transcript.mjs <transcript.jsonl> [--json]");
  process.exit(1);
}
const entries = readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

const posix = (p) => String(p ?? "").replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`).toLowerCase();
const cwd = entries.find((e) => e.cwd)?.cwd ?? "";
// The session's own working folders are its, not someone else's: the folder of large tool results beside the
// transcript (named after the session), and its scratchpad.
const sessionId = (entries.find((e) => e.sessionId)?.sessionId ?? "-").toLowerCase();
const scratchpad = entries.find((e) => e.attachment?.type === "environment")?.attachment.snapshot.scratchpadDirectory ?? "-";
const own = (p) => posix(p).includes(sessionId);
const inside = (p) => {
  const path = posix(p);
  return !path || !path.startsWith("/") || path.startsWith(posix(cwd)) || own(p);
};

const calls = new Map();
const order = [];
let prompt = "";
let final = "";
for (const entry of entries) {
  const content = entry.message?.content;
  if (entry.type === "user" && !prompt) {
    const text = typeof content === "string" ? content : (content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    if (text.trim() && !text.startsWith("<")) prompt = text.trim();
  }
  if (!Array.isArray(content)) continue;
  for (const part of content) {
    if (entry.type === "assistant" && part.type === "tool_use") {
      const call = { id: part.id, name: part.name, input: part.input, time: entry.timestamp };
      calls.set(part.id, call);
      order.push(call);
    }
    if (entry.type === "assistant" && part.type === "text" && part.text.trim()) final = part.text.trim();
    if (entry.type === "user" && part.type === "tool_result") {
      const call = calls.get(part.tool_use_id);
      if (!call) continue;
      const text = typeof part.content === "string" ? part.content : (part.content ?? []).map((c) => c.text ?? "").join("\n");
      call.error = Boolean(part.is_error);
      call.result = text;
    }
  }
}

const sterling = order.filter((c) => c.name.startsWith("mcp__sterling__"));
const otherMcp = order.filter((c) => c.name.startsWith("mcp__") && !c.name.startsWith("mcp__sterling__"));
const count = (list) => Object.entries(list.reduce((m, c) => ({ ...m, [c.name]: (m[c.name] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
const pathOf = (c) => c.input?.file_path ?? c.input?.path ?? c.input?.notebook_path ?? null;
const outsidePaths = order.filter((c) => pathOf(c) && !inside(pathOf(c))).map((c) => `${c.name} ${pathOf(c)}`);
const bash = order.filter((c) => c.name === "Bash" || c.name === "PowerShell").map((c) => c.input?.command ?? "");
const networkWords = /\b(curl|wget|Invoke-WebRequest|iwr|Invoke-RestMethod|irm|npm (i|install|add)|git (clone|fetch|pull)|ssh|scp)\b/i;
// Folders a shell command names: absolute paths and $HOME / $TEMP paths, other than the session's own.
// Not inside a URL ("file:///…", "http://localhost:5199/…").
const folders = (cmd) => [...cmd.matchAll(/(?<![\w:/.])(?:[A-Za-z]:[\\/]|\/[a-z]\/|~\/|\$HOME|\$TEMP)[^\s"'|;&)]*/gi)].map((m) => m[0]);
/** The addresses a command names, with the local ones marked: a dev server on this machine isn't the network. */
const addresses = (cmd) => [...cmd.matchAll(/https?:\/\/[^\s"'|;&)]+/gi)].map((m) => m[0]);
const localOnly = (cmd) => addresses(cmd).length > 0 && addresses(cmd).every((url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(url));
const outsideInShell = bash.flatMap((cmd) => {
  const outside = folders(cmd).filter((p) => !inside(p));
  return outside.length ? [`${outside.join(", ")} in: ${cmd.replace(/\s+/g, " ").slice(0, 120)}`] : [];
});
const denied = order.filter((c) => c.error && /denied|not allowed|permission/i.test(c.result ?? ""));

const record = {
  folder: cwd,
  started: entries.find((e) => e.timestamp)?.timestamp,
  ended: [...entries].reverse().find((e) => e.timestamp)?.timestamp,
  prompt,
  toolCalls: count(order),
  sterlingCalls: sterling.map((c) => ({
    tool: c.name.replace("mcp__sterling__", ""),
    arguments: c.input,
    outcome: c.error ? `error: ${(c.result ?? "").slice(0, 160)}` : "ok",
  })),
  audit: {
    otherMcpCalls: otherMcp.map((c) => c.name),
    webCalls: order.filter((c) => /^Web(Fetch|Search)$/.test(c.name)).map((c) => `${c.name} ${JSON.stringify(c.input)}`),
    filesOutsideFolder: outsidePaths,
    sessionOwnFilesOutsideFolder: order.filter((c) => pathOf(c) && own(pathOf(c))).map((c) => `${c.name} ${pathOf(c)}`),
    shellCommandsNamingOtherFolders: outsideInShell,
    shellCommandsThatCanUseTheNetwork: bash
      .filter((cmd) => networkWords.test(cmd))
      .map((cmd) => `${cmd.match(networkWords)[0]}${localOnly(cmd) ? " (this machine only: " + addresses(cmd).join(", ") + ")" : ""} in: ${cmd.replace(/\s+/g, " ").slice(0, 120)}`),
    deniedCalls: denied.map((c) => `${c.name} ${JSON.stringify(c.input).slice(0, 160)}`),
  },
  filesWritten: [...new Set(order.filter((c) => ["Write", "Edit", "MultiEdit"].includes(c.name)).map(pathOf))],
  shellCommands: bash,
  finalMessage: final,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(record, null, 2));
} else {
  console.log(`Folder: ${record.folder}\nFrom ${record.started} to ${record.ended}\n`);
  console.log("Tool calls:", record.toolCalls.map(([n, k]) => `${n} ${k}`).join(", "), "\n");
  console.log(`Sterling MCP calls (${sterling.length}):`);
  record.sterlingCalls.forEach((c, i) => console.log(`  ${i + 1}. ${c.tool}(${JSON.stringify(c.arguments)}) → ${c.outcome}`));
  console.log("\nIsolation audit:");
  for (const [key, list] of Object.entries(record.audit)) console.log(`  ${key}: ${list.length ? "\n    " + list.join("\n    ") : "none"}`);
  console.log(`\nFiles written: ${record.filesWritten.join(", ")}`);
  console.log(`\nShell commands (${bash.length}):\n  ${bash.map((b) => b.replace(/\s+/g, " ").slice(0, 160)).join("\n  ")}`);
  console.log(`\nFinal message:\n${record.finalMessage}`);
}
