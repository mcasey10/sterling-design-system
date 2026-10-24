// Writes docs/demo/session.json, the record the website's replay page (/demo/) shows, from the Pool loans demo
// session's transcript. Never commit the transcript itself: this keeps only what shows how the session worked,
// and nothing that identifies the machine it ran on.
//
// Kept: the request (its opening, with a link to the whole), each Sterling MCP call in order (tool, arguments,
// the answer shortened by the AI page's rules, its full size, and when), the session's short notes, what its
// other tool calls were for (in its own words, never the command), and the start of its final report. Only the
// session's first turn, up to that report.
// Left out: every path, the user's messages, anything after the report, and the session's reasoning.
// The answers are as the server gave them on the day, from a pre-release build: never regenerated.
//
// Usage: npm run demo:extract -- <transcript.jsonl> --banned <file>
//   <file> lists the maintainer's banned terms, one per line. It lives outside the repository, like the list.
//   A line may give a substitute, "term => substitute": where the session's own words use the term, the extract
//   shows the substitute in square brackets, the usual mark for an edited quotation. Any other banned term in the
//   extract stops it being written. `npm run check:demo-session` checks the extract.
// For a repeat run (docs/demo/runs/), add --out <file> to write somewhere other than docs/demo/session.json, and
// --answers "<label>" to say which server answered (the default label describes the October 14 session).

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shortJson, type Shape } from "./lib/excerpts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const OPTIONS = ["--banned", "--out", "--answers"];
const optionValues = new Set(OPTIONS.filter((o) => args.includes(o)).map((o) => args[args.indexOf(o) + 1]));
const transcript = args.find((a) => !a.startsWith("--") && !optionValues.has(a));
const bannedFile = args[args.indexOf("--banned") + 1];
// A relative --out is relative to where the command was run (npm --prefix ui runs this script from ui/).
const outFile = args.includes("--out") ? resolve(process.env.INIT_CWD ?? process.cwd(), args[args.indexOf("--out") + 1]) : resolve(root, "docs/demo/session.json");
const answersLabel = args.includes("--answers") ? args[args.indexOf("--answers") + 1] : "As the MCP server answered on 2026-10-14, a pre-release build of Sterling 1.2";
if (!transcript || !args.includes("--banned") || !bannedFile) {
  console.error("Usage: npm run demo:extract -- <transcript.jsonl> --banned <file>");
  process.exit(1);
}
const banned = readFileSync(bannedFile, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [term, substitute] = line.split("=>").map((part) => part.trim());
    return { term, substitute };
  });
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The session's own words, with each banned term that has a substitute replaced, in square brackets. */
const edited = (text: string) =>
  banned.reduce(
    (out, { term, substitute }) => (substitute ? out.replace(new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi"), `[${substitute}]`) : out),
    text
  );

type Entry = { type?: string; timestamp?: string; version?: string; message?: { model?: string; content?: unknown } };
const entries: Entry[] = readFileSync(transcript, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

// ---------------------------------------------------------------- what to keep from each answer

/** Each tool's answer, shortened to what shows what the session learned (the AI page's rules, `shortJson`). */
function shapeFor(tool: string, answer: Record<string, unknown>): Shape {
  switch (tool) {
    case "list_components":
      return { count: true, categories: true, components: { $first: 3, $each: { name: true, react: true, description: true } } };
    case "list_guidelines":
      return { sections: { $first: 3, $each: { name: true, summary: true } }, patterns: { $first: 3, $each: { name: true, summary: true } } };
    case "get_pattern":
      return { name: true, summary: true, useWhen: true, steps: { $first: 2 } };
    case "get_guideline":
      return { name: true, summary: true, rules: { $first: 2 } };
    case "get_component":
      return { name: true, description: true, useWhen: true, react: { component: true, import: true } };
    case "get_tokens":
      return "collection" in answer
        ? { collection: true, count: true, tokens: { $first: 3 } }
        : { collections: { $first: 4, $each: { name: true, tokens: true, description: true } } };
    case "search":
      return { query: true, found: true, shown: true, results: { $first: 3, $each: { type: true, name: true, excerpt: true } } };
    default: {
      // Any other tool: its name, or else its first three keys (lists shortened to three items).
      if ("name" in answer) return { name: true };
      return Object.fromEntries(Object.keys(answer).slice(0, 3).map((k) => [k, Array.isArray(answer[k]) ? { $first: 3 } : true]));
    }
  }
}

// ---------------------------------------------------------------- reading the transcript

const PATH = /[A-Za-z]:[\\/]|(?:^|[\s"'(])\/(?:c|Users|home)\/|\\Users\\|AppData|\.claude[\\/]|localhost|127\.0\.0\.1/i;
const time = (entry: Entry) => Date.parse(entry.timestamp ?? "");
const firstUser = entries.find((e) => e.type === "user" && typeof e.message?.content === "string") ?? entries.find((e) => e.type === "user");
const start = time(firstUser!);

const content = (entry: Entry) => (Array.isArray(entry.message?.content) ? (entry.message!.content as Record<string, unknown>[]) : []);
const textOf = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => (x as { text?: string }).text ?? "").join("") : "");

// The request: the user's first message, inside its pasted block.
const requestText = textOf(firstUser!.message?.content).replace(/^[\s\S]*?<pasted_content[^>]*>\s*/, "").replace(/<\/pasted_content[\s\S]*$/, "").trim();
const requestOpening = requestText.split(/\n\s*\n/).slice(0, 2).join("\n\n");

// The first turn ends with the session's long report.
const reportEntry = entries.find((e) => e.type === "assistant" && content(e).some((c) => c.type === "text" && String(c.text).length > 1500));
const end = reportEntry ? time(reportEntry) : Infinity;

const uses = new Map<string, { name: string; input: Record<string, unknown>; at: number }>();
const events: Record<string, unknown>[] = [];
let model = "";
let version = "";
for (const entry of entries) {
  if (time(entry) > end) break;
  version ||= entry.version ?? "";
  if (entry.type === "assistant") model ||= entry.message?.model ?? "";
  for (const c of content(entry)) {
    const at = Math.round((time(entry) - start) / 1000);
    if (entry.type === "assistant" && c.type === "tool_use") {
      uses.set(String(c.id), { name: String(c.name), input: (c.input ?? {}) as Record<string, unknown>, at });
      const name = String(c.name);
      if (name.startsWith("mcp__sterling__")) continue; // recorded with its answer
      const input = (c.input ?? {}) as Record<string, string>;
      const file = String(input.file_path ?? "").split(/[\\/]/).pop() ?? "";
      const what =
        name === "Bash" ? edited(input.description ?? "A shell command")
        : name === "Read" ? (/tool-results/i.test(input.file_path ?? "") ? "An earlier result, saved to a file" : `Read ${file}`)
        : name === "Write" ? `Wrote ${file}`
        : name === "Skill" ? `Loaded the ${input.skill} skill`
        : name === "ToolSearch" ? "Loaded the Sterling tools"
        : name;
      events.push({ at, kind: "tool", tool: name, what });
    }
    if (entry.type === "assistant" && c.type === "text" && entry !== reportEntry) {
      const text = String(c.text).trim();
      if (text && text.length <= 300 && !PATH.test(text)) events.push({ at, kind: "note", text: edited(text) });
    }
    if (c.type === "tool_result") {
      const use = uses.get(String(c.tool_use_id));
      if (!use?.name.startsWith("mcp__sterling__")) continue;
      const tool = use.name.slice("mcp__sterling__".length);
      const raw = textOf(c.content);
      // An answer is JSON, except an error, which is a sentence (e.g. "No token named …"): shown as it is, shortened.
      let answer: Record<string, unknown> | undefined;
      try {
        answer = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        answer = undefined;
      }
      events.push({
        at: use.at,
        kind: "mcp",
        tool,
        arguments: use.input,
        answer: answer ? shortJson(answer, shapeFor(tool, answer), tool) : JSON.stringify(raw.length > 300 ? raw.slice(0, 300) + "…" : raw),
        answerChars: raw.length,
        ok: !c.is_error,
      });
    }
  }
}
events.sort((a, b) => (a.at as number) - (b.at as number));

const reportText = reportEntry ? content(reportEntry).filter((c) => c.type === "text").map((c) => String(c.text)).join("") : "";
const reportOpening = reportText
  .split(/(?<=\.)\s+/)
  .filter((sentence) => !PATH.test(sentence))
  .slice(0, 3)
  .join(" ");

const session = {
  about:
    "The Pool loans demo session, as the website's replay page (/demo/) shows it: the request, each call to Sterling's " +
    "MCP server with its answer shortened, and the session's own notes. Extracted from the session's transcript by " +
    "ui/scripts/demo-extract.ts; checked by npm run check:demo-session. All data in it is fictional.",
  answersLabel,
  session: {
    date: new Date(start).toISOString().slice(0, 10),
    tool: `Claude Code ${version}`,
    model: model.replace(/^claude-/, "").replace(/-(\d+)-(\d+)$/, " $1.$2").replace(/^./, (c) => c.toUpperCase()),
    mode: "auto",
    durationSeconds: Math.round((end - start) / 1000),
  },
  request: { opening: requestOpening, full: "demo/prompt.md" },
  report: edited(reportOpening),
  events,
};

const text = JSON.stringify(session, null, 2) + "\n";
const problems = [
  ...banned.filter(({ term }) => text.toLowerCase().includes(term.toLowerCase())).map(() => "a banned term"),
  ...(PATH.test(text) ? ["a local path or address"] : []),
];
if (problems.length) {
  console.error(`Not written: the extract contains ${[...new Set(problems)].join(" and ")}.`);
  process.exit(1);
}
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, text);
const mcp = events.filter((e) => e.kind === "mcp").length;
console.log(`Wrote ${outFile}: ${mcp} MCP calls, ${events.length - mcp} other events, ${session.session.durationSeconds} s.`);
