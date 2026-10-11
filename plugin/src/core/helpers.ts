// Shared node helpers. Every fill, stroke, padding, gap, and radius on generated
// nodes goes through these so it is bound to a variable rather than hard-coded.

import type { KitVariables } from "./variables";
import type { TextStyleIndex } from "./textStyles";
import { created, updated, warn } from "./log";

export const PLUGIN_KEY = "sterling";

export interface Kit extends KitVariables {
  styles: TextStyleIndex;
}

/** Looks up a variable by "Collection/name"; throws if it is missing so bad names fail loudly. */
export function v(kit: Kit, key: string): Variable {
  const variable = kit.vars.get(key);
  if (!variable) throw new Error(`Variable not found: ${key}`);
  return variable;
}
export const color = (kit: Kit, name: string) => v(kit, `Color/${name}`);
export const space = (kit: Kit, name: string) => v(kit, `Spacing/${name}`);
export const density = (kit: Kit, name: string) => v(kit, `Density/${name}`);
export const size = (kit: Kit, name: string) => v(kit, `Size/${name}`);

export type Num = number | Variable;

export function solid(variable: Variable): SolidPaint {
  const paint: SolidPaint = { type: "SOLID", color: { r: 0, g: 0, b: 0 } };
  return figma.variables.setBoundVariableForPaint(paint, "color", variable);
}

/** True if paints is exactly one visible, opaque solid bound to `variable`. */
function isBoundSolid(paints: ReadonlyArray<Paint> | PluginAPI["mixed"], variable: Variable): boolean {
  if (!Array.isArray(paints) || paints.length !== 1) return false;
  const p = paints[0] as SolidPaint;
  return (
    p.type === "SOLID" &&
    p.visible !== false &&
    (p.opacity ?? 1) === 1 &&
    p.boundVariables?.color?.id === variable.id
  );
}

// The setters below skip writes when the node already has the requested value, so a
// rerun leaves unchanged nodes untouched (rewriting identical bound paints and modes on
// existing nodes has caused Figma to render them black).

export function bindFill(node: MinimalFillsMixin, variable: Variable | null) {
  if (variable) {
    if (!isBoundSolid(node.fills, variable)) node.fills = [solid(variable)];
  } else if (!Array.isArray(node.fills) || node.fills.length) {
    node.fills = [];
  }
}

/** Recolors whichever paints a shape already uses (strokes and/or fills), skipping unchanged ones. */
export function recolor(shape: MinimalFillsMixin & MinimalStrokesMixin, variable: Variable) {
  if (shape.strokes.length && !isBoundSolid(shape.strokes, variable)) shape.strokes = [solid(variable)];
  if (Array.isArray(shape.fills) && shape.fills.length && !isBoundSolid(shape.fills, variable)) {
    shape.fills = [solid(variable)];
  }
}

/** Stroke-width variables (Size/stroke/N) keyed by width; set once per run by useStrokeScale. */
const strokeScale = new Map<number, Variable>();

/** Registers Sterling's stroke-width variables so bindStroke binds 1px / 2px weights to them. */
export function useStrokeScale(kit: { vars: Map<string, Variable> }) {
  strokeScale.clear();
  for (const [key, v] of kit.vars) {
    const m = /^Size\/stroke\/(\d+)$/.exec(key);
    if (m) strokeScale.set(Number(m[1]), v);
  }
}

export function bindStroke(
  node: MinimalStrokesMixin & IndividualStrokesMixin,
  variable: Variable,
  sides: { top?: number; right?: number; bottom?: number; left?: number } | number = 1
) {
  if (!isBoundSolid(node.strokes, variable)) node.strokes = [solid(variable)];
  if (node.strokeAlign !== "INSIDE") node.strokeAlign = "INSIDE";
  const w = typeof sides === "number" ? { top: sides, right: sides, bottom: sides, left: sides } : sides;
  const fields: [VariableBindableNodeField, number][] = [
    ["strokeTopWeight", w.top ?? 0],
    ["strokeRightWeight", w.right ?? 0],
    ["strokeBottomWeight", w.bottom ?? 0],
    ["strokeLeftWeight", w.left ?? 0],
  ];
  // Bind widths that exist on the stroke scale (1px, 2px); zero sides stay literal.
  for (const [field, width] of fields) setNum(node as unknown as SceneNode, field, strokeScale.get(width) ?? width);
}

type Bindable = SceneNode & { setBoundVariable(f: VariableBindableNodeField, v: Variable | null): void };

/** Sets a numeric field to a literal (clearing any binding) or binds it to a variable. */
function boundId(node: SceneNode, field: string): string | undefined {
  const bv = (node as Bindable).boundVariables as Record<string, VariableAlias | undefined> | undefined;
  return bv?.[field]?.id;
}

export function setNum(node: SceneNode, field: VariableBindableNodeField, value: Num) {
  const b = node as Bindable;
  const current = boundId(node, field);
  if (typeof value === "number") {
    if (current) b.setBoundVariable(field, null);
    const rec = node as unknown as Record<string, number>;
    if (rec[field] !== value) rec[field] = value;
  } else if (current !== value.id) {
    b.setBoundVariable(field, value);
  }
}

/** Sets width/height to literals or variables. Literal sizes clear bindings first. */
export function setSize(node: SceneNode & LayoutMixin, width: Num, height: Num) {
  const b = node as Bindable;
  for (const [field, value] of [["width", width], ["height", height]] as const) {
    if (typeof value === "number" && b.boundVariables && (b.boundVariables as Record<string, unknown>)[field]) {
      b.setBoundVariable(field, null);
    }
  }
  const w = typeof width === "number" ? width : node.width;
  const h = typeof height === "number" ? height : node.height;
  if (node.width !== w || node.height !== h) node.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  if (typeof width !== "number" && boundId(node, "width") !== width.id) b.setBoundVariable("width", width);
  if (typeof height !== "number" && boundId(node, "height") !== height.id) b.setBoundVariable("height", height);
}

export function bindRadius(node: SceneNode, value: Num) {
  for (const corner of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"] as const) {
    setNum(node, corner, value);
  }
}

export interface FrameOptions {
  direction?: "HORIZONTAL" | "VERTICAL";
  gap?: Num;
  /** Uniform padding, or separate x (left/right) and y (top/bottom). */
  padding?: Num | { x?: Num; y?: Num };
  fill?: Variable;
  stroke?: Variable;
  /** Per-side stroke weights (default 1 on every side). */
  strokeSides?: { top?: number; right?: number; bottom?: number; left?: number };
  radius?: Num;
  /** Fixed (or variable-bound) width; the frame hugs its content otherwise. */
  width?: Num;
  /** Fixed (or variable-bound) height; the frame hugs its content otherwise. */
  height?: Num;
  /** Stretch to the parent auto-layout frame's width (ignored if width is set). */
  fillWidth?: boolean;
  /** Clip children to the frame bounds (default false). */
  clip?: boolean;
  wrap?: boolean;
  /** Counter-axis alignment. */
  align?: "MIN" | "CENTER" | "MAX";
  /** Primary-axis alignment. */
  justify?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
}

type LayoutFrame = FrameNode | ComponentNode;

/**
 * Applies auto-layout, spacing, and paint options to an existing frame or component.
 * Declarative: anything not specified is reset (no fill, no stroke, zero padding/gap/radius),
 * so reapplying on a rerun converges to the same result.
 */
export function configureFrame<T extends LayoutFrame>(f: T, opts: FrameOptions = {}): T {
  if (f.getPluginData(PLUGIN_KEY) !== "generated") f.setPluginData(PLUGIN_KEY, "generated");
  if (f.clipsContent !== !!opts.clip) f.clipsContent = !!opts.clip;
  const horizontal = (opts.direction ?? "VERTICAL") === "HORIZONTAL";
  const w = opts.width;
  const h = opts.height;
  const set = <K extends keyof T>(key: K, value: T[K]) => {
    if (f[key] !== value) f[key] = value;
  };
  set("layoutMode", (horizontal ? "HORIZONTAL" : "VERTICAL") as T["layoutMode"]);
  set("layoutWrap", (opts.wrap && horizontal ? "WRAP" : "NO_WRAP") as T["layoutWrap"]);
  const fill = opts.fillWidth && w === undefined;
  // With fillWidth, the width axis is owned by layoutSizingHorizontal below.
  if (!(fill && horizontal)) {
    set("primaryAxisSizingMode", ((horizontal ? w : h) === undefined ? "AUTO" : "FIXED") as T["primaryAxisSizingMode"]);
  }
  if (!(fill && !horizontal)) {
    set("counterAxisSizingMode", ((horizontal ? h : w) === undefined ? "AUTO" : "FIXED") as T["counterAxisSizingMode"]);
  }
  if (horizontal && fill && h === undefined) set("counterAxisSizingMode", "AUTO" as T["counterAxisSizingMode"]);
  if (!horizontal && fill) set("primaryAxisSizingMode", ((h === undefined ? "AUTO" : "FIXED") as T["primaryAxisSizingMode"]));
  if (w !== undefined || h !== undefined) setSize(f, w ?? f.width, h ?? f.height);
  const parentLayout = f.parent && "layoutMode" in f.parent ? f.parent.layoutMode : "NONE";
  if (fill && parentLayout !== "NONE" && f.layoutSizingHorizontal !== "FILL") f.layoutSizingHorizontal = "FILL";
  set("counterAxisAlignItems", (opts.align ?? "MIN") as T["counterAxisAlignItems"]);
  set("primaryAxisAlignItems", (opts.justify ?? "MIN") as T["primaryAxisAlignItems"]);

  bindFill(f, opts.fill ?? null);
  if (opts.stroke) bindStroke(f, opts.stroke, opts.strokeSides ?? 1);
  else if (f.strokes.length) f.strokes = [];
  bindRadius(f, opts.radius ?? 0);
  setNum(f, "itemSpacing", opts.gap ?? 0);
  if (f.layoutWrap === "WRAP") setNum(f, "counterAxisSpacing", opts.gap ?? 0);

  const p = opts.padding ?? 0;
  const isAxes = typeof p === "object" && !("resolvedType" in p);
  const x = (isAxes ? (p as { x?: Num }).x : (p as Num)) ?? 0;
  const y = (isAxes ? (p as { y?: Num }).y : (p as Num)) ?? 0;
  setNum(f, "paddingLeft", x);
  setNum(f, "paddingRight", x);
  setNum(f, "paddingTop", y);
  setNum(f, "paddingBottom", y);
  return f;
}

/** New auto-layout frame that hugs its content (unless a size is given). */
export function frame(name: string, opts: FrameOptions = {}): FrameNode {
  const f = figma.createFrame();
  f.name = name;
  return configureFrame(f, opts);
}

/** Appends children and returns the parent, for compact tree building. */
export function append<T extends BaseNode & ChildrenMixin>(parent: T, ...children: SceneNode[]): T {
  for (const c of children) parent.appendChild(c);
  return parent;
}

/** Text node using a Sterling text style and a bound Color variable. */
export async function text(kit: Kit, chars: string, style: string, colorName = "text/primary"): Promise<TextNode> {
  const t = figma.createText();
  t.setPluginData(PLUGIN_KEY, "generated");
  const s = kit.styles.get(style);
  if (s) await t.setTextStyleIdAsync(s.id);
  else {
    await figma.loadFontAsync(t.fontName as FontName);
    warn(`Text style "${style}" missing; "${chars.slice(0, 24)}" uses the default font.`);
  }
  t.characters = chars;
  t.name = chars.length > 40 ? chars.slice(0, 40) + "…" : chars;
  bindFill(t, color(kit, colorName));
  return t;
}

/** The component set whose instances are links. */
const LINK_SET = "Controls/Link";

/**
 * Link text inside instances on a page: the Label of every Controls/Link instance, and "Select all" in every
 * bulk action bar instance. Their underline comes from the link text styles (Label-link, Body-link), which
 * instances follow even when their text is overridden.
 */
async function instanceLinkTexts(page: PageNode): Promise<TextNode[]> {
  const texts: TextNode[] = [];
  for (const inst of page.findAllWithCriteria({ types: ["INSTANCE"] })) {
    const main = await inst.getMainComponentAsync();
    if (!main) continue;
    const isLink = main.parent?.type === "COMPONENT_SET" && main.parent.name === LINK_SET;
    const isBar = !!main.findChild((n) => n.name === "Selection") && !!main.findChild((n) => n.name === "Actions");
    if (!isLink && !isBar) continue;
    const text = inst.findOne((n) => n.type === "TEXT" && n.name === (isLink ? "Label" : "Select all")) as TextNode | null;
    if (text) texts.push(text);
  }
  return texts;
}

/** How many link texts inside instances on a page aren't underlined (0 when all are). */
export async function plainInstanceLinks(page: PageNode): Promise<number> {
  return (await instanceLinkTexts(page)).filter((text) => text.textDecoration !== "UNDERLINE").length;
}

export function rect(name: string, width: number, height: number): RectangleNode {
  const r = figma.createRectangle();
  r.name = name;
  r.resize(Math.max(width, 0.01), Math.max(height, 0.01));
  return r;
}

/** Pins a node to a mode of a collection (e.g. Color → Dark), if that mode exists. */
export function pinMode(kit: Kit, node: FrameNode, collectionName: string, modeName: string): boolean {
  const ctx = kit.collections.get(collectionName);
  const modeId = ctx?.modeIds.get(modeName);
  if (!ctx || !modeId) return false;
  if (node.explicitVariableModes[ctx.collection.id] !== modeId) {
    node.setExplicitVariableModeForCollection(ctx.collection, modeId);
  }
  return true;
}

export const ARCHITECTURE_PAGE = "Component architecture";
export const GUIDELINES_PAGE = "Guidelines";
export const PATTERNS_PAGE = "Patterns";
/** The library's pages, in order. They always come first; examples follow them. */
export const COVER_PAGE = "Cover";
export const PAGE_ORDER = [
  COVER_PAGE, "Read me", "Foundations", "Components", GUIDELINES_PAGE, PATTERNS_PAGE, "Template", ARCHITECTURE_PAGE,
];
/** Library pages whose content is redrawn on every build, so the link check skips them. */
export const REDRAWN_PAGES = [COVER_PAGE, "Read me", "Foundations", "Components", GUIDELINES_PAGE, PATTERNS_PAGE];

/**
 * Ensures the library's pages exist in order, at the start of the page list. A brand-new
 * file's empty "Page 1" becomes the first page (Cover) instead of being left behind.
 */
export async function ensurePages(): Promise<Map<string, PageNode>> {
  const pages = new Map<string, PageNode>();
  for (const [i, name] of PAGE_ORDER.entries()) {
    let page = figma.root.children.find((p) => p.name === name);
    if (!page && i === 0) {
      const blank = figma.root.children.find((p) => p.name === "Page 1");
      if (blank) {
        await blank.loadAsync();
        if (blank.children.length === 0) {
          blank.name = name;
          page = blank;
          created(`Page ${name} (renamed from Page 1)`);
        }
      }
    }
    if (!page) {
      page = figma.createPage();
      page.name = name;
      created(`Page ${name}`);
    }
    await page.loadAsync();
    if (figma.root.children.indexOf(page) !== i) figma.root.insertChild(i, page);
    pages.set(name, page);
  }
  return pages;
}

/**
 * A page outside the library (e.g. an example), found by name or created at the end of the page list.
 * A page divider is kept directly before it, so the page list shows where the library ends.
 */
export async function ensurePage(name: string): Promise<PageNode> {
  let page = figma.root.children.find((p) => p.name === name);
  if (!page) {
    page = figma.createPage();
    page.name = name;
    created(`Page ${name}`);
  }
  await page.loadAsync();
  const index = figma.root.children.indexOf(page);
  if (index > 0 && !figma.root.children[index - 1].isPageDivider) {
    try {
      figma.root.insertChild(index, figma.createPageDivider());
      created(`Page divider before ${name}`);
    } catch (e) {
      warn(`Couldn't add a page divider before ${name}: ${(e as Error).message}`);
    }
  }
  return page;
}

/**
 * Removes a previously generated top-level frame by name and returns its position,
 * so a rebuilt frame lands where the user left it. Used for documentation frames
 * that nothing else references.
 */
export function takeOver(page: PageNode, name: string): { x: number; y: number } | null {
  const old = page.children.find((n) => n.name === name && n.getPluginData(PLUGIN_KEY) === "generated");
  if (!old) return null;
  const pos = { x: old.x, y: old.y };
  old.remove();
  return pos;
}

/**
 * Single-line truncation with an ending ellipsis. `fill` stretches the text to its auto-layout
 * parent (for fixed-width cells and fields); `maxWidth` caps hugging text (chips, tab labels).
 */
export function truncate(t: TextNode, opts: { fill?: boolean; maxWidth?: number; align?: "LEFT" | "RIGHT" } = {}) {
  if (opts.fill && t.layoutSizingHorizontal !== "FILL") t.layoutSizingHorizontal = "FILL";
  if (!opts.fill && t.layoutSizingHorizontal === "FILL") t.layoutSizingHorizontal = "HUG";
  if (opts.maxWidth !== undefined && t.maxWidth !== opts.maxWidth) t.maxWidth = opts.maxWidth;
  // Filling text truncates at its container's width, so it has no max width of its own.
  if (opts.fill && opts.maxWidth === undefined && t.maxWidth !== null) t.maxWidth = null;
  if (opts.align && t.textAlignHorizontal !== opts.align) t.textAlignHorizontal = opts.align;
  if (t.textTruncation !== "ENDING") t.textTruncation = "ENDING";
  if (t.maxLines !== 1) t.maxLines = 1;
}

/**
 * Removes truncation and lets the text hug its content. Used for numbers: hidden digits are a
 * risk in financial data, so numeric values are never truncated.
 */
export function untruncate(t: TextNode) {
  if (t.textTruncation !== "DISABLED") t.textTruncation = "DISABLED";
  if (t.maxLines !== null) t.maxLines = null;
  if (t.maxWidth !== null) t.maxWidth = null;
  if (t.layoutSizingHorizontal !== "HUG") t.layoutSizingHorizontal = "HUG";
}

// The numeric column sizing rule is shared with the coded Data grid.
export { numericColumnWidth } from "../../../definitions/grid";

/**
 * Description with use / don't-use guidance, for the hidden demo components on the Component architecture
 * page. Published components take their one-sentence description from definitions/docRegistry.ts instead.
 */
export function doc(summary: string, use: string, dont: string): string {
  return `${summary}\n\nUse when: ${use}\nDon't use when: ${dont}`;
}

// The Guidelines section and Patterns names live with the documentation registry, which refers to them.
export type { GuidelineSection, PatternName } from "../../../definitions/docRegistry";

/** Writes a component description, only when it differs, so reruns don't churn. */
export function setDescription(node: ComponentNode | ComponentSetNode, text: string) {
  if (node.description !== text) node.description = text;
}

/** A width bound to the Size scale when a matching step exists (e.g. 40 → size/40), else the literal. */
export function widthOf(kit: Kit, px: number): Num {
  return kit.vars.get(`Size/size/${px}`) ?? px;
}
