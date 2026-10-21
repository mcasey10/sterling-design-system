// Guidelines page: Sterling's design principles and rules — accessibility, data display, naming,
// states, color, icons, and component usage — with do / don't pairs built from Sterling instances. Domain-neutral.
// The text of each section comes from definitions/guidelines.ts; this file draws it and builds the examples.
// Documentation only, so it is rebuilt on each run (at the same position). Each section is a frame
// named "Guideline/<section>"; each component's documentation link opens its "Component/<name>" entry
// under Component usage (library/docLinks.ts).

import { tokens } from "../../core/tokens";
import { COLLECTIONS } from "../../core/variables";
import {
  Kit, color, space, frame, text, pinMode, takeOver, setSize, density, bindFill, GuidelineSection, PATTERNS_PAGE,
} from "../../core/helpers";
import { para, definitions, docTable, doDont } from "../../core/docBlocks";
import { variantOf, setProps } from "../../core/ensure";
import type { Library } from "./componentsPage";
import { COMPONENT_DOCS, DOCS_TARGET, ICON_DOC, DocTarget, targetLabel } from "../../../../definitions/docRegistry";
import { guideline, sentence, type Guideline } from "../../../../definitions/guidelines";
import { created, updated } from "../../core/log";

const ROOT = "Guidelines";

/** A section panel: a Guidelines section from definitions/guidelines.ts, or a name with its own summary. */
async function section(kit: Kit, root: FrameNode, source: Guideline | { name: GuidelineSection; summary: string }): Promise<FrameNode> {
  const { name, summary } = source;
  const s = frame(`Guideline/${name}`, {
    gap: space(kit, "space/16"),
    padding: space(kit, "space/24"),
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  root.appendChild(s);
  s.layoutSizingHorizontal = "FILL";
  s.appendChild(await text(kit, name, "Title"));
  await para(kit, s, summary);
  return s;
}

/** A small row of grid cells, so do / don't examples look like the real thing. */
function cells(kit: Kit, lib: Library, name: string, type: string, values: string[], width = 120): FrameNode {
  const col = frame(name, {});
  for (const v of values) {
    const c = variantOf(lib.bodyCell, { Type: type, State: "default" }).createInstance();
    col.appendChild(c);
    setSize(c, width, density(kit, "row/height"));
    setProps(c, { Value: v });
  }
  return col;
}

/** One of a section's do / don't pairs, by position in definitions/guidelines.ts, with the examples built here. */
async function pair(kit: Kit, parent: FrameNode, lib: Library, g: Guideline, index: number, good: SceneNode, bad: SceneNode) {
  const d = g.doDont[index];
  if (!d) throw new Error(`definitions/guidelines.ts has no do / don't pair ${index + 1} for "${g.name}"`);
  await doDont(kit, parent, lib.icons, d.title, { node: good, note: d.do }, { node: bad, note: d.dont });
}

/**
 * "Related" row: one underlined link per target, in text layers named "Related/<target label>". The links
 * themselves are set by library/docLinks.ts once every target frame exists.
 */
async function relatedLinks(kit: Kit, parent: FrameNode, targets: DocTarget[]) {
  const row = frame("Related", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/12"), wrap: true });
  parent.appendChild(row);
  row.layoutSizingHorizontal = "FILL";
  row.appendChild(await text(kit, "Related", "Body-strong"));
  for (const t of targets) {
    const link = await text(kit, targetLabel(t), "Body", "accent/default");
    link.name = `Related/${targetLabel(t)}`;
    link.textDecoration = "UNDERLINE";
    row.appendChild(link);
  }
}

export async function buildGuidelines(kit: Kit, page: PageNode, lib: Library): Promise<FrameNode> {
  const pos = takeOver(page, ROOT);
  const root = frame(ROOT, {
    gap: space(kit, "space/24"),
    padding: space(kit, "space/48"),
    width: 1120,
    fill: color(kit, "surface/background"),
  });
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");
  page.appendChild(root);
  if (pos) {
    root.x = pos.x;
    root.y = pos.y;
  }

  const header = frame("Header", { gap: space(kit, "space/8") });
  root.appendChild(header);
  header.layoutSizingHorizontal = "FILL";
  header.appendChild(await text(kit, "Guidelines", "Display"));
  await para(
    kit, header,
    "The rules Sterling's components follow, and that screens built from them should follow too. " +
      (DOCS_TARGET === "storybook"
        ? "Each component has an entry under Component usage that links to the rules that apply to it. " +
          "The component's documentation link in Assets opens the same guidance in Storybook. "
        : "Each component's documentation link opens its entry under Component usage, which links to the rules that apply to it. ") +
      `For complete compositions, see the ${PATTERNS_PAGE} page.`
  );

  // ---------------------------------------------------------------- Principles
  const principlesText = guideline("Principles");
  const principles = await section(kit, root, principlesText);
  if (principlesText.table) await docTable(kit, principles, "Principles table", principlesText.table.headers, principlesText.table.rows, [160, 420]);

  // ---------------------------------------------------------------- Accessibility
  const a11yText = guideline("Accessibility");
  const a11y = await section(kit, root, a11yText);
  await definitions(kit, a11y, a11yText.rules, 180);
  const colorOnly = cells(kit, lib, "Color only", "numeric", ["1.25%", "0.80%"]);
  const rows = colorOnly.children as InstanceNode[];
  for (const [i, inst] of rows.entries()) {
    const value = inst.findOne((n) => n.name === "Value" && n.type === "TEXT") as TextNode | null;
    if (value) bindFill(value, color(kit, i === 0 ? "finance/gain" : "finance/loss"));
  }
  const signed = frame("Glyph and sign", {});
  for (const [type, v] of [["gain", "+1.25%"], ["loss", "−0.80%"]]) {
    const c = variantOf(lib.bodyCell, { Type: type, State: "default" }).createInstance();
    signed.appendChild(c);
    setProps(c, { Value: v });
  }
  await pair(kit, a11y, lib, a11yText, 0, signed, colorOnly);
  const labeled = variantOf(lib.textInput, { State: "default", Content: "value" }).createInstance();
  setProps(labeled, { Label: "Reference", Value: "REF-0042", "Show helper": false });
  const unlabeled = variantOf(lib.textInput, { State: "default", Content: "value" }).createInstance();
  setProps(unlabeled, { Label: "Reference", Value: "REF-0042", "Show label": false, "Show helper": false });
  await pair(kit, a11y, lib, a11yText, 1, labeled, unlabeled);

  // ---------------------------------------------------------------- Data display
  const dataText = guideline("Data display");
  const data = await section(kit, root, dataText);
  await definitions(kit, data, dataText.rules, 180);
  await pair(kit, data, lib, dataText, 0,
    cells(kit, lib, "Right aligned", "numeric", ["1,250.00", "84.50", "12,100.00"]),
    cells(kit, lib, "Left aligned", "text", ["1,250.00", "84.50", "12,100.00"]));
  await pair(kit, data, lib, dataText, 1,
    cells(kit, lib, "Text truncates", "text", ["Item with a very long descriptive name"]),
    cells(kit, lib, "Number truncated", "text", ["12,345,678,901.25"]));

  // ---------------------------------------------------------------- Naming
  const namingText = guideline("Naming");
  const naming = await section(kit, root, namingText);
  await definitions(kit, naming, namingText.rules, 180);

  // ---------------------------------------------------------------- States
  const statesText = guideline("States");
  const states = await section(kit, root, statesText);
  await definitions(kit, states, statesText.rules, 180);

  // ---------------------------------------------------------------- Color
  const colorText = guideline("Color");
  const colorSection = await section(kit, root, colorText);
  await definitions(kit, colorSection, colorText.rules, 180);
  const danger = variantOf(lib.button, { Kind: "danger", Size: "md", State: "default" }).createInstance();
  setProps(danger, { Label: "Delete" });
  const sellColored = variantOf(lib.button, { Kind: "primary", Size: "md", State: "default" }).createInstance();
  setProps(sellColored, { Label: "Delete" });
  bindFill(sellColored, color(kit, "finance/sell"));
  await pair(kit, colorSection, lib, colorText, 0, danger, sellColored);

  // ---------------------------------------------------------------- Icons
  const iconsText = guideline("Icons");
  const iconSection = await section(kit, root, iconsText);
  await definitions(kit, iconSection, iconsText.rules, 180);
  const iconRow = frame("Icon set", { direction: "HORIZONTAL", gap: space(kit, "space/16"), wrap: true });
  iconSection.appendChild(iconRow);
  iconRow.layoutSizingHorizontal = "FILL";
  for (const [name, icon] of lib.icons) {
    const cell = frame(name, { align: "CENTER", gap: space(kit, "space/4"), width: 88 });
    iconRow.appendChild(cell);
    cell.appendChild(icon.createInstance());
    cell.appendChild(await text(kit, name, "Caption", "text/secondary"));
  }
  await relatedLinks(kit, iconSection, ICON_DOC.related);

  // ---------------------------------------------------------------- Component usage
  // One entry per published component, named "Component/<name>": each component's documentation link opens
  // its own entry here when DOCS_TARGET is "figma" (library/docLinks.ts).
  const usage = await section(kit, root, {
    name: "Component usage",
    summary:
      "One entry per component: what it is, when to use it, when to use something else, and the rules that apply. " +
      (DOCS_TARGET === "storybook"
        ? "Each component's documentation link opens its Docs page in Storybook, with the same guidance."
        : "Each component's documentation link opens its entry here."),
  });
  const componentsPage = figma.root.children.find((p) => p.name === "Components");
  for (const [name, d] of Object.entries(COMPONENT_DOCS)) {
    const entry = frame(`Component/${name}`, {
      gap: space(kit, "space/8"),
      padding: { y: space(kit, "space/16") },
      stroke: color(kit, "border/default"),
      strokeSides: { top: 1 },
    });
    usage.appendChild(entry);
    entry.layoutSizingHorizontal = "FILL";
    entry.appendChild(await text(kit, name, "Heading"));
    await para(kit, entry, d.description, "Body", "text/primary");
    // Live preview: the variants the registry lists for this component, or its default variant.
    const main = componentsPage?.findOne((n) => (n.type === "COMPONENT_SET" || n.type === "COMPONENT") && n.name === name);
    const sources: ComponentNode[] =
      main?.type === "COMPONENT_SET"
        ? d.preview ? d.preview.map((props) => variantOf(main, props)) : [main.defaultVariant]
        : main ? [main as ComponentNode] : [];
    if (sources.length) {
      const preview = frame("Preview", {
        direction: "HORIZONTAL",
        gap: space(kit, "space/16"),
        padding: space(kit, "space/16"),
        fill: color(kit, "surface/background"),
        radius: space(kit, "radius/sm"),
      });
      entry.appendChild(preview);
      for (const source of sources) preview.appendChild(source.createInstance());
    }
    await para(kit, entry, d.details);
    await definitions(kit, entry, [["Use when", sentence(d.use)], ["Don't use when", sentence(d.dont)]], 140);
    if (d.related.length) await relatedLinks(kit, entry, d.related);
  }

  const footer = frame("Footer", {});
  root.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";
  await para(kit, footer, "Text from definitions/guidelines.ts, drawn by the plugin. Redrawn on every run — change the source, not this frame.", "Caption");

  if (pos) updated("Page Guidelines");
  else created("Page Guidelines content");
  return root;
}
