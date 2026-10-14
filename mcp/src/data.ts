// The export, as bundled: a copy of ../ai made by scripts/build.mjs, with the shapes the tools rely on.
// The server reads nothing from disk at run time.

import componentsJson from "../data/components.json";
import guidelinesJson from "../data/guidelines.json";
import indexJson from "../data/index.json";
import metaJson from "../data/meta.json";
import tokensJson from "../data/tokens.dtcg.json";

export interface Related {
  type: string;
  name: string;
  file?: string;
  id?: string;
  url?: string;
}

export interface ComponentEntry {
  id: string;
  name: string;
  description: string;
  details: string;
  useWhen: string;
  dontUseWhen: string;
  related: Related[];
  figma: Record<string, unknown>;
  react: { component: string; source: string; props: { name: string; note?: string }[]; states: unknown[]; figmaOnly: unknown[] };
  storybook: string;
}

export interface IconEntry extends ComponentEntry {
  /** "Icon/check", "Icon/minus", … */
  names: string[];
}

export interface Section {
  id: string;
  name: string;
  summary: string;
  table?: { headers: string[]; rows: string[][] };
  rules: { term: string; text: string }[];
  doDont: { title: string; do: string; dont: string }[];
}

export interface Pattern {
  id: string;
  name: string;
  summary: string;
  useWhen: string;
  dontUseWhen: string;
  steps: { number: number; label: string; note: string }[];
}

/** A group or a token in the DTCG tree: a token has $value. */
export type TokenNode = { [key: string]: any };

export const META = metaJson as { version: string; exportVersion: string; released: string; hash: string };
/** How an application gets and uses the React components: the package, its styles, color mode, and density. */
export interface PackageInfo {
  name: string;
  install: string;
  note: string;
  styles: string[];
  stylesNote: string;
  components: string;
  types: string;
  colorMode: string;
  density: string;
}
export const INDEX = indexJson as {
  name: string; summary: string; version: string; released: string; howToUse: string[]; package: PackageInfo; llmsTxt: { guidance: string[] };
};
export const COMPONENTS = (componentsJson as { components: ComponentEntry[] }).components;
export const ICONS = (componentsJson as unknown as { icons: IconEntry }).icons;
export const SECTIONS = (guidelinesJson as { sections: Section[] }).sections;
export const PATTERNS = (guidelinesJson as { patterns: Pattern[] }).patterns;
export const TOKENS = tokensJson as TokenNode;
/** The key of Sterling's own data in a token's $extensions. */
export const EXTENSION = "io.github.mcasey10.sterling";
