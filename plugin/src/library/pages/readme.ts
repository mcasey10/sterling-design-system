// Read me page: how to use Sterling — what's in it, how to start a new screen, rules,
// and known limitations. Example-specific content (e.g. the loan-pooling workflow) lives on its
// example page instead. Documentation only, so it is rebuilt on each run (at the same position).

import { tokens } from "../../core/tokens";
import { COLLECTIONS } from "../../core/variables";
import { Kit, color, space, frame, text, pinMode, takeOver, ARCHITECTURE_PAGE, GUIDELINES_PAGE, PATTERNS_PAGE } from "../../core/helpers";
import { para, docSection, definitions, steps } from "../../core/docBlocks";
import { created, updated } from "../../core/log";

const ROOT = "Read me";
/** The example's page (built by "Build example"); named here only for the text below. */
const EXAMPLE_PAGE = "Example: Loan pooling";

export async function buildReadme(kit: Kit, page: PageNode): Promise<FrameNode> {
  const pos = takeOver(page, ROOT);
  const root = frame(ROOT, {
    gap: space(kit, "space/24"),
    padding: space(kit, "space/48"),
    width: 960,
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
  header.appendChild(await text(kit, "Sterling", "Display"));
  await para(
    kit, header,
    "A design system for data-dense applications. Everything in this file " +
      "is generated from tokens/tokens.json by a local plugin. All data is hypothetical: names, IDs, and figures are fictional."
  );

  const contents = await docSection(kit, root, "What's in Sterling");
  await definitions(kit, contents, [
    ["Variables", "Primitives (color ramps) · Color (Light, Dark) · Spacing (space, radius) · Size (fixed widths and heights) · Density (Compact, Default, Comfortable). Color aliases Primitives; Density aliases Size and Spacing, so sizes stay on-scale."],
    ["Text styles", "Inter: Display, Title, Heading, Body, Body-strong, Label, Caption, Numeric. Roboto Mono: Code."],
    ["Foundations", "Color swatches for both modes, primitive ramps, type specimens, spacing, radius, and density panels."],
    ["Components", "Icons, Button, Icon button, Status chip, Side chip, Checkbox, data grid (header cell, body cell with gain / loss, row, grid, pagination, skeleton row, empty state), bulk action bar, filter chip, summary metric, text input, select with menu and options, and tabs — with neutral placeholder content, every interactive state, loading and empty states, and an Edge cases section. Each has a one-sentence description, a usage note (details, when to use it, and when not), and a documentation link to its full guidance."],
    [GUIDELINES_PAGE, "Design principles (good vs bad), accessibility, data display, naming, states, color, and icon rules, with do / don't pairs built from Sterling instances, plus Component usage (when to use each component). Each component's documentation link points to one of these sections."],
    [PATTERNS_PAGE, "Complete compositions from Sterling instances, with numbered notes and use / don't-use guidance: filters + grid + bulk actions, form layout, and loading / empty / error states."],
    ["Template", "A blank 1440px desktop skeleton on a 12-column grid: app bar plus empty slots for filters | main content | summary."],
    [ARCHITECTURE_PAGE, "A reference on variants, component properties, slots, and component hierarchy, with working examples."],
    [EXAMPLE_PAGE, "An example built with Sterling: a loan pooling screen for a mortgage guarantor's trading desk, with business context, workflows, and eligibility rules documented on the page. Two screens (Pool loans, Add loans), state frames (filtered view, View menu, Sign off dialog), and an \"About this example\" frame with the workflows, rules, filter model, and steps."],
  ]);

  const usage = await docSection(kit, root, "Starting a new screen");
  await steps(kit, usage, [
    "Go to the Template page and duplicate Template/Desktop 1440 (Ctrl/Cmd + D). Work in the copy; the plugin never touches copies.",
    "Set the copy's Color mode (Light / Dark) and Density mode (Compact / Default / Comfortable) in the right panel to fit the product.",
    "Fill the slots with instances from the Assets panel: inputs and filter chips in Filters; tabs, bulk action bar, grid, and pagination in Main content; summary metrics in Summary. Then delete the slot placeholders. Tip: turn on Show subfolders in the Assets panel's settings menu to browse components by group (Controls, Chip, Grid, Icon, Input, Overlay, Summary, Tabs).",
    "Override labels and values on the instances, and swap variants. For a custom grid, override Grid/Data grid's cell values or build rows from Grid/BodyCell. Don't edit the main components on the Components page.",
    `See ${EXAMPLE_PAGE} for a finished screen built this way.`,
  ]);

  const postBuild = await docSection(kit, root, "After the first build");
  await steps(kit, postBuild, [
    "Turn on tabular figures for the Numeric text style, so digits line up in columns: select the Numeric style, open " +
      "Type settings → Details → Numbers, and set Style to Monospace uppercase/lining. Do this once per file; builds " +
      "leave it alone. The plugin API can't set it, so Build library reminds you in its run report until it's on.",
  ]);

  const tweak = await docSection(kit, root, "Changing Sterling");
  await para(
    kit, tweak,
    "Recolor or resize by changing tokens/tokens.json, running npm run build in plugin/, then rerunning the plugin " +
      "(Plugins → Development → Sterling → Build library). Instances keep their overrides. " +
      "Build example rebuilds only the example page, from the existing library. The repo README covers the details.",
    "Body", "text/primary"
  );

  const rules = await docSection(kit, root, "Rules");
  await definitions(kit, rules, [
    ["Hypothetical data", "No real company names, logos, tickers, or people in data. Public industry background may name real organizations, with a source note. Use obviously fictional names."],
    ["Not color alone", "Status, errors, selection, and gain/loss always pair color with an icon, sign, or label."],
    ["Buy / Sell", "Actions: blue / coral. Gain / Loss (data): green / crimson. Destructive buttons use critical red, never Sell coral."],
    ["Contrast", "Every text/background pair is checked against WCAG (npm run contrast): 4.5:1 for text, 3:1 for UI graphics — including hover, pressed, and selected states."],
    ["Property names", "Figma names are sentence case and map 1:1 to camelCase code props (Show icon ↔ showIcon). Kind = visual style · Tone = semantic color · Size = dimensions · State = the element's UI state (interaction, plus selection and validation where it has them) · Status = a condition of the data · Checked = checkbox value · Show … = every boolean."],
    ["Focus", "Every interactive control has a focus variant with a 2px focus/ring outline. Use it to show keyboard focus in flows and specs."],
    ["More icons", "Sterling's Icon/* set is small. If an icon library is enabled in the file (e.g. Material Symbols), use its icons too: size them to 16 (or bind to icon/size) and bind their color to a Color variable such as text/secondary so they follow Light/Dark. Button's Icon property can swap to any icon via the instance swap menu."],
  ]);

  const limits = await docSection(kit, root, "Known limitations");
  await definitions(kit, limits, [
    ["Tabular figures", "The plugin API can't enable OpenType features on a text style, so tabular figures on Numeric are a one-time manual step (see After the first build)."],
    ["Generated pages", "Read me, Foundations, Guidelines, Patterns, the Component architecture reference sheet, and the example's About frame are redrawn on every run; edits made there by hand are lost."],
  ]);

  const footer = frame("Footer", {});
  root.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";
  await para(kit, footer, "Generated from tokens/tokens.json. Rerun: Plugins → Development → Sterling → Build library.", "Caption");

  if (pos) updated("Page Read me");
  else created("Page Read me content");
  return root;
}
