// Writes the parts of Sterling's documentation that come from data, so each is written once:
//   README.md                 the Start here table, from AUDIENCES in definitions/audiences.ts (the website's matrix),
//                             the component and icon counts ("24 components and 20 icons"), from definitions/, and
//                             the contrast pair count ("124 pairs, each in Light and Dark"), from tokens.json
//   mcp/README.md             the setup block, from definitions/setup.ts (the website's #set-up), and the icon count
//   docs/reference.md         the icon count ("Sterling's `Icon/*` set has 20 icons")
//   docs/figma-community.md   the version (package.json); the counts of contrast pairs (tokens.json contrast.rules, per
//                             color mode), guideline sections, patterns, components, and icons; and the website, install,
//                             MCP setup, demo page, and repository addresses (definitions/site.ts)
// Each generated block sits between marker comments (`<!-- generated: name … -->` and `<!-- /generated: name -->`);
// everything outside them is written by hand. Counts and the Community text's version line, inside sentences, are
// found by their wording instead.
//
// Usage: npm run docs:sync          write them
//        npm run check:docs-sync    fail if any is out of date (in CI)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIENCES, HOW, NO_SETUP, type How, type Place } from "../../definitions/audiences";
import { COMPONENTS } from "../../definitions/components";
import { ICONS } from "../../definitions/icons";
import { mcpServer, type SetupBlock } from "../../definitions/setup";
import { GUIDELINES, PATTERNS } from "../../definitions/guidelines";
import { DEMO_PAGE_URL, INSTALL_PACKAGE_URL, MCP_SETUP_URL, REPOSITORY_URL, WEBSITE_URL } from "../../definitions/site";
import { evaluateContrast, loadTokens } from "../../scripts/lib/tokens.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const VERSION = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version as string;
const check = process.argv.includes("--check");

// ---------------------------------------------------------------- Markdown from the data

const cell = (text: string) => text.replace(/\|/g, "\\|");

/** The Start here table, as on the website: who you are and why, and where to go, each with how you get it. */
function startHere(): string {
  const place = (p: Place) =>
    `${p.or ? "Or " : ""}${p.links.map((l) => `[${l.label}](${l.url})`).join(" and ")} · *${p.how}*<br>${cell(p.note)}`;
  const rows = AUDIENCES.map((a) => `| **${a.role}**<br>${cell(a.why)} | ${a.places.map(place).join("<br><br>")} |`);
  const key = (hows: How[]) => hows.map((h) => `*${h}*: ${HOW[h]}`).join(" ");
  const all = Object.keys(HOW) as How[];
  return [
    "| Who you are | Where to go |",
    "|---|---|",
    ...rows,
    "",
    `**Nothing to set up.** ${key(all.filter((h) => NO_SETUP.includes(h)))}`,
    "",
    `**Setup needed, once.** ${key(all.filter((h) => !NO_SETUP.includes(h)))}`,
    "",
    `**Set up:** [Install sterling-ui](${INSTALL_PACKAGE_URL}) to add the components to a React project · ` +
      `[Set up the MCP server](${MCP_SETUP_URL}) to connect Sterling to your AI tool.`,
  ].join("\n");
}

/** A setup block, with the same headings in the same order as on the website. */
function setupMarkdown(block: SetupBlock, level: number): string {
  const h = "#".repeat(level);
  const fence = (command: string) => `\`\`\`${command.trimStart().startsWith("{") ? "json" : command.startsWith("import ") ? "tsx" : "bash"}\n${command}\n\`\`\``;
  const out: string[] = [];
  if (block.intro) out.push(block.intro, "");
  out.push(`${h} Where`, "", block.where, "", `${h} You need`, "");
  for (const n of block.need)
    out.push(n.check ? `- **${n.what}.** Check: \`${n.check}\` shows ${n.expect}. If not, ${n.get}` : `- **${n.what}.** ${n.get}`);
  out.push("", `${h} Do`, "");
  // Each step is a numbered item; its later parts are indented under the number, so they stay inside it.
  const indent = (text: string) => text.split("\n").map((line) => (line ? `   ${line}` : line)).join("\n");
  block.steps.forEach((step, i) => {
    const parts: string[] = [];
    for (const part of step) {
      if (part.choices) for (const c of part.choices) parts.push(`**${c.title}.** ${c.text}`, fence(c.command));
      else if (part.prompt) parts.push(`> ${part.prompt}`);
      else if (part.command) parts.push(fence(part.command));
      else parts.push(part.text ?? "");
    }
    const [first, ...rest] = parts;
    out.push(`${i + 1}. ${first}`, "", ...rest.flatMap((p) => [indent(p), ""]));
  });
  if (block.scope) out.push(`${h} Scope`, "", block.scope, "");
  out.push(`${h} It worked if`, "", ...block.worked.flatMap((w) => [w, ""]), ...block.next.flatMap((n) => [n, ""]));
  out.push(`${h} If it didn't`, "", ...block.failed.map((f) => `- ${f}`));
  return out.join("\n");
}

// ---------------------------------------------------------------- writing

const problems: string[] = [];
const written: string[] = [];

function update(file: string, change: (text: string) => string) {
  const path = resolve(root, file);
  const before = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const after = change(before);
  if (after === before) return;
  if (check) problems.push(`${file} is out of date`);
  else {
    writeFileSync(path, after);
    written.push(file);
  }
}

/** Replaces what's between a part's markers. */
function between(text: string, file: string, name: string, content: string): string {
  const start = new RegExp(`(<!-- generated: ${name}\\b[^\\n]*-->\\n)[\\s\\S]*?(<!-- /generated: ${name} -->)`);
  if (!start.test(text)) {
    problems.push(`${file}: no "${name}" markers`);
    return text;
  }
  return text.replace(start, (_, open, close) => `${open}${content}\n${close}`);
}

/** Replaces the one line matching `pattern`. */
function oneLine(text: string, file: string, pattern: RegExp, line: string): string {
  const found = text.split("\n").filter((l) => pattern.test(l)).length;
  if (found !== 1) {
    problems.push(`${file}: ${pattern} matches ${found} lines, not 1`);
    return text;
  }
  return text.split("\n").map((l) => (pattern.test(l) ? line : l)).join("\n");
}

const COMPONENT_COUNT = Object.keys(COMPONENTS).length;
const ICON_COUNT = Object.keys(ICONS).length;
const TOKENS = loadTokens();
/** Text and background pairs, each checked in every color mode (npm run contrast reports pairs × modes). */
const CONTRAST_PAIRS = evaluateContrast(TOKENS).length / TOKENS.color.$modes.length;

/** Every count matching `pattern` (with its numbers as \d+), set to `wording`; there must be at least `least`. */
function counts(text: string, file: string, pattern: RegExp, wording: string, least: number): string {
  const found = text.match(pattern)?.length ?? 0;
  if (found < least) problems.push(`${file}: ${found} of ${pattern}, expected at least ${least}`);
  return text.replace(pattern, wording);
}

update("README.md", (text) =>
  counts(
    counts(between(text, "README.md", "start-here", startHere()), "README.md", /\b\d+ components and \d+ icons\b/g, `${COMPONENT_COUNT} components and ${ICON_COUNT} icons`, 2),
    "README.md",
    /\b\d+ pairs, each in Light and Dark/g,
    `${CONTRAST_PAIRS} pairs, each in Light and Dark`,
    1
  )
);
update("mcp/README.md", (text) =>
  counts(between(text, "mcp/README.md", "setup", setupMarkdown(mcpServer(VERSION), 3)), "mcp/README.md", /The \d+ icons share one entry/g, `The ${ICON_COUNT} icons share one entry`, 1)
);
update("docs/reference.md", (text) =>
  counts(text, "docs/reference.md", /`Icon\/\*` set has \d+ icons/g, `\`Icon/*\` set has ${ICON_COUNT} icons`, 1)
);
update("docs/figma-community.md", (text) => {
  const file = "docs/figma-community.md";
  let out = oneLine(text, file, /^Sterling Design System \d+\.\d+\.\d+$/, `Sterling Design System ${VERSION}`);
  const each: [RegExp, string][] = [
    [/Contrast for \d+ text and background pairs/g, `Contrast for ${CONTRAST_PAIRS} text and background pairs`],
    [/\d+ guideline sections and \d+ patterns/g, `${GUIDELINES.length} guideline sections and ${PATTERNS.length} patterns`],
    [/What's inside: \d+ components and \d+ icons\b/g, `What's inside: ${COMPONENT_COUNT} components and ${ICON_COUNT} icons`],
    [/build a screen with it: \S+/g, `build a screen with it: ${DEMO_PAGE_URL}`],
    [/into a React project: \S+/g, `into a React project: ${INSTALL_PACKAGE_URL}`],
    [/to your AI coding tool: \S+/g, `to your AI coding tool: ${MCP_SETUP_URL}`],
    [/for each kind of reader, starts here: \S+/g, `for each kind of reader, starts here: ${WEBSITE_URL}`],
    [/Sterling's own values are reset on the next rebuild\. See \S+/g, `Sterling's own values are reset on the next rebuild. See ${REPOSITORY_URL}`],
  ];
  for (const [pattern, wording] of each) out = counts(out, file, pattern, wording, 1);
  return out;
});

for (const problem of problems) console.error(`  ✗ ${problem}`);
if (check) console.log(`README.md, mcp/README.md, docs/reference.md, docs/figma-community.md checked against their sources — ${problems.length} problem(s).${problems.length ? " Run npm run docs:sync." : ""}`);
else console.log(written.length ? `Wrote ${written.join(", ")}.` : "Nothing to change.");
process.exit(problems.length ? 1 : 0);
