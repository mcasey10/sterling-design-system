// The tokens, read straight from tokens/tokens.json (the source of truth), with the helpers the
// Foundations pages and the Storybook toolbar need. CSS names come from the same rule the generator uses.

import raw from "../../tokens/tokens.json";
import { cssClass, cssVar } from "../../scripts/lib/token-names.mjs";

type Group<T> = Record<string, T>;
type Modes = Record<string, string>;
export interface TextStyle {
  fontSize: number;
  lineHeight: number;
  fontStyle: string;
  letterSpacing: number;
  tabularFigures?: boolean;
  fontFamily?: string;
}

/** A token group's entries, without its "$" metadata keys ($modes, $notes, $descriptions). */
function entries<T>(group: object): [string, T][] {
  return Object.entries(group as Group<T>).filter(([name]) => !name.startsWith("$"));
}
const descriptions = (group: object): Group<string> => (group as { $descriptions?: Group<string> }).$descriptions ?? {};

export const VERSION: string = raw.$meta.version;
export const COLOR_MODES: readonly string[] = raw.color.$modes;
export const DENSITY_MODES: readonly string[] = raw.density.$modes;
export const DEFAULT_DENSITY = DENSITY_MODES.includes("Default") ? "Default" : DENSITY_MODES[0];

export const PRIMITIVES: [string, [string, string][]][] = Object.entries(raw.primitives).map(([ramp, steps]) => [
  ramp,
  Object.entries(steps),
]);
export const COLORS = entries<Modes>(raw.color);
export const SPACING = entries<number>(raw.spacing);
export const SIZES = entries<number>(raw.size);
export const DENSITY = entries<Modes>(raw.density);
export const TEXT_STYLES = entries<TextStyle>(raw.typography.styles);
export const DESCRIPTIONS = {
  color: descriptions(raw.color),
  spacing: descriptions(raw.spacing),
  size: descriptions(raw.size),
  density: descriptions(raw.density),
};

/** "{blue/600}" → "blue/600"; a raw value → null. */
export const aliasOf = (value: string | number): string | null => /^\{(.+)\}$/.exec(String(value))?.[1] ?? null;

/** "space/8" → "--stl-space-8" */
export const tokenVar = (name: string): string => cssVar(name);
/** "text/primary" → "--stl-color-text-primary" */
export const colorVar = (name: string): string => cssVar(`color/${name}`);
/** "Compact" → "stl-density-compact" */
export const densityClass = (mode: string): string => cssClass(`density-${mode}`);
/** "Body-strong" → "stl-text-body-strong" */
export const textClass = (style: string): string => cssClass(`text-${style}`);
