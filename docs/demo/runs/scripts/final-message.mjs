// Prints a run session's final four-item list: the last message from Claude in the transcript whose text has the
// numbered items 1 to 4 (components, MCP tools, gaps, guesses). Used by 16-public.ps1 to write report.md.
// Usage: node final-message.mjs <transcript.jsonl>
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node final-message.mjs <transcript.jsonl>");
  process.exit(2);
}
const texts = [];
for (const line of readFileSync(file, "utf8").trim().split("\n")) {
  const record = JSON.parse(line);
  if (record.type !== "assistant" || !Array.isArray(record.message?.content)) continue;
  const text = record.message.content.filter((c) => c.type === "text").map((c) => c.text).join("");
  if (text.trim()) texts.push(text);
}
// Each item starts a line, possibly after Markdown bold or a heading mark: "1. ", "**1. ", "### 1. ".
const list = /(?:^|\n)\s*[#*_]*\s*1\.\s[\s\S]*\n\s*[#*_]*\s*2\.\s[\s\S]*\n\s*[#*_]*\s*3\.\s[\s\S]*\n\s*[#*_]*\s*4\.\s/;
const final = texts.reverse().find((t) => list.test(t));
if (!final) {
  console.error("No message with the four-item list found in the transcript.");
  process.exit(1);
}
process.stdout.write(final.trim() + "\n");
