// Guidelines page: Sterling's design principles and rules — accessibility, data display, naming,
// states, color, icons, and component usage — with do / don't pairs built from Sterling instances. Domain-neutral.
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
import { created, updated } from "../../core/log";

const ROOT = "Guidelines";

const PRINCIPLES: string[][] = [
  ["Variants", "Used for differences in structure, state, type, and size", "Including choices that properties could handle multiplies variants beyond what's maintainable"],
  ["Properties", "Expose what product designers need to change", "Too few — product designers detach it"],
  ["", "Expose only what actually varies", "Too many — combinations the author never intended"],
  ["", "Prevent invalid combinations", "Allow invalid combinations"],
  ["", "Names match code", "Poor naming conventions"],
  ["Structure", "Flexible sizing with auto layout", "Fixed sizing; text overflows instead of wrapping"],
  ["", "Variables controlled by modes", "Hard-coded values"],
  ["", "Clean, named layers", "Overly complex nesting and poor naming"],
  ["", "Object-oriented abstractions (grid composed of child components)", "A single component for a complex pattern (grid)"],
  ["Coverage", "States, by control type — hover, focus, disabled, selected (interactive controls); error (inputs, status); loading, empty (data views)", "Missing states (e.g., no hover on a button)"],
  ["", "Edge cases — long text, negative numbers, large values, empty data", "Missing edge cases (e.g., negative numbers)"],
  ["", "Accessibility — visible focus, contrast in every mode, signals beyond color (icon, sign, or label)", "Color as the only signal (e.g., gain/loss in green/red only)"],
  ["Code alignment", "Designed with engineering, so it can be built", "Designs that can't be built"],
  ["", "Props shared with code — one definition", "Property names drift from code"],
  ["", "Stable API once released", "Breaking changes after release — removing properties or restructuring layers resets overrides on component instances"],
  ["Documentation", "Use when / don't use when guidance", "Lack of guidance leads to misuse (e.g., switch vs. checkbox)"],
  ["Ownership", "Named owner and contribution process", "No owner, so teams build their own variations"],
];

async function section(kit: Kit, root: FrameNode, name: GuidelineSection, summary: string): Promise<FrameNode> {
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

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
  const principles = await section(
    kit, root, "Principles",
    "A good component is easy to use correctly and hard to use incorrectly. This table lays out both positive and negative design principles."
  );
  await docTable(kit, principles, "Principles table", ["Principle", "Good", "Bad"], PRINCIPLES, [160, 420]);

  // ---------------------------------------------------------------- Accessibility
  const a11y = await section(kit, root, "Accessibility", "Visible focus, contrast in every mode, and signals beyond color.");
  await definitions(kit, a11y, [
    ["Focus", "Every interactive control has a focus variant (State = focus, or a combined -focus value) with a 2px focus/ring outline. It sits outside the control (3px) by default; inside for grid cells, header cells, and tabs, which touch their neighbours; and 1px inside the warning or error border on flagged cells, so both stay visible. The outline is its own layer, so focus never shifts the layout."],
    ["Contrast in every mode", "Text needs 4.5:1, and large text and UI graphics (icons, borders, focus rings) need 3:1 — in Light and Dark. Every pair a component uses is listed in tokens.json contrast.rules, and npm run contrast must pass. Disabled content is exempt (WCAG 1.4.3)."],
    ["Never color alone", "Pair every color signal with an icon, sign, or label: status chips have a tone icon; gain and loss cells show ▲ / ▼ and a + / − sign; side chips say Buy or Sell; errors and warnings add an icon and helper text; selected rows also check their checkbox; selected tabs add an underline and a bold label."],
    ["Labels and names", "Every field has a visible label. Hide it (Show label off) only when a visible label sits right next to the field, and give the field an accessible name in code. Icon buttons always set Label: it's the accessible name and the tooltip."],
    ["Loading", "Skeleton bars are decorative. Pair them with \"Loading…\" text, and mark the region aria-busy in code."],
  ], 180);
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
  await doDont(kit, a11y, lib.icons, "Gain and loss: glyph and sign, not just green and red",
    { node: signed, note: "Gain / loss cells add ▲ / ▼ and the sign, so the direction reads without color." },
    { node: colorOnly, note: "Color alone: unreadable for color-blind users, in grayscale, and on some displays." });
  const labeled = variantOf(lib.textInput, { State: "default", Content: "value" }).createInstance();
  setProps(labeled, { Label: "Reference", Value: "REF-0042", "Show helper": false });
  const unlabeled = variantOf(lib.textInput, { State: "default", Content: "value" }).createInstance();
  setProps(unlabeled, { Label: "Reference", Value: "REF-0042", "Show label": false, "Show helper": false });
  await doDont(kit, a11y, lib.icons, "Fields: always a visible label",
    { node: labeled, note: "The label stays visible while the field has a value, and names the field for assistive tech." },
    { node: unlabeled, note: "No label: once a value is entered, nothing says what the field is." });

  // ---------------------------------------------------------------- Data display
  const data = await section(kit, root, "Data display", "Numbers are the content: never hide digits, and line them up.");
  await definitions(kit, data, [
    ["Truncate text, never numbers", "Text (labels, names, text cell values) truncates with an ellipsis at a max width. Numbers never truncate — hidden digits are a risk in financial data."],
    ["Size numeric columns", "Width = characters × 7.5 + 24, rounded up to 8 (numericColumnWidth() in the plugin); add 16 for the gain / loss glyph, or for the warning / error icon in a column whose cells can be flagged. Size for the longest value the column can hold."],
    ["Tabular figures, right aligned", "Numeric columns use the Numeric style (tabular figures) and right alignment, so digits line up. Numeric headers are right-aligned too."],
    ["Column widths", "Size numeric and identifier columns (IDs, codes, reference numbers) to their values. When a grid has room to spare, only descriptive text columns (names, notes, reasons) stretch to take it up."],
    ["Sort indicators", "Only the sorted column shows a sort icon: ↑ ascending, ↓ descending. An unsorted, sortable header shows no icon at rest and reveals ⇕ on hover and on keyboard focus, so a grid shows at most one sort icon at rest. Sortability stays discoverable through that hover and focus icon and a pointer cursor; in code, set aria-sort on the sorted header. Turn Show sort off for a column that can't be sorted."],
    ["Sort icon position", "The sort icon always sits next to its label: immediately after a left-aligned label, immediately before a right-aligned one. A right-aligned label stays flush with the values below it."],
    ["Headers in this library", "The Figma header cell approximates that rule: its label fills the cell, so the icon sits at the cell's edge. For numeric columns, size the column to its values (numericColumnWidth()) and the icon lands beside the label; in a left-aligned column the icon stays at the right edge. The coded header keeps the icon beside the label at any width."],
    ["Grids are data tables", "Sterling's grids are for reading, sorting, selecting, and acting in bulk, so in code a grid is a table: Tab moves between the header sort buttons and the row checkboxes, and screen readers use their table commands. Cell-by-cell arrow keys (an interactive grid) are for editable cells or cells with several controls. Focus variants are for future editable cells; read-only grids show focus on header buttons and row checkboxes only."],
    ["Chips and density", "Chips keep a fixed size; density changes the row around them. That holds for status and side chips. A filter chip is a control, so it follows the small control height like a small button."],
    ["Compact notation in summaries", "Summary metrics show a compact value (e.g. $12.35B) with the full value in Detail."],
    ["Tabs, views, filters", "Tabs separate scopes; views are named filter sets; every applied filter is a chip; criteria that define a dataset are not filters."],
  ], 180);
  await doDont(kit, data, lib.icons, "Numeric columns: right aligned, tabular figures",
    { node: cells(kit, lib, "Right aligned", "numeric", ["1,250.00", "84.50", "12,100.00"]), note: "Right-aligned tabular figures: units, tens, and decimals line up, so values compare at a glance." },
    { node: cells(kit, lib, "Left aligned", "text", ["1,250.00", "84.50", "12,100.00"]), note: "Left-aligned: magnitudes don't line up, so 84.50 looks as big as 1,250.00." });
  await doDont(kit, data, lib.icons, "Truncate text, never numbers",
    { node: cells(kit, lib, "Text truncates", "text", ["Item with a very long descriptive name"]), note: "Text may truncate: the full value is in a tooltip or detail view." },
    { node: cells(kit, lib, "Number truncated", "text", ["12,345,678,901.25"]), note: "A truncated number hides digits — size the column for the longest value instead." });

  // ---------------------------------------------------------------- Naming
  const naming = await section(kit, root, "Naming", "Names match code, and stay stable once released.");
  await definitions(kit, naming, [
    ["Components", "Every component sits under a slash folder (Controls, Chip, Grid, Icon, Input, Overlay, Summary, Tabs) with a self-describing last segment, because the Assets panel shows leaf names. Turn on Show subfolders in the Assets panel to browse by folder."],
    ["Properties", "Sentence case in Figma, one-to-one with camelCase code props (Show icon ↔ showIcon). Kind = visual style · Tone = semantic color · Size = dimensions · State = the element's UI state · Status = a condition of the data · Checked = checkbox value · Show … = every boolean."],
    ["Layers", "Keep layer names stable (Label, Value, Icon, Glyph). Overrides follow layer names, so renaming a layer resets instance overrides for it."],
    ["Renames", "Figma has no property aliases, so rename in place: the plugin renames existing variants (legacyVariantName) and properties (previousNames), keeping every instance linked with its variant and overrides."],
  ], 180);

  // ---------------------------------------------------------------- States
  const states = await section(kit, root, "States", "Every state a control needs, in one State property, with no invalid combinations.");
  await definitions(kit, states, [
    ["Coverage by control type", "Interactive controls: default, hover, pressed, focus, disabled, and selected where it applies. Inputs and cells: error and warning. Data views: loading and empty."],
    ["One State axis", "State holds the element's UI state — interaction, plus selection and validation where the element has them. Conditions of the data use Status (e.g. Summary metric over-target)."],
    ["Combined values", "Where two states happen together, add a combined value instead of a second axis: selected-hover (rows, cells), error-focus and warning-focus (inputs, cells), selected-focus (tabs)."],
    ["Flags stay visible", "A warning or error cell keeps its tinted fill, border, and icon while its row is hovered or selected. A flag is never hidden by another state."],
    ["No invalid combinations", "Every combination of variant properties exists and looks right (e.g. Summary metric has all four Status × State variants; loading looks the same for both Statuses)."],
  ], 180);

  // ---------------------------------------------------------------- Color
  const colorSection = await section(kit, root, "Color", "Semantic color variables, bound everywhere, with distinct meanings.");
  await definitions(kit, colorSection, [
    ["Actions vs data", "Buy / Sell are actions (blue / coral); Gain / Loss are data (green / crimson). Keep the two pairs distinct so an action never reads as a result."],
    ["Destructive actions", "Danger buttons and icon buttons use status/critical, never finance/sell, so Sell never looks destructive."],
    ["Solid fills", "text/inverse is the foreground on every solid fill; dark-mode fills are light enough to take dark text."],
    ["Bind, don't paint", "Use Color variables, never raw hex. Switch a frame's Color mode (Light / Dark) instead of recoloring."],
  ], 180);
  const danger = variantOf(lib.button, { Kind: "danger", Size: "md", State: "default" }).createInstance();
  setProps(danger, { Label: "Delete" });
  const sellColored = variantOf(lib.button, { Kind: "primary", Size: "md", State: "default" }).createInstance();
  setProps(sellColored, { Label: "Delete" });
  bindFill(sellColored, color(kit, "finance/sell"));
  await doDont(kit, colorSection, lib.icons, "Destructive actions use critical, not Sell",
    { node: danger, note: "Danger uses status/critical, so it can't be mistaken for a Sell action." },
    { node: sellColored, note: "Sell coral on a delete button: traders learn coral means Sell, so this reads as a trade." });

  // ---------------------------------------------------------------- Icons
  const iconSection = await section(kit, root, "Icons", "A small set of outline glyphs that take their size and color from where they're used.");
  await definitions(kit, iconSection, [
    ["Size", "16px by default. Parent components bind icon width and height to Density → icon/size (12 / 16 / 16) or a size/* step; do the same when you place an icon yourself."],
    ["Color", "Icons have no color of their own: the component using one recolors its Glyph layer with a Color variable. When you place an icon yourself, bind its color to a Color variable (text/secondary for decoration, a status/*-strong color for meaning) so it follows Light/Dark."],
    ["Meaning", "An icon is never the only signal. Pair it with a label, or give an icon-only control an accessible name (Controls/Icon button's Label)."],
    ["Use when", sentence(ICON_DOC.use)],
    ["Don't use when", sentence(ICON_DOC.dont)],
    ["More icons", "Sterling's Icon/* set is small. If an icon library is enabled in the file (e.g. Material Symbols), use its icons too: size them to 16 (or bind to icon/size) and bind their color to a Color variable so they follow Light/Dark. Button's Icon property can swap to any icon via the instance swap menu."],
  ], 180);
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
  const usage = await section(
    kit, root, "Component usage",
    "One entry per component: what it is, when to use it, when to use something else, and the rules that apply. " +
      (DOCS_TARGET === "storybook"
        ? "Each component's documentation link opens its Docs page in Storybook, with the same guidance."
        : "Each component's documentation link opens its entry here.")
  );
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
  await para(kit, footer, "Generated from the plugin (src/guidelines.ts). Redrawn on every run — change the source, not this frame.", "Caption");

  if (pos) updated("Page Guidelines");
  else created("Page Guidelines content");
  return root;
}
