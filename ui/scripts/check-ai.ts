// Checks the machine-readable export in ai/. Exits 1 if:
//   • a committed file differs from what the sources give now (run `npm run export:ai` and commit the result);
//   • a published component has no entry, or its entry is incomplete (description, use / don't use, at least
//     one related link, a React component its source file exports, a Storybook Docs page). The single Icon
//     entry covers the 20 icons, and must list every one;
//   • a related link points to a section, pattern, or component the export doesn't contain.
//   • llms.txt, as the site build would write it from ai/index.json, doesn't link every file in ai/, links a
//     repository document that doesn't exist, has a relative link, lacks its title and summary, or doesn't
//     name every tool of the MCP server (mcp/src/tool-names.ts).
// The Storybook Docs pages are checked against storybook-static/index.json when that build exists.
//
// Usage: npm run check:ai   (run `npm run build-storybook` first to include the Docs page check)

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPONENTS } from "../../definitions/components";
import { storybookDocsId } from "../../definitions/docRegistry";
import { REPOSITORY_URL } from "../../definitions/docRegistry";
import { ICONS } from "../../definitions/icons";
import { llmsLinks, renderLlmsTxt } from "../../scripts/lib/llms.mjs";
import { TOOL_NAMES } from "../../mcp/src/tool-names";
import { FILES, buildExport } from "./lib/ai-export";

const ui = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(ui, "../ai");
const problems: string[] = [];

// 1. The committed files are what the sources give.
const fresh = buildExport();
let matching = 0;
for (const file of FILES) {
  const path = join(dir, file);
  if (!existsSync(path)) problems.push(`ai/${file} is missing: run npm run export:ai`);
  else if (readFileSync(path, "utf8") !== fresh[file]) problems.push(`ai/${file} is out of date: run npm run export:ai and commit the result`);
  else matching++;
}

// 2. Every published component has a complete entry.
const data = JSON.parse(fresh["components.json"]);
const guidelines = JSON.parse(fresh["guidelines.json"]);
const targets = {
  guideline: new Set<string>(guidelines.sections.map((s: { id: string }) => s.id)),
  pattern: new Set<string>(guidelines.patterns.map((p: { id: string }) => p.id)),
  component: new Set<string>(data.components.map((c: { id: string }) => c.id)),
};
const indexPath = join(ui, "storybook-static", "index.json");
const docsPages = existsSync(indexPath)
  ? new Set(Object.values(JSON.parse(readFileSync(indexPath, "utf8")).entries as Record<string, { id: string; type: string }>).filter((e) => e.type === "docs").map((e) => e.id))
  : null;

const byName = new Map<string, any>(data.components.map((c: { name: string }) => [c.name, c]));
const entryProblems = (label: string, entry: any, docsName: string) => {
  for (const field of ["description", "details", "useWhen", "dontUseWhen", "storybook"]) {
    if (!String(entry[field] ?? "").trim()) problems.push(`${label}: no ${field}`);
  }
  if (!entry.related?.length) problems.push(`${label}: no related guideline or pattern`);
  for (const link of entry.related ?? []) {
    if (link.type === "link") continue;
    if (!targets[link.type as keyof typeof targets]?.has(link.id)) problems.push(`${label}: related ${link.type} "${link.name}" isn't in the export`);
  }
  const source = resolve(ui, "..", entry.react?.source ?? "");
  if (!entry.react?.component || !existsSync(source)) problems.push(`${label}: no React component or source file`);
  else if (!new RegExp(`export (function|const) ${entry.react.component}\\b`).test(readFileSync(source, "utf8"))) {
    problems.push(`${label}: ${entry.react.source} doesn't export ${entry.react.component}`);
  }
  if (docsPages && !docsPages.has(storybookDocsId(docsName))) problems.push(`${label}: no Storybook Docs page "${storybookDocsId(docsName)}"`);
};
for (const name of Object.keys(COMPONENTS)) {
  const entry = byName.get(name);
  if (!entry) problems.push(`${name}: no entry in ai/components.json`);
  else entryProblems(name, entry, name);
}
entryProblems("Icon/*", data.icons, "Icon/plus");
const listed = new Set<string>(data.icons.names);
for (const icon of Object.keys(ICONS)) if (!listed.has(`Icon/${icon}`)) problems.push(`Icon/${icon}: not listed in the Icon entry`);

// 3. llms.txt, rendered from the index exactly as the site build does.
const index = JSON.parse(fresh["index.json"]);
const llms = renderLlmsTxt(index);
const links = llmsLinks(llms);
const [title, , summary] = llms.split("\n");
if (title !== `# ${index.name}` || !summary.startsWith("> ")) problems.push("llms.txt: must start with the name as a heading, then the summary as a quote");
for (const file of FILES) {
  if (!links.some((link) => link.url === `${index.links.export}${file}`)) problems.push(`llms.txt: no link to ai/${file}`);
}
for (const tool of TOOL_NAMES) if (!llms.includes(tool)) problems.push(`llms.txt: doesn't name the MCP server's ${tool} tool`);
const raw = `${REPOSITORY_URL.replace("https://github.com/", "https://raw.githubusercontent.com/")}/main/`;
for (const link of links) {
  if (!/^https:\/\//.test(link.url)) problems.push(`llms.txt: "${link.title}" isn't an absolute https link`);
  else if (link.url.startsWith(raw) && !existsSync(resolve(ui, "..", link.url.slice(raw.length)))) {
    problems.push(`llms.txt: "${link.title}" links ${link.url.slice(raw.length)}, which isn't in the repository`);
  }
}

for (const problem of problems) console.error(`  ✗ ${problem}`);
const published = Object.keys(COMPONENTS).length + Object.keys(ICONS).length;
console.log(
  `ai/: ${matching} of ${FILES.length} files match the sources; ${published} published components covered ` +
    `(${Object.keys(COMPONENTS).length} entries and the Icon entry for ${Object.keys(ICONS).length} icons); llms.txt links ` +
    `${links.length} addresses — ${problems.length} problem(s).` +
    (docsPages ? "" : " Storybook Docs pages not checked: storybook-static/ is missing (run npm run build-storybook).")
);
process.exit(problems.length ? 1 : 0);
