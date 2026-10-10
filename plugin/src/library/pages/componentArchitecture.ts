// "Component architecture" page — a reference for Figma
// component architecture. Each section has a definition, a live example, numbered callouts
// with leader lines, and a "Use when / Don't use when" box.
//
// • Demo components (_Demo/Callout, _Demo/Status badge, _Demo/Field, _Demo/Filter row,
//   _Demo/Filter chip group, _Demo/Card) live in the "Demo components" frame and are updated
//   in place, like the Components page. The leading underscore hides them from publishing.
// • The reference sheet itself is documentation only: instances, callouts, leader lines and
//   Dev Mode annotations, rebuilt each run at the same position.
// Nothing outside this page is modified; library components are only instanced.

import {
  Kit, size, color, space, density, frame, text, configureFrame, setSize, pinMode, takeOver, solid, bindFill, PLUGIN_KEY, ARCHITECTURE_PAGE, doc,
} from "../../core/helpers";
import {
  ComponentSetSpec, Props, combos, ensureComponent, ensureComponentSet, ensureFrame, ensureInstance, ensureText,
  ensureProp, prune, reference, setProps, tintIcon, variantOf, nested,
} from "../../core/ensure";
import { COLLECTIONS } from "../../core/variables";
import { tokens } from "../../core/tokens";
import { para } from "../../core/docBlocks";
import type { Library } from "./componentsPage";
import { created, updated, warn } from "../../core/log";

const ROOT = ARCHITECTURE_PAGE;
const HOLDER = "Demo components";
const ROOT_WIDTH = 1600;
const CALLOUT_WIDTH = 360;
const ANNOTATION_CATEGORY = "Component architecture";

// ============================================================ Demo components

interface Demo {
  callout: ComponentNode;
  badge: ComponentSetNode;
  field: ComponentNode;
  filterRow: ComponentNode;
  chipGroup: ComponentNode;
  card: ComponentNode | null;
  cardError?: string;
}

function ensureHolder(kit: Kit, page: PageNode): FrameNode {
  let holder = page.children.find((n) => n.name === HOLDER && n.type === "FRAME") as FrameNode | undefined;
  if (!holder) {
    holder = figma.createFrame();
    holder.name = HOLDER;
    page.appendChild(holder);
    holder.x = ROOT_WIDTH + 160;
    holder.y = 0;
    created(`${HOLDER} frame`);
  }
  configureFrame(holder, { gap: space(kit, "space/24"), padding: space(kit, "space/48"), fill: color(kit, "surface/background") });
  pinMode(kit, holder, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, holder, COLLECTIONS.density, "Default");
  return holder;
}

async function buildCallout(kit: Kit, page: PageNode, holder: FrameNode): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, holder, 1, "_Demo/Callout",
    doc(
      "Numbered note for reference pages. Number and Note are text properties; a leader line from the number badge points at the layer the note explains.",
      "annotating a design or spec with numbered explanations.",
      "the note is a product UI message (use the product's own components)."
    )
  );
  configureFrame(comp, { direction: "HORIZONTAL", gap: space(kit, "space/8"), width: 320 });
  const badge = ensureFrame(comp, "Number badge", {
    direction: "HORIZONTAL",
    align: "CENTER",
    justify: "CENTER",
    width: density(kit, "control/height-sm"),
    height: density(kit, "control/height-sm"),
    radius: space(kit, "radius/pill"),
    fill: color(kit, "accent/default"),
  }, 0);
  const num = await ensureText(kit, badge, "Number", "1", "Label", "text/inverse", 0);
  prune(badge, [num]);
  const note = await ensureText(kit, comp, "Note", "Explain why this matters.", "Body", "text/primary", 1);
  if (note.layoutSizingHorizontal !== "FILL") note.layoutSizingHorizontal = "FILL";
  prune(comp, [badge, note]);
  reference(comp, "Number", "characters", ensureProp(comp, "Number", "TEXT", "1"));
  reference(comp, "Note", "characters", ensureProp(comp, "Note", "TEXT", "Explain why this matters."));
  return comp;
}

const BADGE_TONES = ["neutral", "info", "warning", "critical"];

function badgeSpec(kit: Kit, lib: Library): ComponentSetSpec {
  const defaultIcon = lib.icons.get("info")!;
  return {
    name: "_Demo/Status badge",
    description: doc(
      "Tone (neutral / info / warning / critical) × Size (sm / md). Label (text), Show icon (boolean), and Icon " +
        "(instance swap, preferred values = Sterling's Icon/* components). Each variant only changes which variables are applied.",
      "demonstrating variants and properties on this reference page.",
      "designing product screens — use Chip/Status, which ties each tone to a fixed icon."
    ),
    variants: combos({ Tone: BADGE_TONES, Size: ["sm", "md"] }),
    columnProp: "Tone",

    async build(comp: ComponentNode, p: Props) {
      const md = p.Size === "md";
      const ink = `status/${p.Tone}-strong`;
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        gap: space(kit, "space/4"),
        padding: md
          ? { x: space(kit, "space/8"), y: space(kit, "space/4") }
          : { x: space(kit, "space/4"), y: space(kit, "space/2") },
        radius: space(kit, "radius/pill"),
        fill: color(kit, `status/${p.Tone}-subtle`),
      });
      const icon = await ensureInstance(comp, "Icon", defaultIcon, 0);
      if (md) setSize(icon, density(kit, "icon/size"), density(kit, "icon/size"));
      else setSize(icon, size(kit, "size/12"), size(kit, "size/12"));
      tintIcon(icon, color(kit, ink));
      const label = await ensureText(kit, comp, "Label", "Status", md ? "Label" : "Caption", ink, 1);
      prune(comp, [icon, label]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", "Status");
      const showKey = ensureProp(set, "Show icon", "BOOLEAN", true);
      const iconKey = ensureProp(
        set, "Icon", "INSTANCE_SWAP", defaultIcon.id,
        [...lib.icons.values()].map((c) => ({ type: "COMPONENT" as const, key: c.key }))
      );
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Icon", "visible", showKey);
        reference(comp, "Icon", "mainComponent", iconKey);
      }
    },
  };
}

async function buildField(kit: Kit, page: PageNode, holder: FrameNode): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, holder, 3, "_Demo/Field",
    doc(
      "Label, field, and an optional helper-text layer controlled by the Show helper boolean. Auto layout closes the gap when it's hidden.",
      "demonstrating boolean properties on this reference page.",
      "designing real forms — use Input/Text and Input/Select, which have every state."
    )
  );
  configureFrame(comp, { gap: space(kit, "space/4"), width: 240 });
  const label = await ensureText(kit, comp, "Label", "Label", "Label", "text/secondary", 0);
  const box = ensureFrame(comp, "Field", {
    direction: "HORIZONTAL",
    align: "CENTER",
    padding: { x: density(kit, "control/padding-x") },
    height: density(kit, "control/height"),
    radius: space(kit, "radius/sm"),
    stroke: color(kit, "border/strong"),
    fill: color(kit, "surface/panel"),
    fillWidth: true,
  }, 1);
  const value = await ensureText(kit, box, "Value", "Value", "Body", "text/primary", 0);
  prune(box, [value]);
  const helper = await ensureText(kit, comp, "Helper text", "Helper text", "Caption", "text/secondary", 2);
  prune(comp, [label, box, helper]);
  reference(comp, "Label", "characters", ensureProp(comp, "Label", "TEXT", "Label"));
  reference(comp, "Value", "characters", ensureProp(comp, "Value", "TEXT", "Value"));
  reference(comp, "Helper text", "characters", ensureProp(comp, "Helper", "TEXT", "Helper text"));
  reference(comp, "Helper text", "visible", ensureProp(comp, "Show helper", "BOOLEAN", true, undefined, ["Show helper text"]));
  return comp;
}

async function buildFilterRow(kit: Kit, page: PageNode, holder: FrameNode, lib: Library): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, holder, 4, "_Demo/Filter row",
    doc(
      "Composite: a text input, a select, and a Button. Only the Button is an exposed instance, so its Kind, Label, " +
        "and Show icon appear on this component's properties panel.",
      "a compact search-and-filter bar above a grid.",
      "there are many filters (use a filters panel)."
    )
  );
  configureFrame(comp, {
    direction: "HORIZONTAL",
    align: "MAX",
    gap: space(kit, "space/12"),
    padding: space(kit, "space/12"),
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  const search = await ensureInstance(comp, "Search", variantOf(lib.textInput, { State: "default", Content: "value" }), 0);
  setProps(search, { Label: "Search", Value: "ID or name", "Show helper": false });
  const status = await ensureInstance(comp, "Status filter", variantOf(lib.select, { State: "default", Content: "value" }), 1);
  setProps(status, { Label: "Status", Value: "Any status", "Show helper": false });
  const action = await ensureInstance(comp, "Action", variantOf(lib.button, { Kind: "primary", Size: "md", State: "default" }), 2);
  setProps(action, { Label: "Apply" });
  if (!action.isExposedInstance) action.isExposedInstance = true;
  prune(comp, [search, status, action]);
  return comp;
}

async function buildChipGroup(kit: Kit, page: PageNode, holder: FrameNode, lib: Library): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, holder, 5, "_Demo/Filter chip group",
    doc(
      "Composite: applied filter chips plus Clear all, built from Chip/Filter and Button instances.",
      "summarizing applied filters above a grid.",
      "no filters are applied (hide it)."
    )
  );
  configureFrame(comp, { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") });
  const keep: SceneNode[] = [];
  for (const [i, label] of ["Status: Pending", "Type: Info", "Owner: Team A"].entries()) {
    const chip = await ensureInstance(comp, `Chip ${i + 1}`, variantOf(lib.filterChip, { State: "default" }), i);
    setProps(chip, { Label: label });
    keep.push(chip);
  }
  const clear = await ensureInstance(comp, "Clear all", variantOf(lib.button, { Kind: "ghost", Size: "sm", State: "default" }), 3);
  setProps(clear, { Label: "Clear all" });
  keep.push(clear);
  prune(comp, keep);
  return comp;
}

/** _Demo/Card with a Body slot. Returns an error message instead of throwing if slots aren't available. */
async function buildCard(kit: Kit, page: PageNode, holder: FrameNode): Promise<{ card: ComponentNode | null; error?: string }> {
  try {
    const comp = ensureComponent(
      page, holder, 6, "_Demo/Card",
      doc(
        "Card with a Title text property and a Body slot: each instance places its own content in the slot.",
        "a container whose content varies per use (summaries, small lists, notes).",
        "the content is always the same structure (make a dedicated component)."
      )
    );
    configureFrame(comp, {
      gap: space(kit, "space/12"),
      padding: space(kit, "space/16"),
      width: 280,
      fill: color(kit, "surface/panel"),
      stroke: color(kit, "border/default"),
      radius: space(kit, "radius/md"),
    });
    const title = await ensureText(kit, comp, "Title", "Card title", "Heading", "text/primary", 0);
    let slot = comp.findChild((n) => n.type === "SLOT") as SlotNode | null;
    if (!slot) {
      slot = comp.createSlot();
      if (slot.parent !== comp) comp.appendChild(slot);
    }
    slot.name = "Body";
    configureFrame(slot as unknown as FrameNode, { gap: space(kit, "space/8"), fillWidth: true });
    if (comp.children.indexOf(slot) !== 1) comp.insertChild(1, slot);
    if (slot.children.length === 0) {
      slot.appendChild(await text(kit, "Slot content", "Caption", "text/secondary"));
    }
    reference(comp, "Title", "characters", ensureProp(comp, "Title", "TEXT", "Card title"));
    for (const c of [...comp.children]) if (c !== title && c !== slot) c.remove();
    const defs = comp.componentPropertyDefinitions;
    if (!Object.keys(defs).some((k) => defs[k].type === "SLOT")) {
      throw new Error("createSlot() did not add a SLOT component property");
    }
    return { card: comp };
  } catch (e) {
    return { card: null, error: (e as Error).message };
  }
}

async function buildDemo(kit: Kit, page: PageNode, lib: Library): Promise<Demo> {
  const holder = ensureHolder(kit, page);
  await ensureText(kit, holder, "Title", HOLDER, "Title", "text/primary", 0);
  const callout = await buildCallout(kit, page, holder);
  const badge = await ensureComponentSet(kit, page, holder, 2, badgeSpec(kit, lib));
  const field = await buildField(kit, page, holder);
  const filterRow = await buildFilterRow(kit, page, holder, lib);
  const chipGroup = await buildChipGroup(kit, page, holder, lib);
  const { card, error } = await buildCard(kit, page, holder);
  if (error) warn(`Slots: ${error}. Section 6 shows a placeholder panel instead.`);
  return { callout, badge, field, filterRow, chipGroup, card, cardError: error };
}

// ============================================================ Reference sheet building blocks

interface Section {
  frame: FrameNode;
  example: FrameNode;
  callouts: FrameNode;
  links: [InstanceNode, SceneNode][];
}

let annotationCategoryId: string | undefined;

async function ensureAnnotationCategory(): Promise<string | undefined> {
  try {
    const existing = (await figma.annotations.getAnnotationCategoriesAsync()).find((c) => c.label === ANNOTATION_CATEGORY);
    if (existing) return existing.id;
    return (await figma.annotations.addAnnotationCategoryAsync({ label: ANNOTATION_CATEGORY, color: "violet" })).id;
  } catch (e) {
    warn(`Annotation categories unavailable (${(e as Error).message}); annotations are added without a category.`);
    return undefined;
  }
}

/** Adds a Dev Mode annotation to a node (skipped with a warning if the node type doesn't allow it). */
function annotate(node: SceneNode, markdown: string) {
  try {
    (node as FrameNode).annotations = [
      annotationCategoryId ? { labelMarkdown: markdown, categoryId: annotationCategoryId } : { labelMarkdown: markdown },
    ];
  } catch (e) {
    warn(`Couldn't annotate "${node.name}": ${(e as Error).message}`);
  }
}

function place(parent: FrameNode, node: SceneNode, fill = false) {
  parent.appendChild(node);
  if (fill && "layoutSizingHorizontal" in node) (node as FrameNode).layoutSizingHorizontal = "FILL";
  return node;
}

async function caption(kit: Kit, parent: FrameNode, chars: string) {
  return place(parent, await text(kit, chars, "Caption", "text/secondary"));
}

async function section(kit: Kit, root: FrameNode, n: number, title: string, definition: string): Promise<Section> {
  const s = frame(`Section ${n}`, {
    gap: space(kit, "space/16"),
    padding: space(kit, "space/24"),
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  place(root, s, true);
  const head = frame("Header", { gap: space(kit, "space/4") });
  place(s, head, true);
  head.appendChild(await text(kit, `${n} · ${title}`, "Title"));
  await para(kit, head, definition, "Body", "text/secondary");

  const body = frame("Body", { direction: "HORIZONTAL", gap: space(kit, "space/48") });
  place(s, body, true);
  const example = frame("Live example", {
    gap: space(kit, "space/16"),
    padding: space(kit, "space/16"),
    fill: color(kit, "surface/background"),
    radius: space(kit, "radius/sm"),
  });
  body.appendChild(example);
  example.layoutGrow = 1;
  await caption(kit, example, "Live example");
  const callouts = frame("Callouts", { gap: space(kit, "space/16"), width: CALLOUT_WIDTH });
  body.appendChild(callouts);
  return { frame: s, example, callouts, links: [] };
}

function callout(sec: Section, demo: Demo, num: number, note: string, target: SceneNode) {
  const inst = demo.callout.createInstance();
  place(sec.callouts, inst, true);
  setProps(inst, { Number: String(num), Note: note });
  sec.links.push([inst, target]);
}

async function guidance(kit: Kit, lib: Library, sec: Section, use: string[], dont: string[]) {
  const row = frame("Use when / Don't use when", { direction: "HORIZONTAL", gap: space(kit, "space/16") });
  place(sec.frame, row, true);
  for (const [title, items, tone, icon] of [
    ["Use when", use, "positive", "circle-check"],
    ["Don't use when", dont, "critical", "circle-x"],
  ] as [string, string[], string, string][]) {
    const box = frame(title, {
      gap: space(kit, "space/8"),
      padding: space(kit, "space/16"),
      radius: space(kit, "radius/sm"),
      fill: color(kit, `status/${tone}-subtle`),
    });
    row.appendChild(box);
    box.layoutGrow = 1;
    const head = frame("Heading", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") });
    box.appendChild(head);
    const glyph = lib.icons.get(icon)!.createInstance();
    head.appendChild(glyph);
    setSize(glyph, density(kit, "icon/size"), density(kit, "icon/size"));
    tintIcon(glyph, color(kit, `status/${tone}-strong`));
    head.appendChild(await text(kit, title, "Body-strong", `status/${tone}-strong`));
    for (const item of items) await para(kit, box, `• ${item}`, "Body", `status/${tone}-strong`);
  }
}

/** Leader line from each callout's number badge to its target, with a dot on the target. */
function drawLeaders(kit: Kit, sec: Section) {
  const t = sec.frame.absoluteTransform;
  const ox = t[0][2];
  const oy = t[1][2];
  const ink = color(kit, "accent/default");
  for (const [i, [inst, target]] of sec.links.entries()) {
    const badge = inst.findOne((n) => n.name === "Number badge");
    const a = badge?.absoluteBoundingBox;
    const b = target.absoluteBoundingBox;
    if (!a || !b) continue;
    const x1 = a.x - ox;
    const y1 = a.y + a.height / 2 - oy;
    const x2 = b.x + b.width - ox;
    const y2 = b.y + b.height / 2 - oy;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const line = figma.createLine();
    line.name = `Leader ${i + 1}`;
    sec.frame.appendChild(line);
    line.layoutPositioning = "ABSOLUTE";
    line.x = x1;
    line.y = y1;
    line.resize(Math.max(Math.hypot(dx, dy), 0.01), 0);
    line.rotation = (-Math.atan2(dy, dx) * 180) / Math.PI;
    line.strokes = [solid(ink)];
    line.strokeWeight = 1;
    const dot = figma.createEllipse();
    dot.name = `Leader ${i + 1} target`;
    sec.frame.appendChild(dot);
    dot.layoutPositioning = "ABSOLUTE";
    dot.resize(6, 6);
    dot.x = x2 - 3;
    dot.y = y2 - 3;
    bindFill(dot, ink);
  }
}

/** Table built from Sterling's grid cells, so the page also reuses the library. */
function table(kit: Kit, lib: Library, parent: FrameNode, name: string, headers: string[], rows: string[][], widths: number[]) {
  const t = frame(name, { stroke: color(kit, "border/default") });
  parent.appendChild(t);
  const head = frame("Header", { direction: "HORIZONTAL" });
  t.appendChild(head);
  headers.forEach((h, i) => {
    const cell = variantOf(lib.headerCell, { Sort: "none", Align: "left", State: "default" }).createInstance();
    head.appendChild(cell);
    setSize(cell, widths[i], density(kit, "row/height"));
    setProps(cell, { Label: h, "Show sort": false });
  });
  const rowNodes: FrameNode[] = [];
  for (const r of rows) {
    const row = frame("Row", { direction: "HORIZONTAL" });
    t.appendChild(row);
    r.forEach((v, i) => {
      const cell = variantOf(lib.bodyCell, { Type: "text", State: "default" }).createInstance();
      row.appendChild(cell);
      setSize(cell, widths[i], density(kit, "row/height"));
      setProps(cell, { Value: v });
    });
    rowNodes.push(row);
  }
  return { table: t, rows: rowNodes };
}

function badge(demo: Demo, type: string, size: string, props: Record<string, string | boolean> = {}) {
  const inst = variantOf(demo.badge, { Tone: type, Size: size }).createInstance();
  if (Object.keys(props).length) setProps(inst, props);
  return inst;
}

function row(kit: Kit, parent: FrameNode, name: string, gap = "space/12") {
  const r = frame(name, { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, gap) });
  parent.appendChild(r);
  return r;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ============================================================ Sections

async function sectionVariants(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 1, "Variants: structure or appearance changes",
    "Variants are the versions of one component that differ in look, state, or size, grouped in a component set and chosen from dropdowns.");
  await caption(kit, sec.example, "_Demo/Status badge · Tone × Size = 8 variants");
  const grid = frame("Variant grid", { gap: space(kit, "space/12") });
  sec.example.appendChild(grid);
  let mdCritical: InstanceNode | null = null;
  for (const size of ["sm", "md"]) {
    const r = row(kit, grid, `Size=${size}`);
    for (const type of BADGE_TONES) {
      const inst = badge(demo, type, size, { Label: cap(type) });
      r.appendChild(inst);
      if (size === "md" && type === "critical") mdCritical = inst;
    }
  }
  annotate(grid, "**Variants** — _Demo/Status badge: `Tone` × `Size` = 8 variants in one component set. Each variant only changes bound variables.");

  // Anti-pattern: a "Has icon" variant doubles the set.
  const anti = frame("Anti-pattern", {
    gap: space(kit, "space/12"),
    padding: space(kit, "space/16"),
    radius: space(kit, "radius/sm"),
    fill: color(kit, "status/critical-subtle"),
    stroke: color(kit, "status/critical"),
  });
  sec.example.appendChild(anti);
  anti.appendChild(await text(kit, "Anti-pattern: a “Has icon = yes / no” variant", "Body-strong", "status/critical-strong"));
  await para(kit, anti, "8 variants become 16 — every Tone × Size exists twice, with and without the icon. Fix: a Show icon boolean (section 3).", "Caption", "status/critical-strong");
  for (const hasIcon of [true, false]) {
    const r = row(kit, anti, `Has icon=${hasIcon ? "yes" : "no"}`, "space/8");
    r.appendChild(await text(kit, hasIcon ? "Has icon = yes" : "Has icon = no", "Caption", "status/critical-strong"));
    for (const size of ["sm", "md"]) for (const type of BADGE_TONES) {
      r.appendChild(badge(demo, type, size, { Label: cap(type), "Show icon": hasIcon }));
    }
  }

  callout(sec, demo, 1, "Variants are for visual or structural differences — here Tone and Size. Each combination is one variant in a single component set.", grid);
  callout(sec, demo, 2, "Each variant only changes which variables are applied: Tone swaps status/*-subtle and *-strong; Size swaps padding and text style. No hard-coded values.", mdCritical!);
  callout(sec, demo, 3, "Don't add a variant for an optional layer: “Has icon” doubles the set to 16. A boolean property keeps it at 8 (section 3).", anti);
  await guidance(kit, lib, sec,
    ["The difference is visual or structural: type, state, size", "Designers should choose from a fixed set of options"],
    ["Only the text changes — use a text property", "A layer is optional — use a boolean", "The new option would multiply the set without adding meaning"]);
  return sec;
}

async function sectionText(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 2, "Text properties: content that changes per instance",
    "A text property links a text layer's content to a field on the instance, so each instance types its own text without a new variant.");
  await caption(kit, sec.example, "Same variant (Tone = info, Size = md), three Label values");
  const r = row(kit, sec.example, "Instances");
  const items = ["In review", "Scheduled", "Awaiting data"].map((label) => {
    const inst = badge(demo, "info", "md", { Label: label });
    r.appendChild(inst);
    return inst;
  });
  annotate(r, "**Text property** — `Label` on _Demo/Status badge. One variant, three labels.");
  callout(sec, demo, 1, "Label is a text property: each instance sets its own content, and the variant stays the same.", items[1].findOne((n) => n.name === "Label")!);
  callout(sec, demo, 2, "Content changes go in text properties, never in new variants — the set stays small and labels are edited from the properties panel.", items[2]);
  await guidance(kit, lib, sec,
    ["Content varies per instance: labels, values, names", "Writers or engineers will change the copy"],
    ["The change is visual — use a variant", "The text is sometimes absent — pair it with a boolean"]);
  return sec;
}

async function sectionBoolean(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 3, "Boolean properties: show or hide an optional layer",
    "A boolean property toggles a layer's visibility, so one variant covers both the with and without cases.");
  await caption(kit, sec.example, "_Demo/Status badge: Show icon on / off");
  const r1 = row(kit, sec.example, "Badges");
  const on = badge(demo, "info", "md", { Label: "With icon", "Show icon": true });
  const off = badge(demo, "info", "md", { Label: "Without icon", "Show icon": false });
  r1.appendChild(on);
  r1.appendChild(off);
  await caption(kit, sec.example, "_Demo/Field: Show helper on / off");
  const r2 = row(kit, sec.example, "Fields", "space/24");
  r2.counterAxisAlignItems = "MIN";
  const f1 = demo.field.createInstance();
  const f2 = demo.field.createInstance();
  r2.appendChild(f1);
  r2.appendChild(f2);
  setProps(f1, { Label: "Owner", Value: "Team A", Helper: "Who reviews this item", "Show helper": true });
  setProps(f2, { Label: "Owner", Value: "Team A", "Show helper": false });
  annotate(r1, "**Boolean property** — `Show icon` controls the icon layer's visibility.");
  annotate(r2, "**Boolean property** — `Show helper` controls the helper layer on _Demo/Field.");
  callout(sec, demo, 1, "Show icon is a boolean linked to the icon layer's visibility — one variant covers both cases.", on.findOne((n) => n.name === "Icon")!);
  callout(sec, demo, 2, "With the icon hidden, auto layout closes the gap: no spacer or padding changes needed.", off);
  callout(sec, demo, 3, "Show helper hides an optional layer on _Demo/Field; the field shrinks with auto layout.", f2);
  await guidance(kit, lib, sec,
    ["A layer is optional: icon, helper text, badge, divider", "Showing it doesn't change anything else"],
    ["Showing the layer also changes size or style — use a variant", "You need to choose *which* icon — use instance swap"]);
  return sec;
}

async function sectionSwap(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 4, "Instance swap: a slot for an icon or nested component",
    "An instance-swap property lets each instance replace a nested component, such as an icon, from the properties panel.");
  await caption(kit, sec.example, "Same badge, Icon property swapped · preferred values: Sterling's Icon/* components");
  const r = row(kit, sec.example, "Swaps");
  const swaps = [["circle-check", "Done"], ["alert-triangle", "Attention"], ["info", "Note"]].map(([icon, label]) => {
    const inst = badge(demo, "neutral", "md", { Label: label, Icon: lib.icons.get(icon)!.id });
    r.appendChild(inst);
    return inst;
  });
  annotate(r, "**Instance swap** — `Icon` on _Demo/Status badge, preferred values limited to `Icon/*`.");
  callout(sec, demo, 1, "The icon layer is linked to the Icon instance-swap property — choose a different icon from the properties panel.", swaps[0].findOne((n) => n.name === "Icon")!);
  callout(sec, demo, 2, "Preferred values are limited to Sterling's Icon/* components, so swaps stay on-system.", swaps[2]);
  await guidance(kit, lib, sec,
    ["One nested component should be interchangeable: icon, avatar, logo slot", "The options share a size and role"],
    ["The options change the layout — use variants", "Any content could go there — use a slot"]);
  return sec;
}

async function sectionNested(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 5, "Nested instance properties: surface child properties at the parent",
    "Marking a nested instance as exposed shows its properties on the parent's panel, so designers edit it without drilling into layers.");
  await caption(kit, sec.example, "_Demo/Filter row · exposed: Action (Controls/Button) · not exposed: Search, Status filter");
  const row1 = demo.filterRow.createInstance();
  const row2 = demo.filterRow.createInstance();
  sec.example.appendChild(row1);
  sec.example.appendChild(row2);
  const action2 = nested(row2, "Action");
  if (action2) setProps(action2, { Kind: "secondary", Label: "Reset" });
  annotate(row1, "**Exposed nested instance** — the `Action` Button's Kind, Label and Show icon appear on _Demo/Filter row's panel.");
  callout(sec, demo, 1, "The nested Button is an exposed instance, so its Kind, Label and Show icon appear on the filter row's own properties panel.", nested(row1, "Action") ?? row1);
  callout(sec, demo, 2, "Edit it from the parent: this row uses Kind = secondary and Label = Reset, set without selecting the Button layer.", action2 ?? row2);
  callout(sec, demo, 3, "The inputs aren't exposed. Expose only what people need to change, so the panel stays short.", nested(row1, "Search") ?? row1);
  await guidance(kit, lib, sec,
    ["A composite has a child people routinely adjust", "The child's own properties are already well named"],
    ["The child should look the same everywhere", "Exposing would flood the panel with rarely used options"]);
  return sec;
}

async function sectionSlots(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 6, "Slots: arbitrary content inside a component",
    "A slot property marks an area of a component where each instance can place its own layers, without detaching.");
  if (demo.card) {
    await caption(kit, sec.example, "_Demo/Card · Title (text) + Body (slot)");
    const r = row(kit, sec.example, "Cards", "space/24");
    r.counterAxisAlignItems = "MIN";
    const a = demo.card.createInstance();
    const b = demo.card.createInstance();
    r.appendChild(a);
    r.appendChild(b);
    setProps(a, { Title: "Monthly summary" });
    setProps(b, { Title: "Open items" });
    const fill = async (inst: InstanceNode, nodes: SceneNode[]) => {
      const slot = inst.findOne((n) => n.type === "SLOT") as SlotNode | null;
      if (!slot) return null;
      try {
        for (const c of [...slot.children]) c.remove();
        for (const n of nodes) {
          slot.appendChild(n);
          if ("layoutSizingHorizontal" in n) (n as FrameNode).layoutSizingHorizontal = "FILL";
        }
      } catch (e) {
        warn(`Couldn't fill the _Demo/Card slot: ${(e as Error).message}`);
      }
      return slot;
    };
    const metric = variantOf(lib.summaryMetric, { Status: "normal", State: "default" }).createInstance();
    const slotA = await fill(a, [metric]);
    const slotB = await fill(b, [
      badge(demo, "warning", "md", { Label: "2 need review" }),
      badge(demo, "critical", "md", { Label: "1 blocked" }),
      await text(kit, "Badges and a note placed directly in the slot.", "Caption", "text/secondary"),
    ]);
    annotate(r, "**Slot** — _Demo/Card's `Body` slot: each instance places its own layers.");
    callout(sec, demo, 1, "Body is a slot: this instance places a summary metric there — no detaching, and the card frame stays linked.", slotA ?? a);
    callout(sec, demo, 2, "Another instance puts badges and a note in the same slot. Slot settings (preferred content, min/max children) can keep it on-system.", slotB ?? b);
  } else {
    const panel = frame("Slots placeholder", {
      gap: space(kit, "space/8"),
      padding: space(kit, "space/16"),
      radius: space(kit, "radius/sm"),
      fill: color(kit, "status/warning-subtle"),
      stroke: color(kit, "status/warning"),
    });
    place(sec.example, panel, true);
    panel.appendChild(await text(kit, "Slots weren't available to the plugin in this file", "Body-strong", "status/warning-strong"));
    await para(kit, panel,
      `Reason: ${demo.cardError}. To show this by hand: build a card component with a Title text property, select its body ` +
        "frame and add a Slot property, then place a summary metric in one instance and badges in another.",
      "Caption", "status/warning-strong");
    callout(sec, demo, 1, "Slots hold arbitrary content per instance; build _Demo/Card by hand to demonstrate them here.", panel);
  }
  await guidance(kit, lib, sec,
    ["The content inside a container varies widely: cards, modals, panels", "You'd otherwise detach the instance to add layers"],
    ["The content is one swappable component — use instance swap", "The options are a fixed list — use variants"]);
  return sec;
}

async function sectionCode(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 7, "Mirror the engineering component's props",
    "Name Figma properties after the code component's props, so the properties panel reads like the code and handoff is a direct mapping.");
  const r = row(kit, sec.example, "Side by side", "space/24");
  r.counterAxisAlignItems = "MIN";

  const btnCol = frame("Instance", { gap: space(kit, "space/8") });
  r.appendChild(btnCol);
  await caption(kit, btnCol, "Instance");
  const btn = variantOf(lib.button, { Kind: "primary", Size: "md", State: "disabled" }).createInstance();
  btnCol.appendChild(btn);
  setProps(btn, { Label: "Save draft", "Show icon": true });

  const panel = frame("Properties panel", {
    gap: space(kit, "space/4"),
    padding: space(kit, "space/12"),
    radius: space(kit, "radius/sm"),
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    width: 220,
  });
  r.appendChild(panel);
  panel.appendChild(await text(kit, "Properties (Figma)", "Label", "text/secondary"));
  const panelRows: Record<string, FrameNode> = {};
  for (const [k, v] of [["Kind", "primary"], ["Size", "md"], ["State", "disabled"], ["Label", "Save draft"], ["Show icon", "on"], ["Icon", "plus"]]) {
    const pr = frame(`Property/${k}`, { direction: "HORIZONTAL", gap: space(kit, "space/8") });
    place(panel, pr, true);
    const key = frame("Key", { width: 80 });
    pr.appendChild(key);
    key.appendChild(await text(kit, k, "Caption", "text/secondary"));
    pr.appendChild(await text(kit, v, "Body", "text/primary"));
    panelRows[k] = pr;
  }

  const code = frame("Code", {
    gap: space(kit, "space/4"),
    padding: space(kit, "space/12"),
    radius: space(kit, "radius/sm"),
    fill: color(kit, "surface/hover"),
  });
  r.appendChild(code);
  code.appendChild(await text(kit, "Code", "Label", "text/secondary"));
  code.appendChild(await text(kit,
    '<Button\n  kind="primary"\n  size="md"\n  disabled\n  label="Save draft"\n  showIcon\n  icon="plus"\n/>',
    "Code", "text/primary"));

  await caption(kit, sec.example, "Mapping");
  const { table: map, rows } = table(kit, lib, sec.example, "Mapping table", ["Figma property", "Code prop"], [
    ["Kind", "kind"], ["Size", "size"], ["State = disabled", "disabled"], ["Label", "label"], ["Show icon", "showIcon"], ["Icon", "icon"],
  ], [200, 200]);
  annotate(map, "**Props mapping** — Figma property ↔ code prop. Use these names when setting up Code Connect.");
  callout(sec, demo, 1, "The properties panel lists the same names the code uses — Kind ↔ kind, Size ↔ size, Label ↔ label, Show icon ↔ showIcon.", panelRows["Label"]);
  callout(sec, demo, 2, "Matching names make handoff and Code Connect mapping direct: each Figma property maps to one prop.", code);
  callout(sec, demo, 3, "Where names must differ (State = disabled ↔ disabled), record the mapping once in a table like this.", rows[0]);
  await guidance(kit, lib, sec,
    ["A component exists in code (or will)", "You plan to use Code Connect or annotate for handoff"],
    ["Code names are unclear to designers — keep Figma names readable and document the mapping instead"]);
  return sec;
}

async function sectionHierarchy(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 8, "Hierarchy: primitives → composites → patterns",
    "Primitives are the smallest components, composites combine primitives, and patterns arrange composites into a screen region. " +
      "Here “primitives” means primitive components — not the primitive color variables in the Variables panel, which " +
      "semantic variables alias and designers don't apply directly.");
  // Tiers stack top to bottom at native size (no scaling), joined by arrows.
  const tiers = frame("Tiers", { gap: space(kit, "space/8") });
  place(sec.example, tiers, true);
  const tier = async (title: string, sub: string) => {
    const t = frame(title, {
      gap: space(kit, "space/12"),
      padding: space(kit, "space/16"),
      radius: space(kit, "radius/md"),
      stroke: color(kit, "border/default"),
      fill: color(kit, "surface/panel"),
    });
    place(tiers, t, true);
    const head = frame("Heading", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/12") });
    t.appendChild(head);
    head.appendChild(await text(kit, title, "Heading"));
    head.appendChild(await text(kit, sub, "Caption", "text/secondary"));
    const content = frame("Content", { direction: "HORIZONTAL", align: "CENTER", wrap: true, gap: space(kit, "space/16") });
    place(t, content, true);
    return content;
  };
  const arrow = async () => tiers.appendChild(await text(kit, "↓ used inside", "Caption", "text/secondary"));

  const prim = await tier("Primitives", "Icon · Status chip · Checkbox · Button");
  prim.appendChild(lib.icons.get("info")!.createInstance());
  prim.appendChild(variantOf(lib.chip, { Tone: "info" }).createInstance());
  prim.appendChild(variantOf(lib.checkbox, { Checked: "on", State: "default" }).createInstance());
  const primButton = variantOf(lib.button, { Kind: "primary", Size: "sm", State: "default" }).createInstance();
  prim.appendChild(primButton);
  await arrow();

  const comp = await tier("Composites", "Grid row · _Demo/Filter chip group · Summary metric · _Demo/Filter row");
  comp.appendChild(variantOf(lib.row, { State: "default" }).createInstance());
  comp.appendChild(demo.chipGroup.createInstance());
  comp.appendChild(variantOf(lib.summaryMetric, { Status: "normal", State: "default" }).createInstance());
  const filterRow = demo.filterRow.createInstance();
  comp.appendChild(filterRow);
  await arrow();

  const pat = await tier("Pattern", "Filters + bulk action bar + data grid");
  const patternFrame = frame("Reduced pattern", { gap: space(kit, "space/8") });
  pat.appendChild(patternFrame);
  patternFrame.appendChild(demo.filterRow.createInstance());
  patternFrame.appendChild(lib.bulkActionBar.createInstance());
  patternFrame.appendChild(lib.exampleGrid.createInstance());

  annotate(tiers, "**Hierarchy** — primitives → composites → patterns. Changes to a primitive flow up through every instance.");
  callout(sec, demo, 1, "Primitives are the smallest Sterling components: icon, chip, checkbox, button.", primButton);
  callout(sec, demo, 2, "Composites are built from primitive instances — _Demo/Filter row contains two inputs and a Button.", filterRow);
  callout(sec, demo, 3, "Patterns compose composites. Change a primitive and the update flows upward through every composite and pattern.", patternFrame);
  await guidance(kit, lib, sec,
    ["Planning what to build first on a new screen", "Deciding where a change belongs (fix it at the lowest level)"],
    ["A one-off layout — not everything needs to be a component"]);
  return sec;
}

async function sectionSummary(kit: Kit, lib: Library, demo: Demo, root: FrameNode) {
  const sec = await section(kit, root, 9, "Decision summary",
    "Pick the smallest tool that captures the change.");
  const { table: t, rows } = table(kit, lib, sec.example, "Decision table", ["If this changes…", "Use…", "Example here"], [
    ["Look, state, or size", "Variant", "Badge Tone × Size"],
    ["Text content", "Text property", "Badge Label"],
    ["An optional layer", "Boolean property", "Show icon, Show helper"],
    ["A swappable icon or component", "Instance swap", "Badge Icon"],
    ["A child component's settings", "Exposed nested instance", "Filter row → Action"],
    ["Arbitrary content", "Slot", "Card Body"],
  ], [240, 200, 240]);
  annotate(t, "**Decision summary** — if this changes → use this component property.");
  callout(sec, demo, 1, "Start small: a property before a new variant, a variant before a new component.", rows[0]);
  callout(sec, demo, 2, "If a choice would multiply the variant count, it's usually a property instead.", rows[2]);
  await guidance(kit, lib, sec,
    ["Modeling a new component or reviewing someone else's"],
    ["Copying a component set that already exists in the library — reuse it"]);
  return sec;
}

// ============================================================ Page

export async function buildComponentArchitecture(kit: Kit, page: PageNode, lib: Library): Promise<FrameNode> {
  annotationCategoryId = await ensureAnnotationCategory();
  const demo = await buildDemo(kit, page, lib);

  const pos = takeOver(page, ROOT);
  const root = frame(ROOT, {
    gap: space(kit, "space/48"),
    padding: space(kit, "space/48"),
    width: ROOT_WIDTH,
    fill: color(kit, "surface/background"),
  });
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");
  page.appendChild(root);
  root.x = pos ? pos.x : 0;
  root.y = pos ? pos.y : 0;

  // Header with legend.
  const header = frame("Header", { gap: space(kit, "space/8") });
  place(root, header, true);
  header.appendChild(await text(kit, ROOT, "Display"));
  await para(kit, header,
    "A reference for explaining Figma component architecture: each section defines a concept, shows a working example, " +
      "and explains proper usage. All data is hypothetical.");
  const legend = frame("Legend", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/16") });
  header.appendChild(legend);
  const sample = demo.callout.createInstance();
  legend.appendChild(sample);
  setProps(sample, { Number: "1", Note: "Numbered callout (_Demo/Callout): explains why. Its leader line ends in a dot on the layer it describes." });
  legend.appendChild(await text(kit, "Dev Mode annotations repeat each example's key point.", "Caption", "text/secondary"));

  const sections = [
    await sectionVariants(kit, lib, demo, root),
    await sectionText(kit, lib, demo, root),
    await sectionBoolean(kit, lib, demo, root),
    await sectionSwap(kit, lib, demo, root),
    await sectionNested(kit, lib, demo, root),
    await sectionSlots(kit, lib, demo, root),
    await sectionCode(kit, lib, demo, root),
    await sectionHierarchy(kit, lib, demo, root),
    await sectionSummary(kit, lib, demo, root),
  ];
  // Leaders are drawn last, once auto layout has settled every position.
  for (const sec of sections) drawLeaders(kit, sec);

  if (root.getPluginData(PLUGIN_KEY) !== "generated") root.setPluginData(PLUGIN_KEY, "generated");
  if (pos) updated(`Page ${ROOT}`);
  else created(`Page ${ROOT} content`);
  return root;
}
