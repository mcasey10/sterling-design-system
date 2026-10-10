// Token CSS: turns tokens/tokens.json into CSS custom properties and text style classes, all with the stl-
// prefix (--stl-space-8, .stl-text-body). One generator, so the token site and the coded layer use the
// same file: `npm run tokens:css` writes dist/tokens.css, and `npm run tokens:site` inlines the same text.

import { entries, flattenPrimitives, aliasOf } from "./tokens.mjs";

/** "accent/default" → "accent-default" */
export const slug = (name) => name.replace(/[^a-zA-Z0-9]+/g, "-");
/**
 * Sterling's code prefix. Everything Sterling puts in the global CSS namespace carries it: custom
 * properties (--stl-space-8, --stl-color-text-primary) and classes (.stl-density-compact, .stl-text-body).
 */
export const PREFIX = "stl";
/** "space/8" → "--stl-space-8"; "color/text/primary" → "--stl-color-text-primary" */
export const cssVar = (name) => `--${PREFIX}-${slug(name)}`;
/** "density-compact" → "stl-density-compact" */
export const cssClass = (name) => `${PREFIX}-${slug(name).toLowerCase()}`;
const WEIGHTS = { Thin: 100, Light: 300, Regular: 400, Medium: 500, "Semi Bold": 600, Bold: 700, "Extra Bold": 800 };

/** The density mode :root uses: "Default" if the tokens have it, otherwise the first mode. */
export const defaultDensity = (tokens) => (tokens.density.$modes.includes("Default") ? "Default" : tokens.density.$modes[0]);

/** A Color value as CSS: var(--stl-blue-600) for aliases, the hex otherwise. */
const colorValue = (raw) => (aliasOf(raw) ? `var(${cssVar(aliasOf(raw))})` : raw);
/** A Density value as CSS: var(--stl-size-32) / var(--stl-space-8). */
const densityValue = (raw) => {
  const a = aliasOf(raw);
  if (!a) return `${raw}px`;
  return `var(${cssVar(a)})`;
};

/**
 * tokens.css: primitives, Color (first mode by default, second under prefers-color-scheme and
 * data-theme), spacing, size, Density (Default, plus a class per other mode), and the text style classes.
 */
export function buildTokenCss(tokens) {
  const primitives = flattenPrimitives(tokens);
  const [LIGHT, DARK] = tokens.color.$modes;
  const DENSITY_MODES = tokens.density.$modes;
  const DEFAULT_DENSITY = defaultDensity(tokens);
  const lines = ["/* Generated from tokens/tokens.json by scripts/lib/token-css.mjs. Do not edit; run `npm run tokens:css`. */", ""];
  lines.push(":root {", "  /* Primitives */");
  for (const [name, hex] of Object.entries(primitives)) lines.push(`  ${cssVar(name)}: ${hex};`);
  lines.push("", "  /* Spacing and radius */");
  for (const [name, v] of entries(tokens.spacing)) lines.push(`  ${cssVar(name)}: ${v}px;`);
  lines.push("", "  /* Size */");
  for (const [name, v] of entries(tokens.size)) lines.push(`  ${cssVar(name)}: ${v}px;`);
  lines.push("", `  /* Color: ${LIGHT} (default) */`);
  for (const [name, t] of entries(tokens.color)) lines.push(`  ${cssVar(`color/${name}`)}: ${colorValue(t[LIGHT])};`);
  lines.push("", `  /* Density: ${DEFAULT_DENSITY} (default) */`);
  for (const [name, t] of entries(tokens.density)) lines.push(`  ${cssVar(name)}: ${densityValue(t[DEFAULT_DENSITY])};`);
  lines.push(`  ${cssVar("font-family")}: "${tokens.typography.fontFamily}", system-ui, sans-serif;`, "}", "");

  const dark = entries(tokens.color).map(([name, t]) => `  ${cssVar(`color/${name}`)}: ${colorValue(t[DARK])};`);
  lines.push(`/* Color: ${DARK} — follows the OS unless data-theme is set */`);
  lines.push(`@media (prefers-color-scheme: dark) {`, `  :root:not([data-theme="light"]) {`, ...dark.map((l) => "  " + l), "  }", "}");
  lines.push(`:root[data-theme="dark"] {`, ...dark, "}", "");

  for (const mode of DENSITY_MODES) {
    if (mode === DEFAULT_DENSITY) continue;
    lines.push(`/* Density: ${mode} */`, `.${cssClass(`density-${mode}`)} {`);
    for (const [name, t] of entries(tokens.density)) lines.push(`  ${cssVar(name)}: ${densityValue(t[mode])};`);
    lines.push("}", "");
  }

  lines.push("/* Text styles */");
  for (const [name, s] of entries(tokens.typography.styles)) {
    const family = s.fontFamily ? `"${s.fontFamily}", ui-monospace, monospace` : `var(${cssVar("font-family")})`;
    lines.push(`.${cssClass(`text-${name}`)} {`);
    lines.push(`  font: ${WEIGHTS[s.fontStyle] ?? 400} ${s.fontSize}px/${s.lineHeight}px ${family};`);
    lines.push(`  letter-spacing: ${s.letterSpacing}px;`);
    if (s.tabularFigures) lines.push("  font-variant-numeric: tabular-nums;");
    lines.push("}");
  }
  return lines.join("\n") + "\n";
}
