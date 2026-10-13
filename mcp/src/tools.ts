// The server's tools: what each is called, what it tells a client about itself, and what it returns. Every
// tool is read-only and answers from the bundled export (data.ts). The logic is plain functions over that
// data, so the tests call it directly; server.ts only wires it to the protocol.

import { z } from "zod";
import { COMPONENTS, EXTENSION, ICONS, PATTERNS, SECTIONS, TOKENS, type ComponentEntry, type TokenNode } from "./data";
import { closest, indexBy, norm, type Candidate } from "./lookup";
import { TOOL_NAMES, type ToolName } from "./tool-names";

/** What a tool returns: data, or an error a client can act on (with the closest names, when a name was unknown). */
export type Result = { ok: true; data: unknown } | { ok: false; error: string; suggestions: string[] };
const ok = (data: unknown): Result => ({ ok: true, data });
const fail = (error: string, suggestions: string[] = [], hint = ""): Result => ({
  ok: false,
  error: [error, suggestions.length ? `Closest matches: ${suggestions.join(", ")}.` : "", hint].filter(Boolean).join(" "),
  suggestions,
});
const list = (names: string[]) => names.join(", ");

// ---------------------------------------------------------------- components

const categoryOf = (name: string) => name.split("/")[0];
/** The component folders, alphabetically after Controls, with Icon last. */
export const CATEGORIES = [...[...new Set(COMPONENTS.map((c) => categoryOf(c.name)))].sort((a, b) => Number(b === "Controls") - Number(a === "Controls") || a.localeCompare(b)), "Icon"];
const leafOf = (name: string) => name.slice(name.indexOf("/") + 1);

const componentIndex = indexBy(COMPONENTS, (c) => [c.name, c.react.component, leafOf(c.name), c.id]);
/** "search" → "search", "chevrondown" → "chevron-down": an icon's name by its letters. */
const iconIndex = new Map(ICONS.names.map((full) => [norm(leafOf(full)), leafOf(full)]));
const componentCandidates: Candidate[] = [
  ...COMPONENTS.map((c) => ({ label: `${c.name} (${c.react.component})`, keys: [c.name, c.react.component, leafOf(c.name)] })),
  ...ICONS.names.map((full) => ({ label: full, keys: [full, leafOf(full)] })),
];
const iconCandidates: Candidate[] = ICONS.names.map((full) => ({ label: full, keys: [leafOf(full)] }));

const summaryOf = (c: ComponentEntry) => ({ name: c.name, react: c.react.component, category: categoryOf(c.name), description: c.description });
const iconSummary = () => ({
  name: ICONS.name,
  react: ICONS.react.component,
  category: "Icon",
  description: `${ICONS.names.length} icons that share one entry: ${ICONS.details}`,
  names: ICONS.names,
});

export function listComponents(category?: string): Result {
  if (!category) return ok({ count: COMPONENTS.length, categories: CATEGORIES, components: COMPONENTS.map(summaryOf), icons: iconSummary() });
  const wanted = CATEGORIES.find((c) => norm(c) === norm(category) || norm(`${c}s`) === norm(category));
  if (!wanted) return fail(`No category named "${category}".`, [], `Categories: ${list(CATEGORIES)}.`);
  if (wanted === "Icon") return ok({ count: 0, category: wanted, components: [], icons: iconSummary() });
  const components = COMPONENTS.filter((c) => categoryOf(c.name) === wanted).map(summaryOf);
  return ok({ count: components.length, category: wanted, components });
}

/** The shared Icon entry, saying which icon was asked for when one was. */
const iconResult = (icon?: string) => ({
  ...(icon ? { requested: { icon, figmaName: `Icon/${icon}`, react: `<Icon name="${icon}" />` } } : {}),
  ...ICONS,
});

export function getComponent(name: string): Result {
  const key = norm(name);
  const component = componentIndex.get(key);
  if (component) return ok(component);
  if (key === "icon" || key === "icons") return ok(iconResult());
  // "Icon/search", "IconSearch", or the bare "search" when no component answers to it.
  const icon = iconIndex.get(key.startsWith("icon") ? key.slice(4) : key) ?? iconIndex.get(key);
  if (icon) return ok(iconResult(icon));
  if (key.startsWith("icon") && name.includes("/")) {
    return fail(`No icon named "${leafOf(name)}".`, suggest(leafOf(name), iconCandidates, ["icon"]), `Sterling has ${ICONS.names.length} icons; get_component("Icon") lists them.`);
  }
  return fail(`No component named "${name}".`, suggest(name, componentCandidates, ["component", "icon"]), "Call list_components to see every component.");
}

// ---------------------------------------------------------------- tokens

interface Token {
  /** The name in Figma: "surface/background", "space/8", "Body". */
  name: string;
  collection: string;
  /** The DTCG path: "color.surface.background". */
  path: string;
  /** The CSS custom property (--stl-…) or, for a text style, the class (.stl-text-…). */
  css: string;
  node: TokenNode;
}

const TOKEN_LIST: Token[] = [];
(function walk(node: TokenNode, path: string[]) {
  if ("$value" in node) {
    const own = node.$extensions[EXTENSION];
    TOKEN_LIST.push({ name: own.figmaName, collection: path[0], path: path.join("."), css: own.cssVar ?? own.cssClass, node });
    return;
  }
  for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) walk(child, [...path, key]);
})(TOKENS, []);

export const COLLECTIONS = Object.keys(TOKENS).filter((key) => !key.startsWith("$"));
const tokenByPath = new Map(TOKEN_LIST.map((t) => [t.path, t]));
const tokenIndex = indexBy(TOKEN_LIST, (t) => [t.name, `${t.collection}/${t.name}`, t.path, t.css]);
const tokenCandidates: Candidate[] = TOKEN_LIST.map((t) => ({ label: `${t.name} (${t.css})`, keys: [t.name, t.css, t.path] }));
const own = (t: Token) => t.node.$extensions[EXTENSION];
/** A collection's modes ("Light", "Dark"), or none. */
const modesOf = (collection: string): string[] => TOKENS.$extensions[EXTENSION].modes[collection] ?? [];
const defaultMode = (collection: string): string | undefined => TOKENS.$extensions[EXTENSION].defaultModes[collection];

/** "{primitives.neutral.50}" → "neutral/50": the Figma name of the token a value aliases, or undefined. */
const aliasOf = (value: unknown) => {
  const path = typeof value === "string" ? /^\{(.+)\}$/.exec(value)?.[1] : undefined;
  return path ? tokenByPath.get(path)?.name ?? path : undefined;
};
/** A literal value in a short, readable form: "#F7F8FA", "#14181D at 50%", "8px", or a text style's parts. */
function literal(type: string, value: any): unknown {
  if (type === "color") return value.alpha === undefined ? value.hex : `${value.hex} at ${Math.round(value.alpha * 100)}%`;
  if (type === "dimension") return `${value.value}${value.unit}`;
  if (type === "typography") {
    return { fontFamily: value.fontFamily, fontSize: literal("dimension", value.fontSize), fontWeight: value.fontWeight, lineHeight: value.lineHeight, letterSpacing: literal("dimension", value.letterSpacing) };
  }
  return value;
}
/** A token's value in one mode, or its only value: what it aliases (if anything) and what that resolves to. */
function valueOf(token: Token, mode?: string) {
  const type = token.node.$type;
  if (mode) {
    const entry = own(token).modes[mode];
    const alias = aliasOf(entry.$value);
    return { ...(alias ? { aliasOf: alias } : {}), value: literal(type, entry.resolved) };
  }
  return { value: literal(type, token.node.$value) };
}

export function getTokens(collection?: string, mode?: string): Result {
  const everyMode = COLLECTIONS.flatMap((c) => modesOf(c).map((m) => ({ collection: c, mode: m })));
  const wantedMode = mode ? everyMode.find((m) => norm(m.mode) === norm(mode)) : undefined;
  if (mode && !wantedMode) return fail(`No mode named "${mode}".`, [], `Modes: ${list(everyMode.map((m) => `${m.mode} (${m.collection})`))}.`);
  // A mode alone says which collection is meant: Light and Dark are color, the densities are density.
  const wanted = collection ? COLLECTIONS.find((c) => norm(c) === norm(collection)) : wantedMode?.collection;
  if (collection && !wanted) return fail(`No token collection named "${collection}".`, closest(collection, COLLECTIONS.map((c) => ({ label: c, keys: [c] }))), `Collections: ${list(COLLECTIONS)}.`);
  if (!wanted) {
    return ok({
      collections: COLLECTIONS.map((c) => ({
        name: c,
        tokens: TOKEN_LIST.filter((t) => t.collection === c).length,
        ...(modesOf(c).length ? { modes: modesOf(c), defaultMode: defaultMode(c) } : {}),
        description: TOKENS[c].$description,
      })),
      next: "Call get_tokens with a collection to list its tokens, or get_token with a name for one token.",
    });
  }
  if (wantedMode && wantedMode.collection !== wanted) {
    const modes = modesOf(wanted);
    return fail(`The ${wanted} collection has no ${wantedMode.mode} mode.`, [], modes.length ? `Its modes: ${list(modes)}.` : "It has one value per token, with no modes.");
  }
  const modes = modesOf(wanted);
  const tokens = TOKEN_LIST.filter((t) => t.collection === wanted).map((t) => ({
    name: t.name,
    css: t.css,
    ...(wantedMode ? valueOf(t, wantedMode.mode) : modes.length ? { value: Object.fromEntries(modes.map((m) => [m, valueOf(t, m).value])) } : valueOf(t)),
    ...(t.node.$description ? { description: t.node.$description } : {}),
  }));
  return ok({
    collection: wanted,
    description: TOKENS[wanted].$description,
    ...(modes.length ? { modes, mode: wantedMode?.mode ?? "all" } : {}),
    count: tokens.length,
    tokens,
  });
}

export function getToken(name: string): Result {
  const token = tokenIndex.get(norm(name));
  if (!token) return fail(`No token named "${name}".`, suggest(name, tokenCandidates, ["token"]), "Call get_tokens with a collection to list its tokens.");
  const extra = own(token);
  const modes = modesOf(token.collection);
  const alias = aliasOf(token.node.$value);
  return ok({
    name: token.name,
    collection: token.collection,
    type: token.node.$type,
    ...(token.node.$description ? { description: token.node.$description } : {}),
    ...(extra.note ? { note: extra.note } : {}),
    css: token.css,
    dtcgPath: token.path,
    ...(extra.published === false ? { published: false, use: "A primitive: hidden in Figma. Use the semantic color tokens that alias it." } : {}),
    ...(modes.length
      ? { defaultMode: defaultMode(token.collection), modes: Object.fromEntries(modes.map((m) => [m, valueOf(token, m)])) }
      : { ...(alias ? { aliasOf: alias } : {}), ...valueOf(token) }),
    ...(extra.lineHeightPx ? { lineHeightPx: extra.lineHeightPx } : {}),
    ...(extra.tabularFigures ? { tabularFigures: true } : {}),
    ...(extra.textDecoration ? { textDecoration: extra.textDecoration } : {}),
  });
}

// ---------------------------------------------------------------- guidelines and patterns

const sectionIndex = indexBy(SECTIONS, (s) => [s.name, s.id]);
const patternIndex = indexBy(PATTERNS, (p) => [p.name, p.id]);
const sectionCandidates: Candidate[] = SECTIONS.map((s) => ({ label: s.name, keys: [s.name] }));
const patternCandidates: Candidate[] = PATTERNS.map((p) => ({ label: p.name, keys: [p.name] }));

export function listGuidelines(): Result {
  return ok({
    sections: SECTIONS.map((s) => ({ name: s.name, summary: s.summary })),
    patterns: PATTERNS.map((p) => ({ name: p.name, summary: p.summary })),
    next: "Call get_guideline with a section name, or get_pattern with a pattern name.",
  });
}

export function getGuideline(section: string): Result {
  const found = sectionIndex.get(norm(section));
  if (found) return ok(found);
  const pattern = patternIndex.get(norm(section));
  if (pattern) return fail(`"${pattern.name}" is a pattern, not a guideline section.`, [], `Call get_pattern("${pattern.name}").`);
  return fail(`No guideline section named "${section}".`, suggest(section, sectionCandidates, ["guideline"]), `Sections: ${list(SECTIONS.map((s) => s.name))}.`);
}

export function getPattern(name: string): Result {
  const found = patternIndex.get(norm(name));
  if (found) return ok(found);
  const section = sectionIndex.get(norm(name));
  if (section) return fail(`"${section.name}" is a guideline section, not a pattern.`, [], `Call get_guideline("${section.name}").`);
  return fail(`No pattern named "${name}".`, suggest(name, patternCandidates, ["pattern"]), `Patterns: ${list(PATTERNS.map((p) => p.name))}.`);
}

// ---------------------------------------------------------------- search

interface Doc {
  type: "component" | "icon" | "guideline" | "pattern" | "token";
  name: string;
  /** Other names it answers to, weighted like the name. */
  aliases: string[];
  /** Everything else that can match, in the order an excerpt should prefer. */
  text: string[];
  tool: ToolName;
  argument: Record<string, string>;
}

const DOCS: Doc[] = [
  ...COMPONENTS.map((c): Doc => ({
    type: "component", name: c.name, aliases: [c.react.component],
    text: [c.description, c.details, `Use when: ${c.useWhen}`, `Don't use when: ${c.dontUseWhen}`, ...c.react.props.map((p) => (p.note ? `${p.name}: ${p.note}` : p.name))],
    tool: "get_component", argument: { name: c.name },
  })),
  ...ICONS.names.map((full): Doc => ({
    type: "icon", name: full, aliases: [leafOf(full)], text: [ICONS.details],
    tool: "get_component", argument: { name: full },
  })),
  ...SECTIONS.map((s): Doc => ({
    type: "guideline", name: s.name, aliases: [],
    text: [s.summary, ...s.rules.map((r) => `${r.term}: ${r.text}`), ...s.doDont.flatMap((d) => [d.title, `Do: ${d.do}`, `Don't: ${d.dont}`]), ...(s.table?.rows ?? []).map((row) => row.filter(Boolean).join(" · "))],
    tool: "get_guideline", argument: { section: s.name },
  })),
  ...PATTERNS.map((p): Doc => ({
    type: "pattern", name: p.name, aliases: [],
    text: [p.summary, `Use when: ${p.useWhen}`, `Don't use when: ${p.dontUseWhen}`, ...p.steps.map((s) => `${s.label}: ${s.note}`)],
    tool: "get_pattern", argument: { name: p.name },
  })),
  ...TOKEN_LIST.map((t): Doc => ({
    type: "token", name: t.name, aliases: [t.css],
    text: [t.node.$description ?? "", own(t).note ?? ""].filter(Boolean),
    tool: "get_token", argument: { name: t.name },
  })),
];
const SEARCH_LIMIT = 10;
const TYPE_ORDER = ["component", "pattern", "guideline", "icon", "token"];

/** The passage of a doc's text that holds the most query words, cut to a readable length around the first one. */
function excerpt(doc: Doc, words: string[]): string {
  let best = doc.text[0] ?? "";
  let most = 0;
  for (const passage of doc.text) {
    const lower = passage.toLowerCase();
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > most) [best, most] = [passage, hits];
  }
  if (best.length <= 220) return best;
  const at = Math.max(0, Math.min(...words.map((w) => best.toLowerCase().indexOf(w)).filter((i) => i >= 0), best.length) - 60);
  const start = at === 0 ? 0 : best.indexOf(" ", at) + 1;
  return (start ? "… " : "") + best.slice(start, start + 220).replace(/\s+\S*$/, "") + " …";
}

/** Every doc that holds at least one of the words, best first. */
function rank(words: string[], phrase: string) {
  const scored = DOCS.map((doc) => {
    const names = [doc.name, ...doc.aliases].join(" ").toLowerCase();
    const body = doc.text.join(" ").toLowerCase();
    let score = 0;
    let matched = 0;
    for (const word of words) {
      const inName = names.includes(word);
      const inBody = body.includes(word);
      if (inName || inBody) matched++;
      score += (inName ? 6 : 0) + (inBody ? 1 + Math.min(body.split(word).length - 2, 3) * 0.5 : 0);
    }
    // Every word found beats any single word; the whole phrase, in order, beats both.
    if (matched === words.length) score += 10;
    if (words.length > 1 && (names.includes(phrase) || body.includes(phrase))) score += 10;
    return { doc, score, matched };
  }).filter((s) => s.matched > 0);
  return scored.sort((a, b) => b.score - a.score || TYPE_ORDER.indexOf(a.doc.type) - TYPE_ORDER.indexOf(b.doc.type) || a.doc.name.localeCompare(b.doc.name));
}

/** How a doc is named in a list of closest matches: as the tool that returns it names it. */
function labelOf(doc: Doc): string {
  if (doc.type === "component") return `${doc.name} (${doc.aliases[0]})`;
  if (doc.type === "token") return `${doc.name} (${doc.aliases[0]})`;
  return doc.name;
}

/**
 * The closest known names to one that matched nothing, at most five: names a typo away first, then the items
 * of the right kind that are about the same thing ("DataTable" → the data grid, "Modal" → the dialog).
 */
function suggest(name: string, candidates: Candidate[], types: Doc["type"][]): string[] {
  const typos = closest(name, candidates);
  // "DataTable" → data, table. Short words say too little to match on.
  const words = [...new Set(name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && w !== "icon" && w !== "stl"))];
  const about = words.length ? rank(words, words.join(" ")).filter((s) => types.includes(s.doc.type)).slice(0, 3).map((s) => labelOf(s.doc)) : [];
  return [...new Set([...typos, ...about])].slice(0, 5);
}

export function search(query: string): Result {
  const phrase = query.trim().toLowerCase();
  const words = [...new Set(phrase.split(/[^a-z0-9/-]+/).filter((w) => w.length > 1))];
  if (!words.length) return fail("Give search a word or phrase of two or more letters, for example \"sort\" or \"empty state\".");
  const scored = rank(words, phrase);
  const results = scored.slice(0, SEARCH_LIMIT).map(({ doc }) => ({ type: doc.type, name: doc.name, excerpt: excerpt(doc, words), tool: doc.tool, arguments: doc.argument }));
  return ok({
    query,
    found: scored.length,
    shown: results.length,
    results,
    ...(results.length ? {} : { next: "Nothing matched. Try one word, or call list_components or list_guidelines to browse." }),
  });
}

// ---------------------------------------------------------------- the tools, as a client sees them

export interface Tool {
  name: ToolName;
  /** A short name for people. */
  title: string;
  /** What an AI client reads to decide whether to call the tool. */
  description: string;
  /** The arguments, as a zod shape. */
  input: z.ZodRawShape;
  run: (args: Record<string, string | undefined>) => Result;
}

const example = <T extends { name: string }>(items: T[]) => list(items.map((item) => item.name));
const patternNames = PATTERNS.map((p) => p.name).join("; ");

export const TOOLS: Tool[] = [
  {
    name: "list_components",
    title: "List Sterling components",
    description:
      "List Sterling's components with a one-line description of each. Call this first to see what exists before designing or coding " +
      "a screen: Sterling has no components beyond these. Optional `category` narrows the list to one folder: " +
      `${list(CATEGORIES.slice(0, -1))}, or ${CATEGORIES[CATEGORIES.length - 1]}. Returns each component's Figma name, React component ` +
      "name, and description. Use get_component for the full entry.",
    input: { category: z.string().optional().describe(`One of: ${list(CATEGORIES)}. Leave out for every component.`) },
    run: (args) => listComponents(args.category),
  },
  {
    name: "get_component",
    title: "Get a Sterling component",
    description:
      "Get everything about one Sterling component: what it is for, when to use it and when not to, its Figma variant and component " +
      "properties, its React props (each with the Figma property it stands for), how each state is expressed in code, and links to " +
      'Storybook and Figma. `name` accepts the Figma name ("Grid/Data grid"), the React name ("DataGrid"), or an icon ("Icon/search"), ' +
      `in any letter case. All ${ICONS.names.length} icons share one entry. An unknown name returns an error listing the closest matches.`,
    input: { name: z.string().describe('A Figma name ("Grid/Data grid"), a React component name ("DataGrid"), or an icon ("Icon/search").') },
    run: (args) => getComponent(args.name ?? ""),
  },
  {
    name: "get_tokens",
    title: "List Sterling design tokens",
    description:
      `List Sterling's design tokens. With no arguments, returns the collections (${list(COLLECTIONS)}), how many tokens each has, ` +
      "and their modes. With `collection`, returns every token in it: name, CSS custom property or class, value, and description. " +
      `Optional \`mode\` gives values for one mode: ${modesOf("color").join(" or ")} for color; ${list(modesOf("density").slice(0, -1))}, or ` +
      `${modesOf("density").slice(-1)[0]} for density. Use semantic color tokens, not primitives, in designs and code.`,
    input: {
      collection: z.string().optional().describe(`One of: ${list(COLLECTIONS)}. Leave out for an overview of the collections.`),
      mode: z.string().optional().describe(`${list(modesOf("color"))} (color) or ${list(modesOf("density"))} (density). Leave out for every mode.`),
    },
    run: (args) => getTokens(args.collection, args.mode),
  },
  {
    name: "get_token",
    title: "Get a Sterling design token",
    description:
      "Get one Sterling design token: its type, description, CSS custom property or class, the token it aliases, and its value in every " +
      'mode with the value it resolves to. `name` accepts the Figma name ("surface/background"), the CSS name ' +
      '("--stl-color-surface-background"), the DTCG path ("color.surface.background"), or a text style ("Body"). An unknown name ' +
      "returns an error listing the closest matches.",
    input: { name: z.string().describe('A token name in any of its forms: "surface/background", "--stl-color-surface-background", "color.surface.background", or "Body".') },
    run: (args) => getToken(args.name ?? ""),
  },
  {
    name: "list_guidelines",
    title: "List Sterling guidelines and patterns",
    description:
      `List Sterling's ${SECTIONS.length} guideline sections (the rules) and ${PATTERNS.length} patterns (complete compositions), each with a ` +
      "one-line summary. Call this to see which rules and patterns exist before reading one with get_guideline or get_pattern.",
    input: {},
    run: () => listGuidelines(),
  },
  {
    name: "get_guideline",
    title: "Get a Sterling guideline section",
    description:
      `Get one section of Sterling's design guidelines: its rules, and its do / don't pairs. Sections: ${example(SECTIONS)}. Call this ` +
      "before making a decision the section covers, for example Accessibility for focus and contrast, or Data display for numbers, " +
      "column widths, and sorting.",
    input: { section: z.string().describe(`One of: ${example(SECTIONS)}.`) },
    run: (args) => getGuideline(args.section ?? ""),
  },
  {
    name: "get_pattern",
    title: "Get a Sterling pattern",
    description:
      "Get one Sterling pattern: a complete composition, with when to use it, when not to, and its numbered steps. Patterns: " +
      `${patternNames}. Call this before building a screen or a flow the pattern covers.`,
    input: { name: z.string().describe(`One of: ${patternNames}.`) },
    run: (args) => getPattern(args.name ?? ""),
  },
  {
    name: "search",
    title: "Search Sterling",
    description:
      'Search Sterling\'s components, guidelines, patterns, and tokens for a word or phrase, for example "sort", "disabled", or ' +
      '"empty state". Use this when you don\'t know which component, guideline section, pattern, or token covers a question. Returns ' +
      `the best matches (up to ${SEARCH_LIMIT}) with their type, name, a short excerpt, and the tool to call for the full entry.`,
    input: { query: z.string().describe('A word or short phrase, for example "sort" or "empty state".') },
    run: (args) => search(args.query ?? ""),
  },
];

if (TOOLS.map((t) => t.name).join() !== TOOL_NAMES.join()) throw new Error("TOOLS and TOOL_NAMES list different tools");
