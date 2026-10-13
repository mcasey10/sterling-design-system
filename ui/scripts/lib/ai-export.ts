// The machine-readable export in ai/: Sterling's components, tokens, and guidelines as JSON for AI tools.
// Built only from the sources (tokens/tokens.json, definitions/, src/parity/, the root package.json, and
// CHANGELOG.md for the release date), so it holds nothing that isn't already true of the library.
//   ai/index.json         What the export is, its version, the files, and how to use them
//   ai/components.json    Every published component: guidance, Figma properties, React props, links
//   ai/tokens.dtcg.json   Every token in the Design Tokens (DTCG) format, version 2025.10
//   ai/guidelines.json    The Guidelines sections and the Patterns
// `npm run export:ai` writes the files; `npm run check:ai` fails if they differ from what the sources give.
// The output has no clock time in it and a fixed key order, so it regenerates byte for byte.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPONENTS, variantCount, type PropertyDef } from "../../../definitions/components";
import {
  FIGMA_COMMUNITY_URL, FIGMA_FILE_URL, ICON_DOC, STORYBOOK_URL, docFor, storybookDocsUrl,
  type DocTarget,
} from "../../../definitions/docRegistry";
import { GUIDELINES, PATTERNS, sentence } from "../../../definitions/guidelines";
import { ICONS } from "../../../definitions/icons";
import { cssClass, cssVar } from "../../../scripts/lib/token-names.mjs";
import { CODED } from "../../src/parity/coded";
import { CSS_STATES, DISABLED, REST, propName, stateParts, type CodedComponent } from "../../src/parity/parity";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

/** Where the export is published: the ai/ folder of the site, beside Storybook. */
export const AI_URL = STORYBOOK_URL.replace(/storybook\/$/, "ai/");
const SITE_URL = STORYBOOK_URL.replace(/storybook\/$/, "");
/** The key for Sterling's own data in a token's $extensions (reverse-domain, as the format recommends). */
export const EXTENSION = "io.github.mcasey10.sterling";
export const FILES = ["index.json", "components.json", "tokens.dtcg.json", "guidelines.json"] as const;

/** "Filters, grid, and bulk actions" → "filters-grid-and-bulk-actions": the id of a section, pattern, or component. */
export const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------------------------------------------------------------- guidelines.json

function buildGuidelines() {
  return {
    description:
      "Sterling's design rules and patterns. Sections are the rules components and screens follow; patterns are complete " +
      "compositions with numbered steps. Components point here from components.json (related).",
    sections: GUIDELINES.map((g) => ({
      id: idOf(g.name),
      name: g.name,
      summary: g.summary,
      ...(g.table ? { table: g.table } : {}),
      rules: g.rules.map(([term, text]) => ({ term, text })),
      doDont: g.doDont.map((d) => ({ title: d.title, do: d.do, dont: d.dont })),
    })),
    patterns: PATTERNS.map((p) => ({
      id: idOf(p.name),
      name: p.name,
      summary: p.summary,
      useWhen: sentence(p.use),
      dontUseWhen: sentence(p.dont),
      steps: p.steps.map(([label, note], i) => ({ number: i + 1, label, note })),
    })),
  };
}

// ---------------------------------------------------------------- components.json

/** A documentation target as a pointer into the export: a section or pattern in guidelines.json, or a component. */
function related(target: DocTarget) {
  if ("url" in target) return { type: "link", name: target.label ?? target.url, url: target.url };
  if (target.page === "Patterns") return { type: "pattern", name: target.pattern, file: "guidelines.json", id: idOf(target.pattern) };
  if ("component" in target) return { type: "component", name: target.component, file: "components.json", id: idOf(target.component) };
  return { type: "guideline", name: target.section, file: "guidelines.json", id: idOf(target.section) };
}

const KINDS: Record<PropertyDef["type"], string> = { TEXT: "text", BOOLEAN: "boolean", INSTANCE_SWAP: "icon", SLOT: "slot" };

/** How one Figma State value is expressed in code: CSS pseudo-classes and props, never a `state` prop. */
function stateInCode(value: string, coded: CodedComponent) {
  const code: string[] = [];
  for (const part of stateParts(value)) {
    if (part === REST) continue;
    if (part in CSS_STATES) code.push(CSS_STATES[part]);
    else if (coded.stateProps?.[part]) code.push(`prop ${coded.stateProps[part]}`);
    else if (part === DISABLED) code.push(`prop ${DISABLED}`);
  }
  return { figma: value, code: code.length ? code : ["no prop: the resting state"] };
}

/** A coded component's props, each with the Figma property it stands for (or the reason it has none). */
function reactProps(name: string, coded: CodedComponent) {
  const def = COMPONENTS[name];
  const figmaOnly = coded.figmaOnly ?? {};
  const fromFigma = new Map<string, Record<string, unknown>>();
  for (const [axis, values] of Object.entries(def.variants)) {
    if (axis === "State" || axis in figmaOnly) continue;
    fromFigma.set(propName(axis), { figmaProperty: axis, kind: "variant", values: [...values] });
  }
  for (const property of def.properties) {
    if (property.name in figmaOnly) continue;
    fromFigma.set(property.type === "SLOT" ? "children" : propName(property.name), {
      figmaProperty: property.name,
      kind: KINDS[property.type],
      ...(property.default === undefined ? {} : { default: property.default }),
    });
  }
  // Props that carry part of the Figma State: `disabled`, and whatever the component names in stateProps.
  const states = def.variants.State ?? [];
  const fromState = new Map<string, string[]>();
  for (const value of states) {
    for (const part of stateParts(value)) {
      const prop = coded.stateProps?.[part] ?? (part === DISABLED ? DISABLED : null);
      if (!prop) continue;
      const parts = fromState.get(prop) ?? [];
      if (!parts.includes(part)) parts.push(part);
      fromState.set(prop, parts);
    }
  }
  return coded.props.map((prop) => {
    const note = coded.codeOnly?.[prop];
    const entry: Record<string, unknown> = { name: prop };
    if (fromFigma.has(prop)) Object.assign(entry, fromFigma.get(prop));
    else if (fromState.has(prop)) Object.assign(entry, { figmaProperty: "State", kind: "state", stateValues: fromState.get(prop) });
    else Object.assign(entry, { figmaProperty: null, kind: "code-only" });
    if (note) entry.note = note;
    return entry;
  });
}

function buildComponents() {
  const components = Object.keys(COMPONENTS).map((name) => {
    const def = COMPONENTS[name];
    const doc = docFor(name);
    const coded = CODED[name];
    if (!doc) throw new Error(`${name} has no entry in definitions/docRegistry.ts`);
    if (!coded) throw new Error(`${name} has no entry in ui/src/parity/coded.ts`);
    return {
      id: idOf(name),
      name,
      description: doc.description,
      details: doc.details,
      useWhen: sentence(doc.use),
      dontUseWhen: sentence(doc.dont),
      related: doc.related.map(related),
      figma: {
        name,
        file: FIGMA_FILE_URL,
        variants: variantCount(def),
        variantProperties: Object.entries(def.variants).map(([property, values]) => ({ name: property, values: [...values] })),
        componentProperties: def.properties.map((p) => ({
          name: p.name,
          type: KINDS[p.type],
          ...(p.default === undefined ? {} : { default: p.default }),
        })),
      },
      react: {
        component: coded.component,
        source: `ui/${coded.source}`,
        props: reactProps(name, coded),
        states: (def.variants.State ?? []).map((value) => stateInCode(value, coded)),
        figmaOnly: Object.entries(coded.figmaOnly ?? {}).map(([property, reason]) => ({ property, reason })),
      },
      storybook: storybookDocsUrl(name),
    };
  });
  const iconNames = Object.keys(ICONS);
  return {
    description:
      "Every published Sterling component. `figma` lists the properties as the Figma library names them; `react` lists the " +
      "coded component's props, each with the Figma property it stands for. Figma names are sentence case and map one to " +
      "one to camelCase props (Show icon ↔ showIcon). Code has no `state` prop: hover, pressed, and focus are CSS, and the " +
      "rest are props (see each component's `states`). `related` points into guidelines.json.",
    components,
    // The 20 icons share one entry: one Figma component each (Icon/<name>), one React component for all.
    icons: {
      id: "icon",
      name: "Icon/*",
      names: iconNames.map((icon) => `Icon/${icon}`),
      description: ICON_DOC.description("<name>"),
      details: ICON_DOC.details,
      useWhen: sentence(ICON_DOC.use),
      dontUseWhen: sentence(ICON_DOC.dont),
      related: [related(ICON_DOC.docs), ...ICON_DOC.related.map(related)],
      figma: { name: "Icon/<name>", file: FIGMA_FILE_URL, variants: 1, variantProperties: [], componentProperties: [] },
      react: {
        component: "Icon",
        source: "ui/src/components/Icon.tsx",
        props: [{ name: "name", figmaProperty: null, kind: "icon-name", values: iconNames, note: "Which icon: the part of the Figma name after Icon/." }],
        states: [],
        figmaOnly: [],
      },
      storybook: storybookDocsUrl("Icon/plus"),
    },
  };
}

// ---------------------------------------------------------------- tokens.dtcg.json

type Json = Record<string, any>;
const entries = (group: Json) => Object.entries(group).filter(([key]) => !key.startsWith("$"));
const aliasOf = (raw: unknown) => /^\{(.+)\}$/.exec(String(raw))?.[1] ?? null;
const WEIGHTS: Record<string, number> = { Thin: 100, Light: 300, Regular: 400, Medium: 500, "Semi Bold": 600, Bold: 700, "Extra Bold": 800 };
const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/** "#14181D80" → { colorSpace: "srgb", components: [r, g, b], alpha, hex } with components from 0 to 1. */
function colorValue(hex: string) {
  const digits = hex.replace("#", "");
  const channel = (i: number) => parseInt(digits.slice(i, i + 2), 16);
  return {
    colorSpace: "srgb",
    components: [0, 2, 4].map((i) => round(channel(i) / 255, 4)),
    ...(digits.length === 8 ? { alpha: round(channel(6) / 255, 2) } : {}),
    hex: `#${digits.slice(0, 6).toUpperCase()}`,
  };
}
const px = (value: number) => ({ value, unit: "px" });

/** Puts a token at its path ("surface/background" → group.surface.background); a name can't also be a group. */
function place(group: Json, name: string, token: Json) {
  const parts = name.split("/");
  let at = group;
  for (const part of parts.slice(0, -1)) {
    at[part] ??= {};
    at = at[part];
    if ("$value" in at) throw new Error(`Token "${name}" sits under another token`);
  }
  const leaf = parts[parts.length - 1];
  if (leaf in at) throw new Error(`Token "${name}" is also a group`);
  at[leaf] = token;
}

function buildTokens(tokens: Json) {
  const [colorDefault] = tokens.color.$modes as string[];
  const densityModes = tokens.density.$modes as string[];
  const densityDefault = densityModes.includes("Default") ? "Default" : densityModes[0];
  // Which top-level group a token name lives in, so "{size/32}" becomes "{size.size.32}".
  const home = new Map<string, string>();
  for (const [ramp, steps] of Object.entries(tokens.primitives as Json)) for (const step of Object.keys(steps)) home.set(`${ramp}/${step}`, "primitives");
  for (const group of ["spacing", "size"]) for (const [name] of entries(tokens[group])) home.set(name, group);
  const reference = (alias: string) => {
    const group = home.get(alias);
    if (!group) throw new Error(`Alias {${alias}} names no token`);
    return `{${group}.${alias.split("/").join(".")}}`;
  };
  const primitiveHex = (alias: string) => tokens.primitives[alias.split("/")[0]][alias.split("/")[1]] as string;
  const scaleValue = (alias: string) => tokens[home.get(alias)!][alias] as number;
  const sterling = (data: Json) => ({ [EXTENSION]: data });

  const primitives: Json = { $description: "The raw color ramps. Hidden in Figma: components use the semantic Color tokens, never these." };
  for (const [ramp, steps] of Object.entries(tokens.primitives as Json)) {
    for (const [step, hex] of Object.entries(steps as Record<string, string>)) {
      place(primitives, `${ramp}/${step}`, {
        $type: "color",
        $value: colorValue(hex),
        $extensions: sterling({ figmaName: `${ramp}/${step}`, collection: "Primitives", cssVar: cssVar(`${ramp}/${step}`), published: false }),
      });
    }
  }

  const color: Json = { $description: `Semantic colors. $value is the ${colorDefault} mode; every mode is in $extensions.` };
  for (const [name, byMode] of entries(tokens.color)) {
    const modes: Json = {};
    for (const mode of tokens.color.$modes as string[]) {
      const alias = aliasOf(byMode[mode]);
      modes[mode] = alias
        ? { $value: reference(alias), resolved: colorValue(primitiveHex(alias)) }
        : { $value: colorValue(byMode[mode]), resolved: colorValue(byMode[mode]) };
    }
    const note = tokens.color.$notes?.[name];
    place(color, name, {
      $type: "color",
      $value: modes[colorDefault].$value,
      $description: tokens.color.$descriptions[name],
      $extensions: sterling({ figmaName: name, collection: "Color", cssVar: cssVar(`color/${name}`), ...(note ? { note } : {}), modes }),
    });
  }

  const scale = (group: "spacing" | "size", collection: string) => {
    const out: Json = { $description: tokens[group].$notes };
    for (const [name, value] of entries(tokens[group])) {
      place(out, name, {
        $type: "dimension",
        $value: px(value),
        $description: tokens[group].$descriptions[name],
        $extensions: sterling({ figmaName: name, collection, cssVar: cssVar(name) }),
      });
    }
    return out;
  };

  const density: Json = { $description: `Sizes that follow the Density mode. $value is the ${densityDefault} mode; every mode is in $extensions. Every value is an alias of a Size or Spacing step.` };
  for (const [name, byMode] of entries(tokens.density)) {
    const modes: Json = {};
    for (const mode of densityModes) {
      const alias = aliasOf(byMode[mode]);
      if (!alias) throw new Error(`Density token "${name}" (${mode}) isn't an alias`);
      modes[mode] = { $value: reference(alias), resolved: px(scaleValue(alias)) };
    }
    place(density, name, {
      $type: "dimension",
      $value: modes[densityDefault].$value,
      $description: tokens.density.$descriptions[name],
      $extensions: sterling({ figmaName: name, collection: "Density", cssVar: cssVar(name), modes }),
    });
  }

  const typography: Json = { $description: "Text styles. Each is a class in tokens.css, named in $extensions." };
  for (const [name, style] of entries(tokens.typography.styles)) {
    typography[name] = {
      $type: "typography",
      $value: {
        fontFamily: style.fontFamily ?? tokens.typography.fontFamily,
        fontSize: px(style.fontSize),
        fontWeight: WEIGHTS[style.fontStyle] ?? 400,
        letterSpacing: px(style.letterSpacing),
        lineHeight: round(style.lineHeight / style.fontSize, 4),
      },
      ...(style.description ? { $description: style.description } : {}),
      $extensions: sterling({
        figmaName: name,
        cssClass: `.${cssClass(`text-${name}`)}`,
        lineHeightPx: style.lineHeight,
        ...(style.tabularFigures ? { tabularFigures: true } : {}),
        ...(style.textDecoration ? { textDecoration: style.textDecoration } : {}),
      }),
    };
  }

  return {
    $description:
      "Sterling's design tokens in the Design Tokens (DTCG) format, version 2025.10. Group paths follow the token names " +
      "(surface/background is color.surface.background). The format has no modes, so each Color and Density token's $value " +
      `is its default mode (${colorDefault}, ${densityDefault}) and every mode is listed under $extensions["${EXTENSION}"].modes, ` +
      "with the value it resolves to. The same block gives the name in Figma and the CSS custom property or class.",
    $extensions: sterling({
      version: tokens.$meta.version,
      modes: { color: tokens.color.$modes, density: densityModes },
      defaultModes: { color: colorDefault, density: densityDefault },
      css: "tokens.css sets the default modes on :root, the other color mode under prefers-color-scheme and [data-theme], and each other density under a class (.stl-density-compact).",
    }),
    primitives,
    color,
    spacing: scale("spacing", "Spacing"),
    size: scale("size", "Size"),
    density,
    typography,
  };
}

// ---------------------------------------------------------------- index.json

/** The date of a version's release, from its CHANGELOG heading ("## [1.1.1] - 2026-10-11"). */
function releaseDate(version: string): string {
  const match = new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\] - (\\d{4}-\\d{2}-\\d{2})$`, "m").exec(read("CHANGELOG.md"));
  if (!match) throw new Error(`CHANGELOG.md has no dated heading for version ${version}`);
  return match[1];
}

function buildIndex(version: string, counts: { components: number; icons: number; sections: number; patterns: number }) {
  return {
    name: "Sterling",
    description: "A design system for data-dense applications: design tokens, a Figma library, and matching React components, built from one set of definitions.",
    version,
    // The date this version was released (from CHANGELOG.md), not the time the files were written.
    released: releaseDate(version),
    links: {
      export: AI_URL,
      storybook: STORYBOOK_URL,
      tokenReference: SITE_URL,
      figmaFile: FIGMA_FILE_URL,
      figmaCommunity: FIGMA_COMMUNITY_URL,
    },
    files: [
      {
        file: "components.json",
        url: `${AI_URL}components.json`,
        contains: `${counts.components} components and the ${counts.icons} icons: what each is for, when to use it, its Figma properties, its React props, and its links.`,
      },
      {
        file: "tokens.dtcg.json",
        url: `${AI_URL}tokens.dtcg.json`,
        contains: "Every token in the Design Tokens (DTCG) format: colors in Light and Dark, spacing, sizes, the three densities, and the text styles, each with its CSS name.",
      },
      {
        file: "guidelines.json",
        url: `${AI_URL}guidelines.json`,
        contains: `${counts.sections} guideline sections (the rules) and ${counts.patterns} patterns (complete compositions with numbered steps).`,
      },
    ],
    howToUse: [
      "Choose components from components.json: match the task to `description`, `useWhen`, and `dontUseWhen`. Use only components and icons that are listed; Sterling has no others.",
      "Follow a component's `related` entries into guidelines.json (by `id`) for the rules and patterns that apply to it.",
      "Build screens from the patterns in guidelines.json. Each pattern says when to use it and explains its parts step by step.",
      "In code, use the React component and props under `react`. Prop values are the strings listed; there is no `state` prop (see `states`).",
      "Style only with tokens from tokens.dtcg.json, through the CSS custom property or class named in each token's $extensions. Never write a raw color, size, or font value.",
      "Use the semantic color tokens (color.*), never the primitives, and never rely on color alone for meaning: pair it with an icon, a sign, or a label.",
      "All sample data in Sterling is fictional. Keep it that way in anything generated from these files.",
    ],
  };
}

// ---------------------------------------------------------------- the export

const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

/** Every file of the export, by name, as the exact text to write. */
export function buildExport(): Record<(typeof FILES)[number], string> {
  const tokens = JSON.parse(read("tokens/tokens.json"));
  const version = JSON.parse(read("package.json")).version as string;
  const components = buildComponents();
  const guidelines = buildGuidelines();
  return {
    "index.json": json(buildIndex(version, {
      components: components.components.length,
      icons: components.icons.names.length,
      sections: guidelines.sections.length,
      patterns: guidelines.patterns.length,
    })),
    "components.json": json(components),
    "tokens.dtcg.json": json(buildTokens(tokens)),
    "guidelines.json": json(guidelines),
  };
}
