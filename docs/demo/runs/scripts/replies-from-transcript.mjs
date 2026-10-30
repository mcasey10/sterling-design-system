// Writes a run's replies.txt from its transcript, for when Michael didn't write one (deviation 26): every message he
// sent after the request (the fixed replies), with its time, or "none". Claude Code's own messages (slash commands and
// their output, task notifications) aren't replies. Answers given in a permission menu aren't messages, so they can't
// be read from the transcript; the file says so.
// Usage: node replies-from-transcript.mjs <transcript.jsonl> <replies.txt>
import { readFileSync, writeFileSync } from "node:fs";

const [transcript, outFile] = process.argv.slice(2);
if (!transcript || !outFile) {
  console.error("Usage: node replies-from-transcript.mjs <transcript.jsonl> <replies.txt>");
  process.exit(2);
}
const records = readFileSync(transcript, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const typed = [];
for (const r of records) {
  if (r.type !== "user" || r.isMeta) continue;
  const c = r.message?.content;
  const text = typeof c === "string" ? c : Array.isArray(c) ? c.filter((x) => x.type === "text").map((x) => x.text).join(" ") : "";
  if (!text.trim()) continue; // tool results
  if (/^\s*<(command-name|command-message|local-command-stdout|local-command-stderr|task-notification|system-reminder)/.test(text)) continue;
  typed.push({ at: r.timestamp ?? "", text: text.replace(/\s+/g, " ").trim() });
}
const [request, ...replies] = typed;
const lines = replies.length
  ? replies.map((m) => `${m.at}  ${m.text.slice(0, 300)}`)
  : ["none"];
const note = `\n(Written from the transcript by 9-12-after.ps1, because replies.txt was missing: ${replies.length} message(s) sent after the request at ${request?.at ?? "?"}. Answers given in a permission menu aren't in the transcript as messages, and aren't listed.)\n`;
writeFileSync(outFile, lines.join("\n") + "\n" + note);
console.log(`replies.txt written from the transcript: ${replies.length ? replies.length + " message(s)" : "none"}.`);
