// Creates or updates the Inter text styles by name.
//
// API limitation: TextStyle has no setter for OpenType features, so tabular figures
// ("tnum") cannot be enabled on the Numeric style from a plugin. The style description
// (from tokens.json) says how to turn it on by hand. Every property is written only when it
// differs, so settings made by hand in Figma (like that one) survive reruns.

import { tokens, TextStyleToken } from "./tokens";
import { created, updated, warn } from "./log";

export type TextStyleIndex = Map<string, TextStyle>;

export async function buildTextStyles(): Promise<TextStyleIndex> {
  const family = tokens.typography.fontFamily;
  const index: TextStyleIndex = new Map();
  const existing = await figma.getLocalTextStylesAsync();

  for (const [name, spec] of Object.entries<TextStyleToken>(tokens.typography.styles)) {
    const fontName: FontName = { family: spec.fontFamily ?? family, style: spec.fontStyle };
    try {
      await figma.loadFontAsync(fontName);
    } catch {
      warn(`Font ${fontName.family} ${spec.fontStyle} is not available; text style "${name}" skipped. Install it and rerun.`);
      continue;
    }

    let style = existing.find((s) => s.name === name);
    if (style) updated(`Text style ${name}`);
    else {
      style = figma.createTextStyle();
      style.name = name;
      created(`Text style ${name}`);
    }

    if (style.fontName.family !== fontName.family || style.fontName.style !== fontName.style) style.fontName = fontName;
    if (style.fontSize !== spec.fontSize) style.fontSize = spec.fontSize;
    const lh = style.lineHeight;
    if (lh.unit !== "PIXELS" || lh.value !== spec.lineHeight) style.lineHeight = { unit: "PIXELS", value: spec.lineHeight };
    const ls = style.letterSpacing;
    if (ls.unit !== "PIXELS" || ls.value !== spec.letterSpacing) {
      style.letterSpacing = { unit: "PIXELS", value: spec.letterSpacing };
    }
    const decoration = spec.textDecoration === "underline" ? "UNDERLINE" : "NONE";
    if (style.textDecoration !== decoration) style.textDecoration = decoration;
    const description =
      `${spec.fontSize}/${spec.lineHeight} ${fontName.family} ${spec.fontStyle}${spec.textDecoration ? ", underlined" : ""}. Generated from tokens.json.` +
      (spec.description ? ` ${spec.description}` : "");
    if (style.description !== description) style.description = description;
    index.set(name, style);
  }
  return index;
}
