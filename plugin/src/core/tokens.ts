// Typed access to ../../../tokens/tokens.json (bundled by esbuild at build time).
// Keys starting with "$" are metadata ($modes, $notes, $descriptions) and are skipped by the helpers.

import raw from "../../../tokens/tokens.json";

export type Hex = string;
export type ModeValues<T> = Record<string, T>;

export interface TextStyleToken {
  fontSize: number;
  lineHeight: number;
  fontStyle: string;
  letterSpacing: number;
  tabularFigures?: boolean;
  /** "underline" for link text styles: the underline is part of the style, never written on a layer. */
  textDecoration?: "underline";
  /** Extra text appended to the generated style description. */
  description?: string;
  /** Overrides typography.fontFamily for this style (e.g. a monospace Code style). */
  fontFamily?: string;
}

export interface Tokens {
  primitives: Record<string, Record<string, Hex>>;
  color: { $modes: string[] } & Record<string, unknown>;
  spacing: Record<string, number>;
  size: Record<string, number>;
  density: { $modes: string[] } & Record<string, unknown>;
  typography: { fontFamily: string; styles: Record<string, TextStyleToken> };
}

export const tokens = raw as unknown as Tokens;

/** Token groups whose variables are published, each with a "$descriptions" map in tokens.json. */
export type PublishedGroup = "color" | "spacing" | "size" | "density";

/**
 * The description of a published token, from its group's "$descriptions" ("" if there is none, which
 * `npm run check:tokens` and the library checks both report).
 */
export function describeToken(group: PublishedGroup, name: string): string {
  const descriptions = (tokens[group] as unknown as { $descriptions?: Record<string, string> }).$descriptions;
  return descriptions?.[name] ?? "";
}

/** Entries of a token group, excluding "$" metadata keys. */
export function entries<T>(group: Record<string, unknown>): [string, T][] {
  return Object.keys(group)
    .filter((k) => !k.startsWith("$"))
    .map((k) => [k, group[k] as T]);
}

/** Returns the primitive name for an alias like "{neutral/50}", or null for a literal. */
export function aliasTarget(value: string): string | null {
  const m = /^\{(.+)\}$/.exec(value);
  return m ? m[1] : null;
}

/** Resolves a Color token to its hex value in a mode, plus the primitive it aliases (if any). */
export function resolveColor(name: string, mode: string): { hex: Hex; alias: string | null } {
  const value = (tokens.color[name] as ModeValues<string>)[mode];
  const alias = aliasTarget(value);
  if (!alias) return { hex: value, alias: null };
  const [ramp, step] = alias.split("/");
  return { hex: tokens.primitives[ramp][step], alias };
}

export function hexToRgb(hex: Hex): RGB | RGBA {
  const n = hex.replace("#", "");
  const rgb = {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
  // An 8-digit hex (#RRGGBBAA) carries opacity: the alpha/* primitives behind surface/scrim.
  return n.length === 8 ? { ...rgb, a: parseInt(n.slice(6, 8), 16) / 255 } : rgb;
}
