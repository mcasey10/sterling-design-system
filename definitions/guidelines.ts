// Guidelines and Patterns text: the one table for the rules on the Guidelines page and the guidance on the
// Patterns page. Plain data, shared by the Figma plugin (which draws the pages and builds the examples) and
// the machine-readable export in ai/ (ui/scripts/export-ai.ts).
//   • GUIDELINES — one entry per section of the Guidelines page, in page order: its summary, its rules (a term
//     and its text), its do / don't pairs (the notes under each example), and, for Principles, a table.
//     Component usage isn't here: it is drawn from the component entries in docRegistry.ts.
//   • PATTERNS — one entry per pattern, in page order: its summary, when to use it and when not to, and its
//     numbered steps. A step's label marks a region of the composition; its note explains that region.
// The examples themselves (the instances in a do / don't pair or a composition) are built by the plugin:
// plugin/src/library/pages/guidelines.ts and patterns.ts. Text there is found by position, so keep the
// order of do / don't pairs and steps in step with those files.

import { ICON_DOC } from "./docRegistry";
import type { GuidelineSection, PatternName } from "./docRegistry";

/** A do / don't pair: the rule it shows, and the note under each example. */
export interface DoDont {
  title: string;
  do: string;
  dont: string;
}

export interface Guideline {
  name: Exclude<GuidelineSection, "Component usage">;
  summary: string;
  /** A table shown instead of rules (Principles). The first column groups rows: "" continues the group above. */
  table?: { headers: string[]; rows: string[][] };
  /** Term and text, in page order. */
  rules: [string, string][];
  doDont: DoDont[];
}

export interface PatternDoc {
  name: PatternName;
  summary: string;
  /** Completes "Use when …". */
  use: string;
  /** Completes "Don't use when …". */
  dont: string;
  /** Numbered from 1: the label above a region of the composition, and the note with the same number. */
  steps: [label: string, note: string][];
}

/** "starting a data view" → "Starting a data view": turns a "use when" phrase into a sentence. */
export const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const GUIDELINES: Guideline[] = [
  {
    name: "Principles",
    summary: "A good component is easy to use correctly and hard to use incorrectly. This table lays out both positive and negative design principles.",
    table: {
      headers: ["Principle", "Good", "Bad"],
      rows: [
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
      ],
    },
    rules: [],
    doDont: [],
  },
  {
    name: "Accessibility",
    summary: "Visible focus, contrast in every mode, and signals beyond color.",
    rules: [
      ["Focus", "Every interactive control has a focus variant (State = focus, or a combined -focus value) with a 2px focus/ring outline. It sits outside the control (3px) by default; inside for grid cells, header cells, and tabs, which touch their neighbours; and 1px inside the warning or error border on flagged cells, so both stay visible. The outline is its own layer, so focus never shifts the layout."],
      ["Contrast in every mode", "Text needs 4.5:1, and large text and UI graphics (icons, borders, focus rings) need 3:1 — in Light and Dark. Every pair a component uses is listed in tokens.json contrast.rules, and npm run contrast must pass. Disabled content is exempt (WCAG 1.4.3)."],
      ["Never color alone", "Pair every color signal with an icon, sign, or label: status chips have a tone icon; gain and loss cells show ▲ / ▼ and a + / − sign; side chips say Buy or Sell; errors and warnings add an icon and helper text; selected rows also check their checkbox; selected tabs add an underline and a bold label."],
      ["Labels and names", "Every field has a visible label. Hide it (Show label off) only when a visible label sits right next to the field, and give the field an accessible name in code. Icon buttons always set Label: it's the accessible name and the tooltip."],
      ["Loading", "Skeleton bars are decorative. Pair them with \"Loading…\" text, and mark the region aria-busy in code."],
    ],
    doDont: [
      {
        title: "Gain and loss: glyph and sign, not just green and red",
        do: "Gain / loss cells add ▲ / ▼ and the sign, so the direction reads without color.",
        dont: "Color alone: unreadable for color-blind users, in grayscale, and on some displays.",
      },
      {
        title: "Fields: always a visible label",
        do: "The label stays visible while the field has a value, and names the field for assistive tech.",
        dont: "No label: once a value is entered, nothing says what the field is.",
      },
    ],
  },
  {
    name: "Data display",
    summary: "Numbers are the content: never hide digits, and line them up.",
    rules: [
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
    ],
    doDont: [
      {
        title: "Numeric columns: right aligned, tabular figures",
        do: "Right-aligned tabular figures: units, tens, and decimals line up, so values compare at a glance.",
        dont: "Left-aligned: magnitudes don't line up, so 84.50 looks as big as 1,250.00.",
      },
      {
        title: "Truncate text, never numbers",
        do: "Text may truncate: the full value is in a tooltip or detail view.",
        dont: "A truncated number hides digits — size the column for the longest value instead.",
      },
    ],
  },
  {
    name: "Naming",
    summary: "Names match code, and stay stable once released.",
    rules: [
      ["Components", "Every component sits under a slash folder (Controls, Chip, Grid, Icon, Input, Overlay, Summary, Tabs) with a self-describing last segment, because the Assets panel shows leaf names. Turn on Show subfolders in the Assets panel to browse by folder."],
      ["Properties", "Sentence case in Figma, one-to-one with camelCase code props (Show icon ↔ showIcon). Kind = visual style · Tone = semantic color · Size = dimensions · State = the element's UI state · Status = a condition of the data · Checked = checkbox value · Show … = every boolean."],
      ["Layers", "Keep layer names stable (Label, Value, Icon, Glyph). Overrides follow layer names, so renaming a layer resets instance overrides for it."],
      ["Renames", "Figma has no property aliases, so rename in place: the plugin renames existing variants (legacyVariantName) and properties (previousNames), keeping every instance linked with its variant and overrides."],
    ],
    doDont: [],
  },
  {
    name: "States",
    summary: "Every state a control needs, in one State property, with no invalid combinations.",
    rules: [
      ["Coverage by control type", "Interactive controls: default, hover, pressed, focus, disabled, and selected where it applies. Inputs and cells: error and warning. Data views: loading and empty."],
      ["One State axis", "State holds the element's UI state — interaction, plus selection and validation where the element has them. Conditions of the data use Status (e.g. Summary metric over-target)."],
      ["Combined values", "Where two states happen together, add a combined value instead of a second axis: selected-hover (rows, cells), error-focus and warning-focus (inputs, cells), selected-focus (tabs)."],
      ["Flags stay visible", "A warning or error cell keeps its tinted fill, border, and icon while its row is hovered or selected. A flag is never hidden by another state."],
      ["No invalid combinations", "Every combination of variant properties exists and looks right (e.g. Summary metric has all four Status × State variants; loading looks the same for both Statuses)."],
    ],
    doDont: [],
  },
  {
    name: "Color",
    summary: "Semantic color variables, bound everywhere, with distinct meanings.",
    rules: [
      ["Actions vs data", "Buy / Sell are actions (blue / coral); Gain / Loss are data (green / crimson). Keep the two pairs distinct so an action never reads as a result."],
      ["Destructive actions", "Danger buttons and icon buttons use status/critical, never finance/sell, so Sell never looks destructive."],
      ["Solid fills", "text/inverse is the foreground on every solid fill; dark-mode fills are light enough to take dark text."],
      ["Bind, don't paint", "Use Color variables, never raw hex. Switch a frame's Color mode (Light / Dark) instead of recoloring."],
    ],
    doDont: [
      {
        title: "Destructive actions use critical, not Sell",
        do: "Danger uses status/critical, so it can't be mistaken for a Sell action.",
        dont: "Sell coral on a delete button: traders learn coral means Sell, so this reads as a trade.",
      },
    ],
  },
  {
    name: "Icons",
    summary: "A small set of outline glyphs that take their size and color from where they're used.",
    rules: [
      ["Size", "16px by default. Parent components bind icon width and height to Density → icon/size (12 / 16 / 16) or a size/* step; do the same when you place an icon yourself."],
      ["Color", "Icons have no color of their own: the component using one recolors its Glyph layer with a Color variable. When you place an icon yourself, bind its color to a Color variable (text/secondary for decoration, a status/*-strong color for meaning) so it follows Light/Dark."],
      ["Meaning", "An icon is never the only signal. Pair it with a label, or give an icon-only control an accessible name (Controls/Icon button's Label)."],
      ["Use when", sentence(ICON_DOC.use)],
      ["Don't use when", sentence(ICON_DOC.dont)],
      ["More icons", "Sterling's Icon/* set is small. If an icon library is enabled in the file (e.g. Material Symbols), use its icons too: size them to 16 (or bind to icon/size) and bind their color to a Color variable so they follow Light/Dark. Button's Icon property can swap to any icon via the instance swap menu."],
    ],
    doDont: [],
  },
];

export const PATTERNS: PatternDoc[] = [
  {
    name: "Filters, grid, and bulk actions",
    summary: "The core data screen: narrow a large set of records, compare them in a grid, and act on a selection.",
    use: "people find, compare, and act on many records of the same kind (orders, positions, inventory).",
    dont: "there are only a handful of records (use a list or cards), or one record is being edited (use a form).",
    steps: [
      [
        "Filters panel",
        "Filters sit on the left (2 of 12 columns). Inputs and selects narrow the rows. Apply runs the query. Reset returns every field to the active saved view's filters, or empty if no view is active. Placeholders give examples, never labels.",
      ],
      [
        "View and applied filters",
        "The View dropdown picks a named filter set (plus columns and sort); Save view saves the current one. Every applied filter is a chip, in sync with the panel: removing a chip clears its field, Clear all removes them all. No tabs here — tabs are for separate datasets (scopes), not for status views.",
      ],
      [
        "Bulk action bar (only while rows are selected)",
        "The bulk action bar appears only while rows are selected, directly above the grid, and pushes the grid down — it never covers rows. Danger actions use status/critical.",
      ],
      [
        "Grid",
        "In the grid, numeric columns are right-aligned with tabular figures; selected rows are tinted and checked; problem cells are flagged with a border and an icon.",
      ],
      [
        "Pagination",
        "Pagination sits under the grid; Previous is disabled on the first page.",
      ],
    ],
  },
  {
    name: "Bulk action bar",
    summary: "What the bar above a grid says and offers as the selection changes. It appears only while rows are selected, directly above the grid, and pushes the grid down.",
    use: "people act on several rows at once (approve, export, delete).",
    dont: "an action applies to one row (put it in the row), or nothing can be selected (a read-only view has no bar).",
    steps: [
      [
        "Some rows selected",
        "The count says how many rows are selected, in words. The bar has no checkbox: selecting every row on the page is the checkbox in the grid's header, and Clear selection is a button. Select all N matching extends the selection to every row that matches the filters, not only the page shown.",
      ],
      [
        "All matching rows selected",
        "Once everything matching is selected, the count says so and the Select all link is hidden. Before a destructive action on this selection, ask for confirmation: it reaches rows the person can't see (see Confirmation dialog).",
      ],
      [
        "An action that can't apply to this selection",
        "When an action can't apply to the selection, keep it in place, disabled, and say why in the hint beside it (Show hint). In code, link the hint to the button with aria-describedby.",
      ],
      [
        "Read-only view",
        "A read-only view has no checkboxes and no bar. Danger actions use status/critical; reversible ones use a secondary button.",
      ],
    ],
  },
  {
    name: "Filter panel and chips",
    summary: "A panel sets the filters; chips above the grid show what's applied. The two always agree.",
    use: "a grid has several filterable columns and people combine filters.",
    dont: "there's one simple filter (put a select or a search field in the toolbar), or the condition defines the dataset itself (that's a criterion, not a filter).",
    steps: [
      [
        "Filter panel",
        "The panel has one field per commonly filtered column; Add filter offers the rest. Apply runs the query. Reset returns every field to the active saved view's filters, or empty if no view is active. Clear all removes every filter. Placeholders give an example of the expected value, never the label.",
      ],
      [
        "Applied filters as chips",
        "Every applied filter shows as a chip in plain words (Status is Open). Removing a chip clears its field in the panel, and choosing a view fills both. Changing the filters marks the view as edited (see Saved views).",
      ],
    ],
  },
  {
    name: "Saved views",
    summary: "A view is a named filter set, plus its columns and sort. People pick one from the View menu and can save their own.",
    use: "people come back to the same few filter sets (my items, flagged, large amounts).",
    dont: "the filters are one-off (chips are enough), or the choice switches to a different dataset (use tabs).",
    steps: [
      [
        "View menu, open",
        "The menu groups predefined views and the person's own. Each option shows its filter set in muted text, so people know what they'll get before choosing. A view can also add columns.",
      ],
      [
        "An edited view: Save view is enabled",
        "Changing a view's filters keeps its name and adds \"· edited\". Save view becomes available and saves the current filter set under Saved by me. Reset returns to the view's own filters; Clear all removes every filter.",
      ],
      [
        "An unchanged view: Save view is disabled",
        "While a view is unchanged, Save view stays visible but disabled, so its place doesn't shift.",
      ],
    ],
  },
  {
    name: "Status chips",
    summary: "A status chip says what state a record is in, with a tone, an icon, and one or two words.",
    use: "a record has a small set of states that people scan for (active, pending, flagged, blocked, draft).",
    dont: "the value is a number or free text, or the chip would show an applied filter (use a filter chip).",
    steps: [
      [
        "One tone per meaning",
        "Positive: done or healthy. Info: in progress. Warning: needs attention. Critical: blocked or failed. Neutral: inactive or draft. Each tone has its own icon, so the status never depends on color alone.",
      ],
      [
        "In a grid",
        "In a grid, status gets its own column, sized to the longest label. Use the same word for the same state everywhere.",
      ],
      [
        "Long labels truncate",
        "Keep labels to one or two words. Longer labels truncate at 160px, so put detail in a neighboring column, not in the chip.",
      ],
    ],
  },
  {
    name: "Warning and exception cells",
    summary: "How a grid flags one value that needs attention or breaks a rule, without relying on color.",
    use: "one value in a row is outside a rule or limit, and people need to find it and see why.",
    dont: "the whole row has a state (use a status chip), or the grid couldn't load (use the error state).",
    steps: [
      [
        "Normal, warning, error",
        "Warning marks a value that's allowed but needs attention; error marks one that blocks the action. Both add a border and an icon, and use darker ink on the tinted background.",
      ],
      [
        "With keyboard focus",
        "The focus ring sits inside the flag's border, so a focused cell still shows that it's flagged.",
      ],
      [
        "Say why, next to the value",
        "Say why in the row: a reason in a neighboring column, with the full rule in a tooltip. In code, include the reason in the cell's accessible name. Size the column with the icon allowance (numericColumnWidth with icon), so flagged values fit.",
      ],
    ],
  },
  {
    name: "Confirmation dialog",
    summary: "A dialog that asks before an action that can't be undone, or that reaches further than the person can see.",
    use: "the action is irreversible (delete), or it applies to rows beyond the visible page (all 120 matching).",
    dont: "the action is small and reversible: do it and offer Undo. Confirming everything teaches people to click through.",
    steps: [
      [
        "An action that can't be undone",
        "The title asks the question, with the count. The primary button repeats the verb and the count, never \"OK\". Destructive actions use the danger button. Cancel is always there, and Escape closes the dialog.",
      ],
      [
        "A selection that goes beyond the page",
        "A reversible action needs confirmation only when the selection goes beyond what's visible. The body says what's included and how to undo it.",
      ],
      [
        "Over the screen, which is dimmed",
        "The dialog is modal: it sits in the middle of the screen it was opened from, and surface/scrim dims everything behind it, which can't be used until the dialog closes.",
      ],
    ],
  },
  {
    name: "Form layout",
    summary: "Create or edit one record: a single column of labeled fields, validation under each field, and one primary action.",
    use: "creating or editing a single record with a few fields (a ticket, a setting, an order note).",
    dont: "editing many records at once (use the grid and bulk actions), or a long process (split it into steps).",
    steps: [
      [
        "Labels above, full width",
        "One column, labels above the fields, fields full width: the eye moves straight down, and labels stay visible while typing.",
      ],
      [
        "Placeholder is an example",
        "Placeholder text is an example of the expected value, never the label — it disappears as soon as someone types.",
      ],
      [
        "Error under the field (error-focus while fixing)",
        "Errors appear under the field with an icon and specific, fixable text. While the field is focused it keeps the red border and adds the focus ring (State = error-focus).",
      ],
      [
        "Warning doesn't block saving",
        "Warnings (amber, with an icon) flag something to check but don't block saving; errors do.",
      ],
      [
        "Checkbox with its label",
        "Outside a grid, checkboxes show their label (Show label on), so the whole label is the click target.",
      ],
      [
        "Actions",
        "Actions sit at the bottom right: one primary action, with the secondary to its left.",
      ],
    ],
  },
  {
    name: "Loading, empty, and error states",
    summary: "What a data view shows before, instead of, or when it fails to show rows. Keep the header and filters so context isn't lost.",
    use: "any data view that loads asynchronously or can come back empty.",
    dont: "only some rows have problems (flag those cells instead), or filtering is local and instant (under ~300 ms, show nothing).",
    steps: [
      [
        "Loading",
        "Loading: after ~300 ms, show skeleton rows under the real header, so the layout doesn't jump when rows arrive. Turn on the first row's label (\"Loading rows…\") and mark the grid aria-busy in code. Summary metrics use State = loading.",
      ],
      [
        "Empty (no results)",
        "Empty: say why there are no rows and offer the way out — Clear filters for no results; for nothing yet, say what will appear and how to add it.",
      ],
      [
        "Error",
        "Error: say what failed and offer Retry. The critical tone shows in the icon and title, not just color. Keep the header and filters so nothing is lost.",
      ],
    ],
  },
];

/** A Guidelines section's text. Throws for a name with no entry, so a missing section fails the build. */
export function guideline(name: Guideline["name"]): Guideline {
  const found = GUIDELINES.find((g) => g.name === name);
  if (!found) throw new Error(`No guideline text for "${name}" in definitions/guidelines.ts`);
  return found;
}

/** A pattern's text. Throws for a name with no entry. */
export function patternDoc(name: PatternName): PatternDoc {
  const found = PATTERNS.find((p) => p.name === name);
  if (!found) throw new Error(`No pattern text for "${name}" in definitions/guidelines.ts`);
  return found;
}
