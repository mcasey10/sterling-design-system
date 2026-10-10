// Shared token helpers for the repo scripts (contrast check, token site). No dependencies.
// Reads tokens/tokens.json, resolves Color aliases to hex per mode, and evaluates the WCAG
// contrast rules in tokens.json `contrast.rules`.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TOKENS_PATH = resolve(here, "../../tokens/tokens.json");

/** Minimum ratio per rule level; exempt pairs are reported only. */
export const THRESHOLDS = { body: 4.5, large: 3, ui: 3, exempt: null };

export function loadTokens(path = DEFAULT_TOKENS_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Entries of a token group without "$" metadata keys. */
export const entries = (group) => Object.entries(group).filter(([k]) => !k.startsWith("$"));

/** { "neutral/50": "#F7F8FA", ... } */
export function flattenPrimitives(tokens) {
  const out = {};
  for (const [ramp, steps] of Object.entries(tokens.primitives)) {
    for (const [step, hex] of Object.entries(steps)) out[`${ramp}/${step}`] = hex;
  }
  return out;
}

/** "{blue/600}" → "blue/600"; anything else → null. */
export const aliasOf = (raw) => /^\{(.+)\}$/.exec(String(raw))?.[1] ?? null;

/** Resolves a Color token for a mode to { hex, alias }. */
export function resolveColor(tokens, primitives, name, mode) {
  const token = tokens.color[name];
  if (!token || name.startsWith("$")) throw new Error(`Unknown color token: ${name}`);
  const raw = token[mode];
  if (raw === undefined) throw new Error(`Token ${name} has no value for mode ${mode}`);
  const alias = aliasOf(raw);
  if (!alias) return { hex: raw, alias: null };
  const hex = primitives[alias];
  if (!hex) throw new Error(`Token ${name} (${mode}) aliases unknown primitive ${alias}`);
  return { hex, alias };
}

export function luminance(hex) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Every foreground × background pair of every rule, in every Color mode:
 * [{ mode, rule, level, min, fg, bg, fgHex, bgHex, ratio, pass, exempt }]
 */
export function evaluateContrast(tokens) {
  const primitives = flattenPrimitives(tokens);
  const results = [];
  for (const mode of tokens.color.$modes) {
    for (const rule of tokens.contrast.rules) {
      const min = THRESHOLDS[rule.level];
      if (min === undefined) throw new Error(`Unknown level "${rule.level}" in rule "${rule.name}"`);
      for (const fg of rule.foreground) {
        for (const bg of rule.background) {
          const fgHex = resolveColor(tokens, primitives, fg, mode).hex;
          const bgHex = resolveColor(tokens, primitives, bg, mode).hex;
          const ratio = contrast(fgHex, bgHex);
          results.push({
            mode, rule: rule.name, level: rule.level, min, fg, bg, fgHex, bgHex, ratio,
            pass: min === null || ratio >= min, exempt: min === null,
          });
        }
      }
    }
  }
  return results;
}
