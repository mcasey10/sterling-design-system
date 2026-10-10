// Components page. Unlike Foundations, nothing here is deleted and redrawn: the page
// frame, sections, and component sets are matched by name and updated in place so
// instances used elsewhere stay linked and keep their overrides.

import { Kit, color, space, pinMode, PLUGIN_KEY, configureFrame, doc, frame, text, setSize, density, numericColumnWidth } from "../../core/helpers";
import { ensureFrame, ensureText, ensureComponentSet, variantOf, setProps } from "../../core/ensure";
import { buildIcons, IconIndex } from "../icons";
import { buttonSpec } from "../components/button";
import { statusChipSpec } from "../components/statusChip";
import { checkboxSpec } from "../components/checkbox";
import {
  headerCellSpec, bodyCellSpec, rowSpec, buildGrid, buildPagination, buildSkeletonRow, emptyStateSpec, GENERIC_DATA, gridWidth,
} from "../components/grid";
import { iconButtonSpec } from "../components/iconButton";
import { sideChipSpec } from "../components/sideChip";
import { optionSpec, buildMenu, optionDescriptionSpec, buildMenuHeading } from "../components/menu";
import { linkSpec } from "../components/link";
import { buildDialog } from "../components/dialog";
import { tabSpec } from "../components/tabs";
import { buildBulkActionBar, GENERIC_BAR } from "../components/bulkActionBar";
import { filterChipSpec } from "../components/filterChip";
import { summaryMetricSpec } from "../components/summaryMetric";
import { textInputSpec, selectSpec } from "../components/inputs";
import { COLLECTIONS } from "../../core/variables";
import { tokens } from "../../core/tokens";
import { created } from "../../core/log";

const ROOT = "Components";

async function ensureSection(kit: Kit, root: FrameNode, index: number, title: string, description: string) {
  const section = ensureFrame(root, `Section/${title}`, { gap: space(kit, "space/16") }, index);
  const header = ensureFrame(section, "Header", { gap: space(kit, "space/4") }, 0);
  await ensureText(kit, header, "Title", title, "Title", "text/primary", 0);
  await ensureText(kit, header, "Description", description, "Body", "text/secondary", 1);
  return section;
}

interface EdgeSets {
  headerCell: ComponentSetNode;
  checkbox: ComponentSetNode;
  button: ComponentSetNode;
  chip: ComponentSetNode;
  filterChip: ComponentSetNode;
  tab: ComponentSetNode;
  bodyCell: ComponentSetNode;
  textInput: ComponentSetNode;
  select: ComponentSetNode;
  summaryMetric: ComponentSetNode;
}

async function setLayerText(inst: InstanceNode, layer: string, chars: string) {
  const t = inst.findOne((n) => n.type === "TEXT" && n.name === layer) as TextNode | null;
  if (!t || t.characters === chars) return;
  await figma.loadFontAsync(t.fontName as FontName);
  t.characters = chars;
}

/**
 * Edge-case test instances: long labels, long / negative / large / empty values. They show the
 * truncation and max-width rules working. Rebuilt each run (instances only, nothing references them).
 */
async function buildEdgeCases(kit: Kit, root: FrameNode, index: number, sets: EdgeSets) {
  const section = await ensureSection(
    kit, root, index, "Edge cases",
    "Test instances for long text, negative and large numbers, and empty values. Labels and values truncate with an ellipsis instead of overflowing."
  );
  for (const c of [...section.children]) if (c.name === "Cases") c.remove();
  const cases = frame("Cases", { gap: space(kit, "space/16") });
  section.appendChild(cases);
  const row = async (title: string) => {
    const r = frame(title, { gap: space(kit, "space/8") });
    cases.appendChild(r);
    r.appendChild(await text(kit, title, "Label", "text/secondary"));
    const items = frame("Items", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/16") });
    r.appendChild(items);
    return items;
  };

  const labels = await row("Long labels");
  const btn = variantOf(sets.button, { Kind: "primary", Size: "md", State: "default" }).createInstance();
  labels.appendChild(btn);
  setProps(btn, { Label: "Apply changes to all selected items" });
  const chip = variantOf(sets.chip, { Tone: "info" }).createInstance();
  labels.appendChild(chip);
  setProps(chip, { Label: "Awaiting counterparty confirmation" });
  const filterChip = variantOf(sets.filterChip, { State: "default" }).createInstance();
  labels.appendChild(filterChip);
  setProps(filterChip, { Label: "Owner: Operations and Settlement Team (West region)" });
  const tab = variantOf(sets.tab, { State: "default" }).createInstance();
  labels.appendChild(tab);
  setProps(tab, { Label: "Items awaiting secondary review", Count: "1,204" });
  const box = variantOf(sets.checkbox, { Checked: "on", State: "default" }).createInstance();
  labels.appendChild(box);
  setProps(box, { Label: "Include items from archived accounts", "Show label": true });

  const header = await row("Header cells: long labels truncate at the cell width (200px); the sort icon sits at the cell edge");
  for (const align of ["left", "right"]) {
    const headCell = variantOf(sets.headerCell, { Sort: "asc", Align: align, State: "default" }).createInstance();
    header.appendChild(headCell);
    setSize(headCell, 200, density(kit, "row/height"));
    setProps(headCell, { Label: align === "left" ? "Average days since last review" : "Average outstanding balance" });
  }

  // Each sample gets a caption so the rule it shows is explicit.
  const sample = async (parent: FrameNode, caption: string, node: SceneNode) => {
    const f = frame(caption, { gap: space(kit, "space/4") });
    parent.appendChild(f);
    f.appendChild(await text(kit, caption, "Caption", "text/secondary"));
    f.appendChild(node);
  };
  const cell = (type: string, state: string, value: string, width = 120) => {
    const c = variantOf(sets.bodyCell, { Type: type, State: state }).createInstance();
    setProps(c, { Value: value });
    setSize(c, width, density(kit, "row/height"));
    return c;
  };

  const texts = await row("Text cells truncate");
  texts.counterAxisAlignItems = "MIN";
  await sample(texts, "Long text (120)", cell("text", "default", "Item with a very long descriptive name"));
  await sample(texts, "Empty value", cell("text", "default", "—"));

  const numbers = await row("Numeric cells never truncate — size the column: width = characters × 7.5 + 24, rounded up to 8");
  numbers.counterAxisAlignItems = "MIN";
  const large = "12,345,678,901.25";
  await sample(numbers, "Negative (fits 120)", cell("numeric", "default", "-1,250,000.00"));
  await sample(numbers, `Large in 120 — don't: digits spill out`, cell("numeric", "default", large));
  await sample(numbers, `Large, column sized by rule (${numericColumnWidth(large)})`, cell("numeric", "default", large, numericColumnWidth(large)));
  await sample(numbers, "Warning, icon stays next to the number", cell("numeric", "warning", "-35.00"));

  const deltas = await row("Gain and loss cells: ▲ / ▼ plus the sign, never color alone; flagged cells use the -strong ink");
  deltas.counterAxisAlignItems = "MIN";
  await sample(deltas, "Gain", cell("gain", "default", "+1.25%"));
  await sample(deltas, "Loss", cell("loss", "default", "−0.80%"));
  await sample(deltas, "Large loss, column sized by rule", cell("loss", "default", "−1,250,000.00", numericColumnWidth("−1,250,000.00", { icon: true })));
  await sample(deltas, "Loss with error-focus", cell("loss", "error-focus", "−12.40%"));

  const inputs = await row("Inputs: long values");
  inputs.counterAxisAlignItems = "MIN";
  const textInput = variantOf(sets.textInput, { State: "default", Content: "value" }).createInstance();
  inputs.appendChild(textInput);
  setProps(textInput, { Label: "Reference", Value: "A value much longer than the field can show", "Show helper": false });
  const selectInput = variantOf(sets.select, { State: "default", Content: "value" }).createInstance();
  inputs.appendChild(selectInput);
  setProps(selectInput, { Label: "Category", Value: "An option with a very long name", "Show helper": false });
  const emptyInput = variantOf(sets.textInput, { State: "default", Content: "placeholder" }).createInstance();
  inputs.appendChild(emptyInput);
  setProps(emptyInput, { Label: "Search", Placeholder: "Search by ID, name, or a long description", "Show helper": false });

  const metrics = await row("Summary metric: the value never truncates — use compact notation, full value in Detail");
  metrics.counterAxisAlignItems = "MIN";
  const bigMetric = variantOf(sets.summaryMetric, { Status: "normal", State: "default" }).createInstance();
  metrics.appendChild(bigMetric);
  setProps(bigMetric, { Label: "Total amount across all open items" });
  await setLayerText(bigMetric, "Value", "$12.35B");
  await setLayerText(bigMetric, "Detail", "Full value: $12,345,678,901.25");
  const negative = variantOf(sets.summaryMetric, { Status: "normal", State: "default" }).createInstance();
  metrics.appendChild(negative);
  setProps(negative, { Label: "Change since last period", "Show progress": false });
  await setLayerText(negative, "Value", "−3.2%");
  await setLayerText(negative, "Detail", "▼ Down from 4.1%");
  const loadingMetric = variantOf(sets.summaryMetric, { Status: "normal", State: "loading" }).createInstance();
  metrics.appendChild(loadingMetric);
  setProps(loadingMetric, { Label: "Total amount across all open items" });
}

/** Reusable components that the Template and example pages instance or build on. */
export interface Library {
  icons: IconIndex;
  button: ComponentSetNode;
  chip: ComponentSetNode;
  checkbox: ComponentSetNode;
  headerCell: ComponentSetNode;
  bodyCell: ComponentSetNode;
  row: ComponentSetNode;
  filterChip: ComponentSetNode;
  summaryMetric: ComponentSetNode;
  textInput: ComponentSetNode;
  select: ComponentSetNode;
  bulkActionBar: ComponentNode;
  exampleGrid: ComponentNode;
  pagination: ComponentNode;
  tab: ComponentSetNode;
  iconButton: ComponentSetNode;
  sideChip: ComponentSetNode;
  option: ComponentSetNode;
  menu: ComponentNode;
  skeletonRow: ComponentNode;
  emptyState: ComponentSetNode;
  link: ComponentSetNode;
  optionDescription: ComponentSetNode;
  menuHeading: ComponentNode;
  dialog: ComponentNode;
}

export async function buildComponentsPage(kit: Kit, page: PageNode): Promise<{ root: FrameNode; lib: Library }> {
  let root = page.children.find((n) => n.name === ROOT && n.type === "FRAME") as FrameNode | undefined;
  if (!root) {
    root = figma.createFrame();
    root.name = ROOT;
    page.appendChild(root);
    created("Page Components content");
  }
  configureFrame(root, {
    gap: space(kit, "space/48"),
    padding: space(kit, "space/48"),
    fill: color(kit, "surface/background"),
  });
  root.setPluginData(PLUGIN_KEY, "generated");
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");

  const header = ensureFrame(root, "Header", { gap: space(kit, "space/8") }, 0);
  await ensureText(kit, header, "Title", "Components", "Display", "text/primary", 0);
  await ensureText(
    kit,
    header,
    "Description",
    "Generated from tokens/tokens.json and updated in place on each run — instances stay linked. " +
      "Switch this frame's Color or Density mode to preview Dark or Compact/Comfortable.",
    "Body",
    "text/secondary",
    1
  );

  // Icons first: the other components instance them.
  const iconSection = await ensureSection(
    kit, root, 1, "Icons",
    "16px outline glyphs. Parent components recolor the Glyph layer and size instances with icon/size."
  );
  const grid = ensureFrame(iconSection, "Icons/Grid", { direction: "HORIZONTAL", gap: space(kit, "space/24"), wrap: true, width: 960 }, 1);
  const icons = await buildIcons(kit, page, grid);

  const button = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 2, "Button", "Kind (primary / secondary / ghost / danger) × Size (sm / md) × State (default / hover / pressed / focus / disabled)."),
    1, buttonSpec(kit, icons)
  );
  const iconButton = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 3, "Icon button",
      "Square, icon-only actions for dense rows and toolbars. Label is the accessible name (hidden layer). Danger for destructive row actions."),
    1, iconButtonSpec(kit, icons)
  );
  const link = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 4, "Link",
      "Inline text link, always underlined so it doesn't rely on color. For navigation and shortcuts such as \"Filter: Status is Exception\"."),
    1, linkSpec(kit)
  );
  const chip = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 5, "Status chip", "Positive / warning / critical / info / neutral. The icon keeps status from relying on color alone."),
    1, statusChipSpec(kit, icons)
  );
  const sideChip = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 6, "Side chip",
      "Buy / sell side of an order or trade. The label carries the meaning; Buy/Sell hues stay distinct from Gain/Loss."),
    1, sideChipSpec(kit)
  );
  const checkbox = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 7, "Checkbox", "Checked: off / on / indeterminate. Show label adds a label for use outside the grid."),
    1, checkboxSpec(kit, icons)
  );

  // Data grid: cells first, then a generic row and grid built from them. Worked examples
  // build their own rows and grids from the same cells (see src/example/).
  const gridSection = await ensureSection(
    kit, root, 8, "Data grid",
    "Header cell, body cell (including gain / loss), a generic row and data grid (placeholder data), pagination, and the loading " +
      "(skeleton row) and empty / error states. Row height and cell padding follow Density. " +
      "For a new screen, override Grid/Data grid's cell values or build rows from Grid/BodyCell."
  );
  const deps = { icons, chip, checkbox };
  const headerCell = await ensureComponentSet(kit, page, gridSection, 1, headerCellSpec(kit, deps));
  const bodyCell = await ensureComponentSet(kit, page, gridSection, 2, bodyCellSpec(kit, deps));
  const row = await ensureComponentSet(kit, page, gridSection, 3, rowSpec(kit, bodyCell, {
    name: "Grid/Row",
    description: doc(
      "State (default / hover / selected / selected-hover). A checkbox cell plus generic columns, built from Grid/BodyCell instances.",
      "assembling a grid: one Row instance per record, overriding cell values.",
      "a single value needs a different state — override that cell instead of adding row variants.",
      { guidelines: ["States"], patterns: ["Filters, grid, and bulk actions"] }
    ),
    data: GENERIC_DATA,
  }));
  const exampleGrid = await buildGrid(kit, page, gridSection, 4, { header: headerCell, row, checkbox }, {
    name: "Grid/Data grid",
    description: doc(
      "Generic grid with placeholder data: one selected row and one cell in the error state. Override values per screen.",
      "starting a data view quickly; override headers and cell values, or rebuild rows from Grid/Row.",
      "the layout isn't tabular (use cards or a list).",
      { guidelines: ["Data display"], patterns: ["Filters, grid, and bulk actions", "Loading, empty, and error states"] }
    ),
    data: GENERIC_DATA,
  });
  const width = gridWidth(GENERIC_DATA);
  const pagination = await buildPagination(kit, page, gridSection, 5, button, width);
  const skeletonRow = await buildSkeletonRow(kit, page, gridSection, 6, GENERIC_DATA);
  const emptyState = await ensureComponentSet(kit, page, gridSection, 7, emptyStateSpec(kit, { icons, button }, width));

  const bulkSection = await ensureSection(
    kit, root, 9, "Bulk action bar",
    "N selected · Select all matching, plus actions. Rename the action buttons from the instance; Show destructive toggles the danger action."
  );
  const bulkActionBar = await buildBulkActionBar(kit, page, bulkSection, 1, { button, checkbox, icons }, width, GENERIC_BAR);
  const filterChip = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 10, "Filter chip", "Applied filter; Show remove toggles the x icon."),
    1, filterChipSpec(kit, icons)
  );
  const summaryMetric = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 11, "Summary metric",
      "Label, value, and progress vs. target. Over-target adds a warning icon and text; State = loading shows a skeleton and \"Loading…\"."),
    1, summaryMetricSpec(kit, icons)
  );
  const inputs = await ensureSection(
    kit, root, 12, "Inputs",
    "Text input and select: default / hover / focus / error / error-focus / warning / disabled × value / placeholder. " +
      "Select adds open, with Input/Menu (a list of Input/Option) under the field. Option with description and Menu heading " +
      "build grouped menus (e.g. saved views)."
  );
  const textInput = await ensureComponentSet(kit, page, inputs, 1, textInputSpec(kit, icons));
  const option = await ensureComponentSet(kit, page, inputs, 2, optionSpec(kit, icons));
  const menu = await buildMenu(kit, page, inputs, 3, option);
  const select = await ensureComponentSet(kit, page, inputs, 4, selectSpec(kit, icons, menu));
  const optionDescription = await ensureComponentSet(kit, page, inputs, 5, optionDescriptionSpec(kit, icons));
  const menuHeading = await buildMenuHeading(kit, page, inputs, 6);
  const tab = await ensureComponentSet(
    kit, page,
    await ensureSection(kit, root, 13, "Tabs", "View switcher with a count badge. Selected adds an underline and bold label; selected-focus adds the focus ring."),
    1, tabSpec(kit)
  );

  const dialog = await buildDialog(
    kit, page,
    await ensureSection(kit, root, 14, "Dialog",
      "Modal container: Title, a Body slot for each instance's content, and Cancel / Primary actions."),
    1, { button, iconButton, icons }
  );

  await buildEdgeCases(kit, root, 15, { headerCell, button, chip, checkbox, filterChip, tab, bodyCell, textInput, select, summaryMetric });

  return {
    root,
    lib: {
      icons, button, chip, checkbox, headerCell, bodyCell, row, filterChip, summaryMetric, textInput, select,
      bulkActionBar, exampleGrid, pagination, tab, iconButton, sideChip, option, menu, skeletonRow, emptyState,
      link, optionDescription, menuHeading, dialog,
    },
  };
}
