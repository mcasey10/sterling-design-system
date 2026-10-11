// In-place ("ensure") builders for component internals and the Components page.
// Children are matched by layer name and type and updated rather than recreated,
// so node IDs stay stable across reruns and instance overrides survive.

import { Kit, FrameOptions, configureFrame, color, bindFill, bindStroke, bindRadius, recolor, space, PLUGIN_KEY, setDescription } from "./helpers";
import { created, updated, warn } from "./log";
import { componentDef, propertyDef } from "../../../definitions/components";

type Parent = BaseNode & ChildrenMixin;

function findChild<T extends SceneNode>(parent: Parent, name: string, type: T["type"]): T | undefined {
  return parent.children.find((c) => c.name === name && c.type === type) as T | undefined;
}

function place(parent: Parent, node: SceneNode, index?: number) {
  if (index === undefined) return;
  const clamped = Math.min(index, parent.children.length - 1);
  if (parent.children.indexOf(node) !== clamped) parent.insertChild(clamped, node);
}

export function ensureFrame(parent: Parent, name: string, opts: FrameOptions, index?: number): FrameNode {
  let f = findChild<FrameNode>(parent, name, "FRAME");
  if (!f) {
    f = figma.createFrame();
    f.name = name;
    parent.appendChild(f);
  }
  configureFrame(f, opts);
  place(parent, f, index);
  return f;
}

/** Text layer matched by name. Characters bound to a component property are left alone. */
export async function ensureText(
  kit: Kit,
  parent: Parent,
  name: string,
  chars: string,
  style: string,
  colorName: string,
  index?: number
): Promise<TextNode> {
  let t = findChild<TextNode>(parent, name, "TEXT");
  if (!t) {
    t = figma.createText();
    t.name = name;
    parent.appendChild(t);
  }
  if (t.getPluginData(PLUGIN_KEY) !== "generated") t.setPluginData(PLUGIN_KEY, "generated");
  const s = kit.styles.get(style);
  if (s) {
    if (t.textStyleId !== s.id) await t.setTextStyleIdAsync(s.id);
  } else {
    await figma.loadFontAsync(t.fontName as FontName);
  }
  if (!t.componentPropertyReferences?.characters && t.characters !== chars) t.characters = chars;
  if (t.autoRename) t.autoRename = false;
  bindFill(t, color(kit, colorName));
  place(parent, t, index);
  return t;
}

/** Instance matched by name; swapped if it points at a different main component. */
export async function ensureInstance(
  parent: Parent,
  name: string,
  main: ComponentNode,
  index?: number
): Promise<InstanceNode> {
  let inst = findChild<InstanceNode>(parent, name, "INSTANCE");
  if (!inst) {
    inst = main.createInstance();
    inst.name = name;
    parent.appendChild(inst);
  } else if (!inst.componentPropertyReferences?.mainComponent) {
    // Only swap when the main component changed and no instance-swap property owns it.
    const current = await inst.getMainComponentAsync();
    if (current?.id !== main.id) inst.swapComponent(main);
  }
  place(parent, inst, index);
  return inst;
}

/** Removes generated children that are not in `keep` (stale layers from earlier versions). */
export function prune(parent: Parent, keep: SceneNode[]) {
  for (const c of [...parent.children]) if (!keep.includes(c)) c.remove();
}

/** Recolors every "Glyph" layer of an icon instance (strokes and/or fills, whichever it uses). */
export function tintIcon(instance: InstanceNode, variable: Variable) {
  for (const g of instance.findAll((n) => n.name === "Glyph")) recolor(g as VectorNode, variable);
}

// ------------------------------------------------------------ Component properties

/** Adds a component property, or updates the existing one with the same name and type. Returns its key. */
export function ensureProp(
  owner: ComponentSetNode | ComponentNode,
  name: string,
  type: "TEXT" | "BOOLEAN" | "INSTANCE_SWAP",
  defaultValue: string | boolean,
  preferredValues?: InstanceSwapPreferredValue[],
  previousNames: string[] = []
): string {
  const defs = owner.componentPropertyDefinitions;
  const find = (n: string) => Object.keys(defs).find((k) => k.split("#")[0] === n && defs[k].type === type);
  let key = find(name);
  // Renamed property: rename the existing one in place. Its ID suffix is kept, so instance
  // overrides survive (Figma has no property aliases).
  const old = key ? undefined : previousNames.map(find).find(Boolean);
  if (old) {
    key = owner.editComponentProperty(old, { name });
    updated(`Renamed property ${owner.name} / ${old.split("#")[0]} → ${name}`);
  }
  if (key) {
    // Written on every run, changed or not: rewriting a text default returns each bound layer to its own
    // text style (see ensureComponentSet), which keeps variants from sharing one variant's styling.
    return owner.editComponentProperty(key, preferredValues ? { defaultValue, preferredValues } : { defaultValue });
  }
  return owner.addComponentProperty(name, type, defaultValue, preferredValues ? { preferredValues } : undefined);
}

/** A component's variant properties and their values, from definitions/components.ts, ready for combos(). */
export const variantAxes = (component: string) => componentDef(component).variants;

/**
 * Adds (or updates) a property that definitions/components.ts declares for `owner` (looked up by the owner's
 * name), with the declared type and default. Throws if the definition doesn't list it, so the definitions stay
 * the one place properties are named. For an instance-swap property, pass the default component's ID and the
 * components it may swap to; the definition names the default icon, and the caller resolves it to a node.
 */
export function defineProp(
  owner: ComponentSetNode | ComponentNode,
  name: string,
  swap?: { defaultId: string; preferredValues: InstanceSwapPreferredValue[] }
): string {
  const def = propertyDef(owner.name, name);
  if (def.type === "INSTANCE_SWAP") {
    if (!swap) throw new Error(`${owner.name} / ${name} is an instance-swap property; pass its default and preferred values.`);
    return ensureProp(owner, name, "INSTANCE_SWAP", swap.defaultId, swap.preferredValues);
  }
  if (def.type === "SLOT") throw new Error(`${owner.name} / ${name} is a slot; slots are created with createSlot(), not as properties.`);
  return ensureProp(owner, name, def.type, def.default as string | boolean);
}

// ------------------------------------------------------------ Component sets

export type Props = Record<string, string>;

export function variantName(props: Props): string {
  return Object.entries(props)
    .map(([k, val]) => `${k}=${val}`)
    .join(", ");
}

export interface ComponentSetSpec {
  name: string;
  /** Earlier names; an existing set found under one is renamed in place (instances stay linked). */
  previousNames?: string[];
  description: string;
  /** Every variant, in display order. */
  variants: Props[];
  /**
   * Maps a variant to the name(s) it had in earlier versions (a property added, renamed, or a
   * value renamed), so the existing variant node is renamed in place and its instances stay
   * linked with the same variant selected. Figma has no property aliases, so this is how renames work.
   */
  legacyVariantName?: (props: Props) => string | (string | undefined)[] | undefined;
  /** Variant property laid out as columns; the other properties form rows. "" stacks every variant in one column. */
  columnProp: string;
  /** Builds or updates one variant's contents in place. */
  build: (comp: ComponentNode, props: Props) => Promise<void>;
  /** Adds component properties and references once the set exists. */
  wire?: (set: ComponentSetNode, variants: ComponentNode[]) => void;
}

const SET_PAD = 16;
const SET_GAP = 16;

function layoutVariants(set: ComponentSetNode, comps: ComponentNode[], variants: Props[], columnProp: string) {
  const colOf = (p: Props) => p[columnProp];
  const rowOf = (p: Props) =>
    Object.keys(p)
      .filter((k) => k !== columnProp)
      .map((k) => `${k}=${p[k]}`)
      .join(", ");
  const cols = [...new Set(variants.map(colOf))];
  const rows = [...new Set(variants.map(rowOf))];
  const colW = cols.map((c) => Math.max(...comps.filter((_, i) => colOf(variants[i]) === c).map((n) => n.width)));
  // Absolutely positioned overlays (e.g. the open Select's menu) extend below the variant; count them
  // so the next row doesn't overlap. Focus rings are excluded (the gap already covers them).
  const extent = (n: ComponentNode) => {
    const top = n.absoluteBoundingBox?.y ?? 0;
    const overlays = n.findAll(
      (c) => "layoutPositioning" in c && c.layoutPositioning === "ABSOLUTE" && c.name !== "Focus ring"
    );
    return Math.max(n.height, ...overlays.map((c) => (c.absoluteBoundingBox ? c.absoluteBoundingBox.y + c.absoluteBoundingBox.height - top : 0)));
  };
  const rowH = rows.map((r) => Math.max(...comps.filter((_, i) => rowOf(variants[i]) === r).map(extent)));
  comps.forEach((comp, i) => {
    const c = cols.indexOf(colOf(variants[i]));
    const r = rows.indexOf(rowOf(variants[i]));
    comp.x = SET_PAD + colW.slice(0, c).reduce((a, b) => a + b + SET_GAP, 0);
    comp.y = SET_PAD + rowH.slice(0, r).reduce((a, b) => a + b + SET_GAP, 0);
  });
  const width = SET_PAD * 2 + colW.reduce((a, b) => a + b, 0) + SET_GAP * (cols.length - 1);
  const height = SET_PAD * 2 + rowH.reduce((a, b) => a + b, 0) + SET_GAP * (rows.length - 1);
  set.resizeWithoutConstraints(width, height);
}

export function findComponentSet(page: PageNode, name: string): ComponentSetNode | undefined {
  return page.findOne((n) => n.type === "COMPONENT_SET" && n.name === name) as ComponentSetNode | undefined;
}

export function findComponent(page: PageNode, name: string): ComponentNode | undefined {
  return page.findOne((n) => n.type === "COMPONENT" && n.name === name) as ComponentNode | undefined;
}

/**
 * Creates the component set on first run; afterwards updates each variant in place
 * (matched by variant name) and adds any variants that are new in the spec.
 * If the user moved the set elsewhere on the page, it stays where it is.
 */
export async function ensureComponentSet(
  kit: Kit,
  page: PageNode,
  parent: FrameNode,
  index: number,
  spec: ComponentSetSpec
): Promise<ComponentSetNode> {
  let set = findComponentSet(page, spec.name);
  for (const old of spec.previousNames ?? []) {
    if (set) break;
    set = findComponentSet(page, old);
    if (set) {
      set.name = spec.name;
      updated(`Renamed ${old} → ${spec.name}`);
    }
  }
  // Figma stores styling with a text property: a text style or decoration written on one variant's bound
  // layer is copied to every variant that shares the property. Rewriting the property's default clears that
  // and returns each layer to its own text style, so it is done before the variants are rebuilt (and again
  // when the property is wired). For the same reason, never write a decoration on a bound text layer: use a
  // text style that has it (Label-link, Body-link).
  if (set) {
    for (const [key, def] of Object.entries(set.componentPropertyDefinitions)) {
      if (def.type === "TEXT") set.editComponentProperty(key, { defaultValue: def.defaultValue });
    }
  }
  const comps: ComponentNode[] = [];
  for (const props of spec.variants) {
    const name = variantName(props);
    const raw = set ? spec.legacyVariantName?.(props) : undefined;
    const legacy = (Array.isArray(raw) ? raw : [raw]).filter((n): n is string => !!n);
    if (set && legacy.length && !set.children.some((c) => c.name === name)) {
      const old = set.children.find((c) => c.type === "COMPONENT" && legacy.includes(c.name));
      if (old) {
        updated(`Renamed variant ${spec.name} / ${old.name} → ${name}`);
        old.name = name;
      }
    }
    let comp = set?.children.find((c) => c.type === "COMPONENT" && c.name === name) as ComponentNode | undefined;
    if (!comp) {
      comp = figma.createComponent();
      comp.name = name;
      (set ?? parent).appendChild(comp);
      if (set) created(`Variant ${spec.name} / ${name}`);
    }
    await spec.build(comp, props);
    comps.push(comp);
  }

  if (!set) {
    set = figma.combineAsVariants(comps, parent, index);
    set.name = spec.name;
    created(`Component ${spec.name} (${comps.length} variants)`);
  } else {
    updated(`Component ${spec.name}`);
    if (set.parent === parent) {
      const i = Math.min(index, parent.children.length - 1);
      if (parent.children.indexOf(set) !== i) parent.insertChild(i, set);
    }
    for (const c of set.children) {
      if (!comps.includes(c as ComponentNode)) {
        warn(`${spec.name} has a variant not in the spec ("${c.name}"); kept. Delete it manually if unused.`);
      }
    }
  }

  setDescription(set, spec.description);
  if (set.getPluginData(PLUGIN_KEY) !== "generated") set.setPluginData(PLUGIN_KEY, "generated");
  bindFill(set, color(kit, "surface/panel"));
  bindStroke(set, color(kit, "border/default"));
  if (set.dashPattern.join() !== "4,4") set.dashPattern = [4, 4];
  bindRadius(set, space(kit, "radius/md"));
  spec.wire?.(set, comps);
  layoutVariants(set, comps, spec.variants, spec.columnProp);
  return set;
}

/** A single (non-variant) component, created on first run and updated in place afterwards. */
export function ensureComponent(
  page: PageNode,
  parent: FrameNode,
  index: number,
  name: string,
  description: string,
  previousNames: string[] = []
): ComponentNode {
  let comp = findComponent(page, name);
  for (const old of previousNames) {
    if (comp) break;
    comp = findComponent(page, old);
    if (comp) {
      comp.name = name;
      updated(`Renamed ${old} → ${name}`);
    }
  }
  if (!comp) {
    comp = figma.createComponent();
    comp.name = name;
    parent.appendChild(comp);
    created(`Component ${name}`);
  } else {
    updated(`Component ${name}`);
  }
  if (comp.parent === parent) {
    const i = Math.min(index, parent.children.length - 1);
    if (parent.children.indexOf(comp) !== i) parent.insertChild(i, comp);
  }
  setDescription(comp, description);
  if (comp.getPluginData(PLUGIN_KEY) !== "generated") comp.setPluginData(PLUGIN_KEY, "generated");
  return comp;
}

/** References a component property from a (possibly nested) layer, by layer name. */
export function reference(
  owner: ComponentNode,
  layerName: string,
  field: "characters" | "visible" | "mainComponent",
  key: string
) {
  const node = owner.findOne((n) => n.name === layerName);
  if (!node) return;
  const refs = node.componentPropertyReferences ?? {};
  if (refs[field] !== key) node.componentPropertyReferences = { ...refs, [field]: key };
}

/** The variant of a set matching `props` (keys in the set's declaration order). */
export function variantOf(set: ComponentSetNode, props: Props): ComponentNode {
  const name = variantName(props);
  const comp = set.children.find((c) => c.type === "COMPONENT" && c.name === name);
  if (!comp) throw new Error(`${set.name} has no variant "${name}"`);
  return comp as ComponentNode;
}

/**
 * Sets instance properties by name ("Label", "Tone", ...), writing only values that
 * differ so reruns leave unchanged instances untouched.
 */
export function setProps(inst: InstanceNode, values: Record<string, string | boolean>) {
  const props = inst.componentProperties;
  const update: Record<string, string | boolean> = {};
  for (const [name, value] of Object.entries(values)) {
    const key = Object.keys(props).find((k) => k === name || k.split("#")[0] === name);
    if (!key) {
      warn(`Instance "${inst.name}" has no property "${name}"; skipped.`);
      continue;
    }
    if (props[key].value !== value) update[key] = value;
  }
  if (Object.keys(update).length) inst.setProperties(update);
}

/** First nested instance with the given layer name. */
export function nested(inst: InstanceNode, name: string): InstanceNode | undefined {
  return inst.findOne((n) => n.type === "INSTANCE" && n.name === name) as InstanceNode | undefined;
}

/** Cartesian product of variant property values, in declaration order. */
export function combos(axes: Record<string, readonly string[]>): Props[] {
  return Object.entries(axes).reduce<Props[]>(
    (acc, [key, values]) =>
      acc.reduce<Props[]>((out, p) => out.concat(values.map((val) => ({ ...p, [key]: val }))), []),
    [{}]
  );
}

/**
 * Focus indicator: a 2px focus/ring outline drawn as an absolutely positioned layer, so it never
 * shifts auto layout. "outside" sits 3px outside the control (buttons, chips, checkbox, input
 * fields); "inside" sits on the edge (grid cells, tabs, which touch their neighbours); "inset" sits
 * 1px further in, inside a flagged cell's warning/error border so both stay visible. Pass on=false
 * to remove it from non-focus variants. `comp` can also be a frame inside a component (an input's Field).
 */
export function ensureFocusRing(
  kit: Kit,
  comp: ComponentNode | FrameNode,
  on: boolean,
  radius: Variable | null,
  placement: "outside" | "inside" | "inset" = "outside"
): FrameNode | null {
  let ring = comp.findChild((n) => n.name === "Focus ring" && n.type === "FRAME") as FrameNode | null;
  if (!on) {
    ring?.remove();
    return null;
  }
  if (!ring) {
    ring = figma.createFrame();
    ring.name = "Focus ring";
    comp.appendChild(ring);
  }
  if (ring.getPluginData(PLUGIN_KEY) !== "generated") ring.setPluginData(PLUGIN_KEY, "generated");
  if (ring.layoutPositioning !== "ABSOLUTE") ring.layoutPositioning = "ABSOLUTE";
  if (!Array.isArray(ring.fills) || ring.fills.length) ring.fills = [];
  bindStroke(ring, color(kit, "focus/ring"), 2);
  if (radius) bindRadius(ring, radius);
  const offset = placement === "outside" ? 3 : placement === "inset" ? -1 : 0;
  const w = comp.width + offset * 2;
  const h = comp.height + offset * 2;
  if (ring.width !== w || ring.height !== h) ring.resize(w, h);
  if (ring.x !== -offset) ring.x = -offset;
  if (ring.y !== -offset) ring.y = -offset;
  if (ring.constraints.horizontal !== "STRETCH" || ring.constraints.vertical !== "STRETCH") {
    ring.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
  }
  if (ring.clipsContent) ring.clipsContent = false;
  // Keep it on top of the control's content.
  if (comp.children.indexOf(ring) !== comp.children.length - 1) comp.appendChild(ring);
  return ring;
}
