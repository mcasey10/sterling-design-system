// Builds the variable collections from tokens.json. Idempotent: collections, modes, and
// variables are matched by name and updated in place, never duplicated.
//
// Alias structure: Color aliases Primitives (per Light/Dark mode); Density aliases the Size
// and Spacing scales (per Compact/Default/Comfortable mode). Density values are never raw
// numbers, so component sizing can't drift off-scale.

import { tokens, entries, aliasTarget, hexToRgb, ModeValues } from "./tokens";
import { created, updated, warn } from "./log";

export const COLLECTIONS = {
  primitives: "Primitives",
  color: "Color",
  spacing: "Spacing",
  size: "Size",
  density: "Density",
} as const;

/** Lookup of every variable Sterling owns, keyed by "Collection/variable/name". */
export type VariableIndex = Map<string, Variable>;

export interface KitVariables {
  vars: VariableIndex;
  /** Collection name → collection + the mode IDs that exist in this file. */
  collections: Map<string, CollectionContext>;
}

export interface CollectionContext {
  collection: VariableCollection;
  /** Mode name → modeId, for the modes that exist (may be fewer than requested). */
  modeIds: Map<string, string>;
  byName: Map<string, Variable>;
}

async function getCollection(name: string, modeNames: string[]): Promise<CollectionContext> {
  const existing = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === name);
  const collection = existing ?? figma.variables.createVariableCollection(name);
  if (existing) updated(`Collection ${name}`);
  else created(`Collection ${name}`);

  const modeIds = new Map<string, string>();
  modeNames.forEach((modeName, i) => {
    const match = collection.modes.find((m) => m.name === modeName);
    if (match) {
      modeIds.set(modeName, match.modeId);
      return;
    }
    // A new collection starts with one default mode ("Mode 1"): rename it to the first mode.
    const first = collection.modes[0];
    if (i === 0 && !modeNames.includes(first.name)) {
      collection.renameMode(first.modeId, modeName);
      modeIds.set(modeName, first.modeId);
      return;
    }
    try {
      modeIds.set(modeName, collection.addMode(modeName));
    } catch (e) {
      // Plans with a per-collection mode limit throw here. Keep going with the modes we have;
      // the remaining values stay in tokens.json.
      warn(
        `Could not add mode "${modeName}" to ${name} (${(e as Error).message}). ` +
          `Your Figma plan may limit modes per collection. Only these modes were created: ` +
          `${[...modeIds.keys()].join(", ")}. Values for "${modeName}" remain in tokens/tokens.json.`
      );
    }
  });

  const byName = new Map<string, Variable>();
  const all = await figma.variables.getLocalVariablesAsync();
  for (const v of all) if (v.variableCollectionId === collection.id) byName.set(v.name, v);

  return { collection, modeIds, byName };
}

function upsertVariable(
  ctx: CollectionContext,
  name: string,
  type: VariableResolvedDataType,
  scopes: VariableScope[]
): Variable | null {
  let variable = ctx.byName.get(name);
  if (variable && variable.resolvedType !== type) {
    warn(`${ctx.collection.name}/${name} exists as ${variable.resolvedType}, expected ${type}; left unchanged.`);
    return null;
  }
  if (!variable) {
    variable = figma.variables.createVariable(name, ctx.collection, type);
    ctx.byName.set(name, variable);
    created(`Variable ${ctx.collection.name}/${name}`);
  } else {
    updated(`Variable ${ctx.collection.name}/${name}`);
  }
  variable.scopes = scopes;
  return variable;
}

function colorScopes(name: string): VariableScope[] {
  if (name.startsWith("text/")) return ["TEXT_FILL"];
  if (name.startsWith("border/") || name.startsWith("focus/")) return ["STROKE_COLOR"];
  if (name.startsWith("surface/") || name.startsWith("selection/")) return ["FRAME_FILL", "SHAPE_FILL"];
  return ["ALL_FILLS", "STROKE_COLOR"];
}

function floatScopes(name: string): VariableScope[] {
  if (name.startsWith("radius/")) return ["CORNER_RADIUS"];
  if (/height|size/.test(name)) return ["WIDTH_HEIGHT"];
  return ["GAP"]; // padding and gaps
}

function warnUnknownVariables(ctx: CollectionContext, expected: Set<string>) {
  for (const name of ctx.byName.keys()) {
    if (!expected.has(name)) {
      warn(`${ctx.collection.name}/${name} is not in tokens.json. It was kept; delete it manually if unused.`);
    }
  }
}

async function buildPrimitives(index: VariableIndex): Promise<CollectionContext> {
  const ctx = await getCollection(COLLECTIONS.primitives, ["Value"]);
  const modeId = ctx.modeIds.get("Value")!;
  const expected = new Set<string>();
  for (const [ramp, steps] of Object.entries(tokens.primitives)) {
    for (const [step, hex] of Object.entries(steps)) {
      const name = `${ramp}/${step}`;
      expected.add(name);
      // Empty scopes hide primitives from property pickers, steering designers to semantic tokens.
      const v = upsertVariable(ctx, name, "COLOR", []);
      if (!v) continue;
      v.hiddenFromPublishing = true;
      v.setValueForMode(modeId, hexToRgb(hex));
      index.set(`${COLLECTIONS.primitives}/${name}`, v);
    }
  }
  warnUnknownVariables(ctx, expected);
  return ctx;
}

async function buildColor(index: VariableIndex): Promise<CollectionContext> {
  const modes = tokens.color.$modes;
  const ctx = await getCollection(COLLECTIONS.color, modes);
  const expected = new Set<string>();
  for (const [name, values] of entries<ModeValues<string>>(tokens.color)) {
    expected.add(name);
    const v = upsertVariable(ctx, name, "COLOR", colorScopes(name));
    if (!v) continue;
    for (const [modeName, modeId] of ctx.modeIds) {
      const value = values[modeName];
      const target = aliasTarget(value);
      if (target) {
        const primitive = index.get(`${COLLECTIONS.primitives}/${target}`);
        if (!primitive) {
          warn(`Color/${name} (${modeName}) aliases unknown primitive ${target}; skipped.`);
          continue;
        }
        v.setValueForMode(modeId, figma.variables.createVariableAlias(primitive));
      } else {
        v.setValueForMode(modeId, hexToRgb(value));
      }
    }
    index.set(`${COLLECTIONS.color}/${name}`, v);
  }
  warnUnknownVariables(ctx, expected);
  return ctx;
}

async function buildSpacing(index: VariableIndex): Promise<CollectionContext> {
  const ctx = await getCollection(COLLECTIONS.spacing, ["Value"]);
  const modeId = ctx.modeIds.get("Value")!;
  const expected = new Set<string>();
  for (const [name, value] of entries<number>(tokens.spacing)) {
    expected.add(name);
    const v = upsertVariable(ctx, name, "FLOAT", floatScopes(name));
    if (!v) continue;
    v.setValueForMode(modeId, value);
    index.set(`${COLLECTIONS.spacing}/${name}`, v);
  }
  warnUnknownVariables(ctx, expected);
  return ctx;
}

async function buildSize(index: VariableIndex): Promise<CollectionContext> {
  const ctx = await getCollection(COLLECTIONS.size, ["Value"]);
  const modeId = ctx.modeIds.get("Value")!;
  const expected = new Set<string>();
  for (const [name, value] of entries<number>(tokens.size)) {
    expected.add(name);
    const stroke = name.startsWith("stroke/");
    const description = stroke
      ? "Stroke width for borders, dividers, focus rings, and underlines."
      : "Fixed dimension. For heights that should follow the Density mode, use Density/* instead.";
    const v = upsertVariable(ctx, name, "FLOAT", stroke ? ["STROKE_FLOAT"] : ["WIDTH_HEIGHT"]);
    if (!v) continue;
    v.setValueForMode(modeId, value);
    if (v.description !== description) v.description = description;
    index.set(`${COLLECTIONS.size}/${name}`, v);
  }
  warnUnknownVariables(ctx, expected);
  return ctx;
}

/** Finds the scale variable a Density alias like "{size/32}" or "{space/6}" points to. */
function scaleVariable(index: VariableIndex, target: string): Variable | undefined {
  const collection = target.startsWith("size/") ? COLLECTIONS.size : COLLECTIONS.spacing;
  return index.get(`${collection}/${target}`);
}

async function buildDensity(index: VariableIndex): Promise<CollectionContext> {
  const ctx = await getCollection(COLLECTIONS.density, tokens.density.$modes);
  const expected = new Set<string>();
  for (const [name, values] of entries<ModeValues<string>>(tokens.density)) {
    expected.add(name);
    // Existing Density variables keep their IDs: only their per-mode values change, so every
    // component binding and instance keeps working.
    const v = upsertVariable(ctx, name, "FLOAT", floatScopes(name));
    if (!v) continue;
    for (const [modeName, modeId] of ctx.modeIds) {
      const raw = values[modeName];
      const target = typeof raw === "string" ? aliasTarget(raw) : null;
      const scale = target ? scaleVariable(index, target) : undefined;
      if (!scale) {
        warn(`Density/${name} (${modeName}) must alias a Size or Spacing variable; "${raw}" isn't one. Value left unchanged.`);
        continue;
      }
      const current = v.valuesByMode[modeId] as VariableAlias | number | undefined;
      const alreadyAliased = typeof current === "object" && current !== null && current.id === scale.id;
      if (!alreadyAliased) v.setValueForMode(modeId, figma.variables.createVariableAlias(scale));
    }
    index.set(`${COLLECTIONS.density}/${name}`, v);
  }
  warnUnknownVariables(ctx, expected);
  return ctx;
}

/**
 * Safety check: logs every Density variable's alias per mode and warns if any value is a raw
 * number (or an alias outside the Size / Spacing scales).
 */
export async function checkDensityAliases(ctx: CollectionContext): Promise<void> {
  const lines: string[] = [];
  let raw = 0;
  for (const [name, v] of ctx.byName) {
    const parts: string[] = [];
    for (const [modeName, modeId] of ctx.modeIds) {
      const value = v.valuesByMode[modeId];
      if (typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS") {
        const target = await figma.variables.getVariableByIdAsync(value.id);
        const collection = target && (await figma.variables.getVariableCollectionByIdAsync(target.variableCollectionId));
        const ok = collection && (collection.name === COLLECTIONS.size || collection.name === COLLECTIONS.spacing);
        parts.push(`${modeName} → ${target ? target.name : "?"}`);
        if (!ok) {
          raw++;
          warn(`Density/${name} (${modeName}) aliases a variable outside the Size / Spacing scales.`);
        }
      } else {
        raw++;
        parts.push(`${modeName} = ${String(value)} (RAW)`);
        warn(`Density/${name} (${modeName}) is a raw number (${String(value)}), not an alias.`);
      }
    }
    lines.push(`  ${name}: ${parts.join(" · ")}`);
  }
  console.log(`[sterling] Density aliases (${raw === 0 ? "all values are aliases" : `${raw} raw value(s)`}):\n${lines.join("\n")}`);
}

/** Creates or updates all collections. Scales come first so Color and Density can alias them. */
export async function buildVariables(): Promise<KitVariables> {
  const vars: VariableIndex = new Map();
  const collections = new Map<string, CollectionContext>();
  collections.set(COLLECTIONS.primitives, await buildPrimitives(vars));
  collections.set(COLLECTIONS.color, await buildColor(vars));
  collections.set(COLLECTIONS.spacing, await buildSpacing(vars));
  collections.set(COLLECTIONS.size, await buildSize(vars));
  // Density last: it aliases Size and Spacing.
  const densityCtx = await buildDensity(vars);
  collections.set(COLLECTIONS.density, densityCtx);
  await checkDensityAliases(densityCtx);
  return { vars, collections };
}
