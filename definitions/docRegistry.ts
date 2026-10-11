// Documentation registry: the one table for every published component's documentation. Plain data, shared
// by the Figma plugin (descriptions, documentation links, usage notes) and the coded layer (Docs pages).
//   • description — exactly one sentence. It's the component's Figma description, shown in the Assets
//     Details panel (click a component in Assets), the Component documentation panel, and Dev Mode.
//     People read it; no check or build logic parses it.
//   • details — variants, properties, and rules, shown in the component's usage note on the Components page.
//   • use / dont — "Use when" / "Don't use when", shown in the usage note and in the component's own entry
//     under Guidelines › Component usage.
//   • related — the Guidelines sections and Patterns with rules that apply to it, linked from its entry.
//   • docs — optional. By default a component's documentation link opens its own entry under
//     Guidelines › Component usage; set docs to send it elsewhere (e.g. a Storybook URL later).
// Components whose names start with "_" (demo and example components) aren't published and need no entry.

/** Sections of the Guidelines page; each is a frame named "Guideline/<section>". */
export type GuidelineSection =
  | "Principles" | "Accessibility" | "Data display" | "Naming" | "States" | "Color" | "Icons" | "Component usage";
/** Patterns on the Patterns page; each is a frame named "Pattern/<name>". */
export type PatternName =
  | "Filters, grid, and bulk actions" | "Bulk action bar" | "Filter panel and chips" | "Saved views" | "Status chips"
  | "Warning and exception cells" | "Confirmation dialog" | "Form layout" | "Loading, empty, and error states";

export type DocTarget =
  | { page: "Guidelines"; section: GuidelineSection }
  | { page: "Guidelines"; component: string }
  | { page: "Patterns"; pattern: PatternName }
  | { url: string };

export interface ComponentDoc {
  description: string;
  details: string;
  use: string;
  dont: string;
  related: DocTarget[];
  docs?: DocTarget;
  /**
   * Variants shown side by side in the component's entry under Guidelines › Component usage (variant
   * property → value). Default: the component's default variant alone.
   */
  preview?: Record<string, string>[];
}

/** A component's documentation with its link target resolved. */
export type ResolvedDoc = ComponentDoc & { docs: DocTarget };

const guidelines = (section: GuidelineSection): DocTarget => ({ page: "Guidelines", section });
const patterns = (pattern: PatternName): DocTarget => ({ page: "Patterns", pattern });

const FIELD_LABEL_NOTE =
  "Hide the label (Show label off) only when a visible label sits right next to the field, and give the field an " +
  "accessible name in code.";
const fieldDetails = (select: boolean) =>
  `${select ? "Select" : "Text input"} with label and helper text. State: default / hover / focus / ` +
  (select ? "open (menu below the field, covering the helper) / " : "") +
  "error / error-focus / warning / warning-focus / disabled; error and warning add an icon and colored " +
  "helper text, and a flagged field keeps its border when focused, with the focus ring outside it. Content: value / " +
  "placeholder (Placeholder text in text/secondary). Label, Value, Placeholder, Helper, Show label, and Show helper are " +
  "component properties; long values truncate. Field height follows Density → control/height.";

/** Every published component except icons (see ICON_DOC), keyed by component name. */
export const COMPONENT_DOCS: Record<string, ComponentDoc> = {
  "Controls/Button": {
    description: "Triggers an action, in primary, secondary, ghost, or danger style.",
    details:
      "Kind × Size × State (default / hover / pressed / focus / disabled). Label, Show icon, and Icon are component " +
      "properties. Height and padding follow the Density mode. Danger uses status/critical, never finance/sell.",
    use:
      "triggering an action. One primary per area; secondary for alternatives; ghost in dense toolbars and bulk bars; " +
      "danger for destructive actions.",
    dont: "navigating to another page (use a link), toggling a setting (use a checkbox), or Buy/Sell trade actions styled with danger.",
    related: [guidelines("Accessibility"), guidelines("Color"), guidelines("Naming")],
  },
  "Controls/Icon button": {
    description: "A square, icon-only button for well-known actions in dense rows and toolbars.",
    details:
      "Kind (secondary / ghost / danger) × Size (sm / md) × State (default / hover / pressed / focus / disabled). Square, " +
      "sized to the control height (Density). Icon is an instance swap; Label is the accessible name — its layer is " +
      "hidden, so set it to the action (\"Delete row\") and use it as aria-label and tooltip in code. Danger uses status/critical.",
    use: "a well-known action in a dense row or toolbar (more, delete, edit, refresh), with a tooltip.",
    dont: "the action isn't obvious from the icon (use Controls/Button with a label), or it's the main action of the area.",
    related: [guidelines("Accessibility"), guidelines("Color")],
  },
  "Controls/Link": {
    description: "An always-underlined text link for navigation and for shortcuts such as applying a filter.",
    details:
      "Inline text link. Size (sm = Label 12 / md = Body 13) × State (default / hover / focus). Label is a text property. " +
      "Always underlined in accent/default (accent/hover on hover), so it never relies on color alone; focus adds the outside ring.",
    use: "navigating, or applying a shortcut such as a filter (\"Filter: Status is Exception\"), from within text or a summary panel.",
    dont: "the action changes data (use Controls/Button), or it's the main action of an area.",
    related: [guidelines("Accessibility"), guidelines("Color")],
  },
  "Chip/Status": {
    description: "Shows a record's status with a tone color, an icon, and a short label.",
    details:
      "Tone (positive / warning / critical / info / neutral) with a tone-specific icon. Label and Show icon are component " +
      "properties; labels longer than 160px truncate. Colors: status/<tone>-subtle background, status/<tone>-strong text and icon.",
    use: "showing the status of a record (in a grid cell, card, or header). Keep labels to one or two words.",
    dont: "the status is an applied filter (use Chip/Filter), or the chip would be the only signal — keep the icon or label visible.",
    related: [patterns("Status chips"), guidelines("Accessibility")],
  },
  "Chip/Side": {
    description: "Shows the buy or sell side of an order or trade.",
    details:
      "Side (buy / sell) of an order or trade. The label carries the meaning; override it with B / S in tight columns. " +
      "Colors: finance/<side>-subtle background, finance/<side>-strong text.",
    use: "showing the side of an order, trade, or position in a grid cell or ticket header (swap a Type = chip cell's Chip to this).",
    dont: "showing gain or loss (use a gain / loss cell), or as a Buy / Sell action (use Controls/Button).",
    related: [guidelines("Color"), guidelines("Accessibility")],
  },
  "Controls/Checkbox": {
    description: "Selects rows or options, with off, on, and indeterminate values.",
    details:
      "Checked (off / on / indeterminate) × State (default / hover / focus / disabled). Checked states use accent/default " +
      "with a text/inverse glyph; focus adds a focus/ring outline. Label and Show label (off by default) add a visible " +
      "label for use outside the grid; in a grid row the row itself labels the checkbox.",
    use: "selecting rows or items for a bulk action, or choosing any number of options (turn Show label on outside the grid).",
    dont: "the choice applies immediately like an on/off setting (use a switch), or only one option can be chosen (use a radio or select).",
    related: [guidelines("Accessibility"), guidelines("States"), patterns("Form layout")],
  },
  "Grid/HeaderCell": {
    description: "Labels a grid column, with optional sorting and left or right alignment.",
    details:
      "Sort (none / asc / desc) × Align (left / right) × State (default / hover / focus). Label and Show sort are " +
      "component properties. Only a sorted header (asc / desc) shows its icon at rest; an unsorted one reveals ⇕ on hover " +
      "and focus, so a grid shows at most one sort icon. Show sort off means the column can't be sorted. The sort icon " +
      "belongs next to its label, and a right-aligned label stays flush with the numbers. In this component the label fills " +
      "the cell and truncates at its width, so the icon sits at the cell edge: size numeric columns to their values and it " +
      "lands beside the label. " +
      "Height follows Density → row/height.",
    use: "labeling a grid column; use Align = right for numeric columns so headers line up with the numbers.",
    dont: "the column can't be sorted — turn Show sort off rather than using a different header.",
    preview: [
      { Sort: "none", Align: "left", State: "default" },
      { Sort: "asc", Align: "left", State: "default" },
    ],
    related: [guidelines("Data display"), guidelines("Accessibility"), patterns("Filters, grid, and bulk actions")],
  },
  "Grid/BodyCell": {
    description: "One grid cell for text, numbers, gain or loss, a chip, or a checkbox, in every row and validation state.",
    details:
      "Type (text / numeric / gain / loss / chip / checkbox) × State (default / hover / selected / selected-hover / focus / " +
      "warning / warning-focus / error / error-focus). Numeric, gain and loss cells are right-aligned in the Numeric style and " +
      "never truncate (size the column instead); text values truncate. Gain and loss add ▲ / ▼ and finance/gain / loss — type " +
      "the sign in Value (+1.25%, −0.80%). Warning and error add a border and an icon, so they never rely on color alone, " +
      "and a flagged cell keeps its look while its row is hovered or selected. " +
      "Focus variants are for future editable cells; read-only grids show focus on header buttons and row checkboxes only. " +
      "Chip and Checkbox are exposed nested instances; swap the Chip to Chip/Side for buy / sell.",
    use: "building custom rows or tables from individual cells, or overriding one cell's state (e.g. a value that breaks a rule).",
    dont: "you need a whole row — use Grid/Row, which keeps cell widths and states consistent.",
    related: [patterns("Warning and exception cells"), guidelines("Data display"), guidelines("States"), guidelines("Accessibility"), guidelines("Color")],
  },
  "Grid/Row": {
    description: "One grid row of body cells, in default, hover, selected, and selected-hover states.",
    details: "State (default / hover / selected / selected-hover). A checkbox cell plus generic columns, built from Grid/BodyCell instances.",
    use: "assembling a grid: one Row instance per record, overriding cell values.",
    dont: "a single value needs a different state — override that cell instead of adding row variants.",
    related: [guidelines("States"), patterns("Filters, grid, and bulk actions")],
  },
  "Grid/Data grid": {
    description: "A generic data grid with placeholder rows, to override or rebuild for a real dataset.",
    details: "Generic grid with placeholder data: two selected rows and one cell in the error state. Override values per screen.",
    use: "starting a data view quickly; override headers and cell values, or rebuild rows from Grid/Row.",
    dont: "the layout isn't tabular (use cards or a list).",
    related: [guidelines("Data display"), patterns("Filters, grid, and bulk actions"), patterns("Loading, empty, and error states")],
  },
  "Grid/Pagination": {
    description: "Shows the visible range under a grid, with Previous and Next buttons.",
    details:
      "Footer under the grid. Range and Page are text properties; Previous and Next are exposed Button instances, " +
      "so their State (e.g. disabled on the first or last page) is set from this component's panel.",
    use: "a grid shows one page of a larger result set.",
    dont: "all rows fit on screen, or the list scrolls continuously — omit pagination.",
    related: [patterns("Filters, grid, and bulk actions")],
  },
  "Grid/Skeleton row": {
    description: "A placeholder row shown while grid rows load.",
    details:
      "Loading placeholder with the grid's column widths: surface/skeleton bars, numeric bars right-aligned. Show label " +
      "adds a \"Loading rows…\" label (Label text property) — turn it on for the first row. Mark the grid aria-busy in code.",
    use: "rows are loading: stack 3–5 under the header, matching the expected row count.",
    dont: "a load takes under ~300 ms (show nothing), or the load failed or returned nothing (use Grid/Empty state).",
    related: [guidelines("Accessibility"), patterns("Loading, empty, and error states")],
  },
  "Grid/Empty state": {
    description: "Takes the place of grid rows when there are no results or loading failed.",
    details:
      "Shown in place of grid rows. Tone (neutral / critical): neutral for no results or nothing yet, critical for a load " +
      "error (icon and title say so, not just color). Title and Message are text layers — override the copy; swap the icon " +
      "from the instance. Show action toggles the exposed Action button (Clear filters / Retry).",
    use: "a grid has no rows to show — filters match nothing, nothing exists yet, or loading failed.",
    dont: "rows are still loading (use Grid/Skeleton row), or only some rows have problems (flag those cells).",
    related: [guidelines("Accessibility"), patterns("Loading, empty, and error states")],
  },
  "Grid/BulkActionBar": {
    description: "Shows the selection count and the actions for the selected grid rows.",
    details:
      "Shown above a grid while rows are selected. The count is text: select-all is the checkbox in the grid's header, so the " +
      "bar has no checkbox of its own. Count and Select all are text properties; Show select all hides the " +
      "Select all link (e.g. once all matching rows are selected); Show destructive toggles the danger action. Hint and " +
      "Show hint (off by default) explain why an action is disabled. Action buttons are exposed instances — rename them " +
      "and set their state from the bar instance.",
    use: "one or more grid rows are selected and the actions apply to all of them.",
    dont: "nothing is selected (hide the bar), or an action applies to a single row (put it in the row).",
    related: [patterns("Bulk action bar"), patterns("Filters, grid, and bulk actions"), guidelines("States")],
  },
  "Chip/Filter": {
    description: "Shows one applied filter, with a control to remove it.",
    details:
      "Applied filter, State (default / hover / pressed / focus). Label and Show remove are component properties; labels " +
      "longer than 240px truncate. Height follows Density → control/height-sm.",
    use: "summarizing filters already applied to a view, with a way to remove each one.",
    dont: "showing a record's status (use Chip/Status), or offering filters to apply (use inputs and selects in a filters panel).",
    related: [patterns("Filter panel and chips"), patterns("Filters, grid, and bulk actions"), guidelines("Accessibility")],
  },
  "Summary/Summary metric": {
    description: "Shows one headline number, with an optional progress bar against a target.",
    details:
      "Label, value, and optional progress vs. target. Status (normal / over-target): over-target adds a warning icon and " +
      "text in addition to the bar color. State (default / loading): loading shows a skeleton bar and \"Loading…\" in place " +
      "of the value. Long labels truncate; the value never does — use compact notation " +
      "(e.g. $12.35B) for large numbers and put the full value in Detail. Resize the Bar layer to reflect progress.",
    use: "a single headline number someone checks at a glance, optionally against a target or limit.",
    dont: "comparing many values over time (use a chart or grid), or the number needs row-level detail.",
    related: [guidelines("Data display"), guidelines("States"), patterns("Loading, empty, and error states")],
  },
  "Input/Text": {
    description: "A labeled text field with helper text and validation states.",
    details: fieldDetails(false),
    use: "entering free text or a number (amounts, rates, IDs).",
    dont: `the value comes from a fixed list (use a select). ${FIELD_LABEL_NOTE}`,
    related: [guidelines("Accessibility"), guidelines("States"), patterns("Form layout")],
  },
  "Input/Select": {
    description: "A labeled dropdown for choosing one option from a short list.",
    details: fieldDetails(true),
    use: "choosing one option from a list of about 5–15 known values.",
    dont: `there are only 2–3 options (show them all) or the list is long and searchable (use a combobox). ${FIELD_LABEL_NOTE}`,
    related: [guidelines("Accessibility"), guidelines("States"), patterns("Form layout")],
  },
  "Input/Option": {
    description: "One row in a select's open menu.",
    details:
      "One menu row. State (default / hover / focus / selected / disabled); selected adds a check icon and bold label, and " +
      "focus (the option the arrow keys are on) adds a focus ring inside the row to the hover fill. Label is a " +
      "text property; long labels truncate. Height follows Density → control/height.",
    use: "listing choices in Input/Menu (a select's open list).",
    dont: "the choices act immediately (use a menu of actions) or need multi-select (use checkboxes).",
    related: [guidelines("States"), patterns("Form layout")],
  },
  "Input/Menu": {
    description: "The open list of options shown under a select.",
    details:
      "Open list for Input/Select: a raised panel of Input/Option instances. Options are exposed instances — set each " +
      "one's Label and State from this component's panel; hide extra rows to shorten the list.",
    use: "showing a select's options (it's placed under the field in Input/Select State = open).",
    dont: "the list needs search or grouping beyond ~15 options (use a combobox).",
    related: [patterns("Form layout")],
  },
  "Input/Option with description": {
    description: "A two-line menu row with a label and a muted description.",
    details:
      "Two-line menu row: Label plus a muted Description. State (default / hover / selected / disabled); selected adds a " +
      "check icon and bold label. Label and Description are text properties; both truncate.",
    use: "each choice needs a short explanation — a saved view and its filters, an account and its number.",
    dont: "one line is enough (use Input/Option).",
    related: [patterns("Saved views")],
  },
  "Input/Menu heading": {
    description: "A group heading inside a menu.",
    details: "Group heading inside a menu. Label is a text property. Not interactive.",
    use: "a menu has two or more groups of options (e.g. predefined and saved views).",
    dont: "the menu has a single group — omit the heading.",
    related: [patterns("Saved views")],
  },
  "Tabs/Tab": {
    description: "Switches between views of the same data, with an optional count.",
    details:
      "View switcher above the grid. State: default / hover / focus / disabled / selected / selected-focus. Label, Count, and Show count are " +
      "component properties; long labels truncate. Selected adds an underline and bold label; focus adds a focus/ring outline. " +
      "A selected tab has no hover state: it is already the current view, so pointing at it changes nothing.",
    use: "switching between views of the same data (e.g. All / Open / Closed).",
    dont: "navigating between pages or steps (use navigation), or filtering by many values (use filters).",
    related: [guidelines("States"), guidelines("Accessibility"), patterns("Filters, grid, and bulk actions")],
  },
  "Overlay/Dialog": {
    description: "A modal dialog for one focused task, with a title, a body, and Cancel and primary actions.",
    details:
      "Modal dialog: Title, Show close, a Body slot for the instance's own content, and exposed Cancel and Primary buttons " +
      "(set the primary's label and disabled state from this component's panel). Raised surface with a border.",
    use: "confirming or completing one focused task without leaving the screen (sign off, rename, confirm a destructive action).",
    dont: "the task needs the rest of the screen for reference (use a side panel), or it's only a message (use inline status).",
    related: [patterns("Confirmation dialog"), guidelines("Accessibility"), guidelines("States")],
  },
};

/** Icon/* components share one entry; the description names the icon. */
export const ICON_DOC: Omit<ResolvedDoc, "description"> & { description: (name: string) => string } = {
  description: (name) => `The "${name}" icon, a 16px outline glyph that takes its color from the component using it.`,
  details: "16px outline icon. Parent components recolor the Glyph layer; resize with icon/size or size/*.",
  use: "supporting a label, or as an instance-swap value in Button, Status badge, and similar components.",
  dont: "it's the only way to convey meaning — pair it with text or an accessible name.",
  related: [guidelines("Accessibility")],
  docs: guidelines("Icons"),
};

/**
 * The documentation for a published component, or undefined if the table has no entry for it. Unless the entry
 * sets docs, the link target is the component's own entry under Guidelines › Component usage. Icons share the
 * Guidelines › Icons section.
 */
export function docFor(name: string): ResolvedDoc | undefined {
  if (name.startsWith("Icon/")) {
    const icon = name.slice("Icon/".length);
    return { ...ICON_DOC, description: ICON_DOC.description(icon) };
  }
  const entry = COMPONENT_DOCS[name];
  return entry && { ...entry, docs: entry.docs ?? { page: "Guidelines", component: name } };
}

/** The one-sentence Figma description for a component ("" if missing, which the library checks report). */
export const describe = (name: string) => docFor(name)?.description ?? "";

/** True if a component is published (names starting with "_" or "." are hidden from publishing). */
export const isPublished = (name: string) => !name.startsWith("_") && !name.startsWith(".");

/** Human-readable name of a documentation target, e.g. "Guidelines › Data display". */
export function targetLabel(t: DocTarget): string {
  if ("url" in t) return t.url;
  if (t.page === "Patterns") return `Patterns › ${t.pattern}`;
  return "component" in t ? `Guidelines › Component usage › ${t.component}` : `Guidelines › ${t.section}`;
}

/** The name of the frame a Guidelines or Patterns target points to. */
export function targetFrameName(t: Exclude<DocTarget, { url: string }>): string {
  if (t.page === "Patterns") return `Pattern/${t.pattern}`;
  return "component" in t ? `Component/${t.component}` : `Guideline/${t.section}`;
}

/** True if a description is exactly one sentence: one ending punctuation mark, at the end. */
export function isOneSentence(text: string): boolean {
  const t = text.trim();
  const ends = t.match(/[.!?](?=\s|$)/g) ?? [];
  return t.length > 0 && ends.length === 1 && /[.!?]$/.test(t);
}
