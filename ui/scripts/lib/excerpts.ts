// Excerpts for the website's AI page: one component, Chip/Status, followed from Sterling's sources to code an AI tool
// wrote. Every excerpt is read from the real file when the site builds, never pasted by hand. A selector names
// what to take, and fails if it finds nothing, or more than one thing, so a renamed key or symbol can't silently
// drop an excerpt:
//   • a TypeScript entry: the `"Chip/Status": {` key, up to its matching brace;
//   • a JSON path, shortened to the keys the page shows (the rest become "…");
//   • whole lines, each matching one pattern exactly once ("…" between lines that aren't next to each other);
//   • a code symbol (`export const TONES`) up to its matching brace, or one line of JSX.
// The code excerpts (step 7) are read from the commit the screen was delivered in, and must be identical in the
// current files: the page says the lines are as delivered. That needs the repository's history (a CI checkout
// with fetch-depth: 0).
//
// `npm run check:excerpts` runs every selector without building the site.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderLlmsTxt } from "../../../scripts/lib/llms.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
const json = (path: string) => JSON.parse(read(path));

/** The commit the Pool loans screen was delivered in, by the AI session that built it. */
export const DELIVERED = "2872cf0";
export const DELIVERED_FOLDER = "ui/src/examples/pool-loans";

export interface Excerpt {
  /** The file it comes from, from the repository root. */
  source: string;
  /** For an excerpt read from a commit. */
  commit?: string;
  /** What this excerpt shows, in a few words. */
  label: string;
  language: "ts" | "tsx" | "json" | "text";
  text: string;
}

class ExcerptError extends Error {}
const fail = (message: string): never => {
  throw new ExcerptError(message);
};

// ------------------------------------------------------------------ selectors

/** Removes the indentation every line shares. */
function dedent(text: string): string {
  const lines = text.split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
}

/** From the line at `start` to the line that closes the brace it opens. Braces inside strings don't count. */
function toClosingBrace(lines: string[], start: number, what: string): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (quote) {
        if (ch === "\\") c++;
        else if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "/" && line[c + 1] === "/") break;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) return dedent(lines.slice(start, i + 1).join("\n"));
    }
  }
  return fail(`${what}: no closing brace`);
}

/** The one line index matching `pattern`. */
function oneLine(lines: string[], pattern: RegExp, what: string): number {
  const found = lines.flatMap((line, i) => (pattern.test(line) ? [i] : []));
  if (found.length !== 1) fail(`${what}: ${pattern} matches ${found.length} lines, not 1`);
  return found[0];
}

/** A TypeScript object entry: `"<key>": {` up to its matching brace. */
export function tsEntry(text: string, key: string, what: string): string {
  const lines = text.split("\n");
  const escaped = key.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return toClosingBrace(lines, oneLine(lines, new RegExp(`^\\s*"${escaped}": \\{`), what), what);
}

/** A declaration (`export const TONES`) up to its matching brace. */
export function codeSymbol(text: string, declaration: string, what: string): string {
  const lines = text.split("\n");
  return toClosingBrace(lines, oneLine(lines, new RegExp(`^\\s*${declaration}\\b`), what), what);
}

/**
 * Lines, each matching one pattern exactly once, in file order; "…" between lines that aren't next to each other.
 * Each run of neighbouring lines loses its own shared indentation, since runs can come from different depths.
 */
export function someLines(text: string, patterns: RegExp[], what: string, gap = "…"): string {
  const lines = text.split("\n");
  const picked = [...new Set(patterns.map((p) => oneLine(lines, p, what)))].sort((a, b) => a - b);
  const out: string[] = [];
  let run: string[] = [];
  picked.forEach((index, n) => {
    const skipped = n > 0 ? lines.slice(picked[n - 1] + 1, index) : [];
    if (skipped.length) {
      out.push(dedent(run.join("\n")));
      // Lines left out become "…"; when they are only blank lines, a blank line.
      out.push(skipped.every((l) => !l.trim()) ? "" : gap);
      run = [];
    }
    run.push(lines[index]);
  });
  out.push(dedent(run.join("\n")));
  return out.join("\n");
}

/** The one item in a list that `matches`. */
export function findOne<T>(items: T[], matches: (item: T) => boolean, what: string): T {
  const found = items.filter(matches);
  if (found.length !== 1) fail(`${what}: ${found.length} matches, not 1`);
  return found[0];
}

/**
 * Which parts of a JSON value to show. `true` shows it whole. An object names the keys to keep, in the value's
 * order; every key it names must be there. An array spec shows the first `first` items, each shortened by `each`.
 * What isn't shown becomes "…".
 */
export type Shape = true | { [key: string]: Shape } | { $first?: number; $each?: Shape };

const INLINE = 100;
/** JSON on one line, spaced for reading. */
function inline(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
  if (value && typeof value === "object") return `{ ${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`).join(", ")} }`;
  return JSON.stringify(value);
}
/** JSON with short objects and arrays on one line. */
function stringify(value: unknown, indent: string): string {
  const flat = inline(value);
  if (value === null || typeof value !== "object" || flat.length + indent.length <= INLINE) return flat;
  const inner = indent + "  ";
  if (Array.isArray(value)) return `[\n${value.map((v) => inner + stringify(v, inner)).join(",\n")}\n${indent}]`;
  return `{\n${Object.entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${stringify(v, inner)}`).join(",\n")}\n${indent}}`;
}

/** A JSON value, shortened to `shape`. */
export function shortJson(value: unknown, shape: Shape, what: string, indent = ""): string {
  if (shape === true || value === null || typeof value !== "object") return stringify(value, indent);
  const inner = indent + "  ";
  if (Array.isArray(value)) {
    const spec = shape as { $first?: number; $each?: Shape };
    const shown = value.slice(0, spec.$first ?? value.length).map((v, i) => inner + shortJson(v, spec.$each ?? true, `${what}[${i}]`, inner));
    if (shown.length < value.length) shown.push(`${inner}…`);
    return `[\n${shown.join(",\n")}\n${indent}]`;
  }
  const spec = shape as Record<string, Shape>;
  for (const key of Object.keys(spec)) if (!(key in (value as object))) fail(`${what}: no key "${key}"`);
  const entries = Object.entries(value as object);
  const shown = entries.filter(([k]) => k in spec).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${shortJson(v, spec[k], `${what}.${k}`, inner)}`);
  if (shown.length < entries.length) shown.push(`${inner}…`);
  return `{\n${shown.join(",\n")}\n${indent}}`;
}

// ------------------------------------------------------------------ the seven steps

const COMPONENT = "Chip/Status";
const TOKEN = "status/warning-subtle";
const PATTERN = "status-chips";

/** A file as it was in a commit. Needs the repository's history. */
function atCommit(commit: string, path: string): string {
  try {
    return execFileSync("git", ["show", `${commit}:${path}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).replace(/\r\n/g, "\n");
  } catch {
    return fail(`can't read ${path} at ${commit}: the checkout needs the full history (fetch-depth: 0)`);
  }
}

/** Code as delivered, which must be identical in the current file. */
function asDelivered(path: string, label: string, select: (text: string) => string): Excerpt {
  const delivered = select(atCommit(DELIVERED, path));
  const now = select(read(path));
  if (now !== delivered) fail(`${path}: "${label}" has changed since ${DELIVERED}; the page says these lines are as delivered`);
  return { source: path, commit: DELIVERED, label, language: "tsx", text: delivered };
}

export function sourceExcerpts(): Excerpt[] {
  const what = (file: string) => `${file} (${COMPONENT})`;
  return [
    {
      source: "definitions/components.ts",
      label: "Its variants and component properties",
      language: "ts",
      text: tsEntry(read("definitions/components.ts"), COMPONENT, what("definitions/components.ts")),
    },
    {
      source: "definitions/docRegistry.ts",
      label: "What it's for, and when to use it",
      language: "ts",
      text: tsEntry(read("definitions/docRegistry.ts"), COMPONENT, what("definitions/docRegistry.ts")),
    },
    {
      source: "tokens/tokens.json",
      label: `One of its tokens, ${TOKEN}: description and values`,
      language: "json",
      text: someLines(read("tokens/tokens.json"), [new RegExp(`^\\s*"${TOKEN}": "`), new RegExp(`^\\s*"${TOKEN}":\\s+\\{`)], `tokens/tokens.json (${TOKEN})`),
    },
  ];
}

export function componentsJsonExcerpt(): Excerpt {
  const entry = findOne(json("ai/components.json").components as { name: string }[], (c) => c.name === COMPONENT, `ai/components.json (${COMPONENT})`);
  return {
    source: "ai/components.json",
    label: "Its entry",
    language: "json",
    text: shortJson(
      entry,
      {
        name: true,
        description: true,
        useWhen: true,
        dontUseWhen: true,
        related: true,
        figma: { name: true, variantProperties: true },
        react: { component: true, import: true, props: true },
      },
      `ai/components.json (${COMPONENT})`
    ),
  };
}

export function tokenExcerpt(): Excerpt {
  const [group, name] = TOKEN.split("/");
  const token = json("ai/tokens.dtcg.json").color?.[group]?.[name] ?? fail(`ai/tokens.dtcg.json: no color.${group}.${name}`);
  const mode = { $value: true, resolved: { hex: true } } as const;
  return {
    source: "ai/tokens.dtcg.json",
    label: TOKEN,
    language: "json",
    text: shortJson(
      { [name]: token },
      {
        [name]: {
          $type: true,
          $value: true,
          $description: true,
          $extensions: { "io.github.mcasey10.sterling": { cssVar: true, modes: { Light: mode, Dark: mode } } },
        },
      },
      `ai/tokens.dtcg.json (${TOKEN})`
    ),
  };
}

export function patternExcerpt(): Excerpt {
  const pattern = findOne(json("ai/guidelines.json").patterns as { id: string }[], (p) => p.id === PATTERN, `ai/guidelines.json (${PATTERN})`);
  return {
    source: "ai/guidelines.json",
    label: "The Status chips pattern",
    language: "json",
    text: shortJson(pattern, { name: true, summary: true, useWhen: true, steps: { $first: 1 } }, `ai/guidelines.json (${PATTERN})`),
  };
}

export function llmsExcerpt(): Excerpt {
  const text = renderLlmsTxt(json("ai/index.json")).replace(/\r\n/g, "\n");
  return {
    source: "llms.txt",
    label: "Where it points a tool",
    language: "text",
    text: someLines(
      text,
      [/^# Sterling$/, /^> /, /^## Machine-readable export$/, /^- \[components\.json\]/, /^- \[guidelines\.json\]/, /^## MCP server$/, /^Tools: /],
      "llms.txt"
    ),
  };
}

export interface Exchange {
  server: { name: string; version: string };
  tools: string[];
  getComponent: { name: string; description: string };
  calls: { request: { name: string; arguments: Record<string, string> }; result: unknown }[];
}

/** The MCP exchange (from mcp/scripts/exchange.mjs), shortened for the page. */
export function exchangeExcerpts(exchange: Exchange): { description: string; calls: { request: string; result: string }[] } {
  const call = (tool: string) => findOne(exchange.calls, (c) => c.request.name === tool, `the MCP exchange (${tool})`);
  const shapes: Record<string, Shape> = {
    get_component: { name: true, description: true, useWhen: true, related: true, react: { component: true, import: true } },
    get_pattern: { name: true, summary: true, steps: { $first: 1 } },
  };
  return {
    description: exchange.getComponent.description ?? fail("the MCP exchange: get_component has no description"),
    calls: Object.entries(shapes).map(([tool, shape]) => {
      const { request, result } = call(tool);
      return { request: stringify({ name: request.name, arguments: request.arguments }, ""), result: shortJson(result, shape, `the MCP exchange (${tool})`) };
    }),
  };
}

export function codeExcerpts(): Excerpt[] {
  return [
    asDelivered(`${DELIVERED_FOLDER}/src/LoanTable.tsx`, "Each loan status, and its chip tone", (text) => codeSymbol(text, "export const TONES", "LoanTable.tsx (TONES)")),
    asDelivered(`${DELIVERED_FOLDER}/src/App.tsx`, "The pool's status, in the page header", (text) =>
      someLines(text, [/^\s*<StatusChip\b/], "App.tsx (<StatusChip)")
    ),
  ];
}

/** Runs every selector; the messages of any that fail. */
export function excerptProblems(exchange?: Exchange): string[] {
  const problems: string[] = [];
  const run = (fn: () => unknown) => {
    try {
      fn();
    } catch (error) {
      if (error instanceof ExcerptError) problems.push(error.message);
      else throw error;
    }
  };
  for (const fn of [sourceExcerpts, componentsJsonExcerpt, tokenExcerpt, patternExcerpt, llmsExcerpt, codeExcerpts]) run(fn);
  if (exchange) run(() => exchangeExcerpts(exchange));
  return problems;
}
