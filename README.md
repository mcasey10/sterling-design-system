# Sterling Design System

> This README is being rewritten for the 1.0.0 release. The architecture is described in
> [ARCHITECTURE.md](ARCHITECTURE.md).

Sterling is a design system for data-dense applications, generated into Figma by a local
plugin. Everything comes from one file, [`tokens/tokens.json`](tokens/tokens.json). To
change Sterling, edit the tokens and rerun the plugin.

All sample data is made up. There are no real companies, lenders, logos or brands.

This README is for **building and maintaining** Sterling. How to *use* it on a new screen
is on the **Read me** page inside the generated Figma file.

## What it generates

| Collection | Modes | Contents |
|---|---|---|
| Primitives | Value | `neutral` (0–900 + 750), `blue`, `green`, `amber`, `red` (crimson), `coral`. Hidden from publishing and property pickers. |
| Color | Light, Dark | Semantic roles (surface, border, text, accent, focus, selection, status, finance). Every value is an alias of a primitive. |
| Spacing | Value | `space/0, 2, 4, 6, 8, 12, 16, 24, 32, 48` for gap and padding; `radius/none…pill` for corners. Published: applied directly in layouts. |
| Size | Value | `size/4, 12, 16, 20, 24, 32, 40, 56` for fixed widths and heights (icons, checkbox, progress track, checkbox column, app bar), scoped to width and height; `stroke/1, stroke/2` for borders, focus rings and underlines, scoped to stroke width. Published. |
| Density | Compact, Default, Comfortable | Row height, cell padding, control height and padding, gap, icon size. **Every value is an alias** to the Size or Spacing scale (e.g. `row/height` → `size/24 · size/32 · size/40`), never a raw number. |

Sizing works like color: **Color aliases Primitives** per Light/Dark mode, and
**Density aliases Size and Spacing** per density mode, so component sizes can't drift
off-scale. In `tokens.json`, aliases are written as `"{size/32}"` or `"{space/6}"`. Each
run logs every Density alias to the console and warns if any value is a raw number.

**Text styles:** Display, Title, Heading, Body, Body-strong, Label, Caption, Numeric (Inter)
and Code (Roboto Mono).

### Pages

| Page | Reusable? | How it's updated |
|---|---|---|
| **Cover** | Yes | The file's cover: name, tagline, and version, beside a montage of live components. Redrawn every run. |
| **Read me** | Yes | Guide to using Sterling. Redrawn every run, so don't edit it by hand. |
| **Foundations** | Yes | Color swatches (Light and Dark), primitive ramps, type specimens, spacing, radius and density panels, all bound to the variables they show. Redrawn every run. |
| **Components** | Yes | The component library (below), with neutral placeholder content. Updated in place, so instances stay linked and keep their overrides. |
| **Guidelines** | Yes | Design principles (good vs bad table), accessibility, data display, naming, states and color rules, with do / don't pairs built from Sterling instances; icons; and Component usage (one `Component/<name>` entry per component, which its documentation link opens). Each section is a `Guideline/<name>` frame. Redrawn every run. |
| **Patterns** | Yes | Three compositions built only from Sterling instances, each with numbered notes and use / don't-use guidance: filters + grid + bulk actions, form layout, and loading / empty / error states. Redrawn every run. |
| **Template** | Yes | `Template/Desktop 1440`: a blank 1440 × 900 skeleton on a 12-column grid (16px margins and gutters, bound to `space/16`), with an app bar and empty slots for filters (2 cols), main content (8 cols) and summary (2 cols). |
| **Component architecture** | Yes | A reference on component architecture: variants, properties, slots, and hierarchy. See [Component architecture page](#component-architecture-page). |
| **Example: Loan pooling** | No | An example built with Sterling: a loan pooling screen for a mortgage guarantor's trading desk, with business context, workflows, and eligibility rules documented on the page. Built by **Build example**. See [Example: loan pooling](#example-loan-pooling). |

If the file only has an empty "Page 1", it becomes the Cover page. Build example keeps a page divider before the example page.

**Documentation:** every published component's documentation comes from one table,
[`plugin/src/library/docRegistry.ts`](plugin/src/library/docRegistry.ts): a one-sentence description
(shown in the Assets Details panel when you click a component, in the Component documentation
panel, and in Dev Mode), a usage note under the component on the Components page (details, use
when, don't use when), and a documentation link to the component's own entry under Guidelines ›
Component usage, which links on to the related Guidelines sections and Patterns. Links need
the file key (`enablePrivatePluginApi` in the manifest); without it the run logs a warning and the
library checks fail.

### Components

`Icon/*` (20 outline glyphs), `Controls/Button` (Kind × Size × State — default /
hover / pressed / focus / disabled, 40 variants), `Controls/Checkbox` (Checked: off / on /
indeterminate × State: default / hover / focus / disabled; Label and Show label, off by default),
`Chip/Status` (5 tones), and:

| Component | Variants | Notes |
|---|---|---|
| `Controls/Link` | Size (sm / md) × State (default / hover / focus) | Label property; always underlined, so a link isn't shown by color alone |
| `Overlay/Dialog` | — | Title and Show close properties; Body slot for the instance's content; exposed Cancel and Primary buttons |
| `Controls/Icon button` | Kind (secondary / ghost / danger) × Size (sm / md) × State (default / hover / pressed / focus / disabled) | Icon (swap) and Label properties; Label is the accessible name on a hidden layer, so a label never shows |
| `Chip/Side` | Side (buy / sell) | Label text layer ("Buy" / "Sell", or "B" / "S"); finance/buy and finance/sell colors |
| `Grid/HeaderCell` | Sort (none / asc / desc) × Align (left / right) × State (default / hover / focus) | Label and Show sort properties |
| `Grid/BodyCell` | Type (text / numeric / gain / loss / chip / checkbox) × State (default / hover / selected / selected-hover / focus / warning / warning-focus / error / error-focus), 54 variants | Value property; gain / loss add ▲ / ▼ and finance/gain / loss; Chip and Checkbox are exposed nested instances (swap the Chip to Chip/Side for buy / sell); warning and error add a border and icon |
| `Grid/Row` | State (default / hover / selected / selected-hover) | Checkbox cell + generic columns (ID, Name, Amount, Percent, Status) built from BodyCell instances |
| `Grid/Data grid` | — | Generic grid with placeholder data: one selected row, one error cell |
| `Grid/Pagination` | — | Range and Page properties; Previous / Next are exposed Button instances (set disabled on the first or last page) |
| `Grid/Skeleton row` | — | Loading placeholder with the generic grid's column widths (`surface/skeleton` bars); Label and Show label add "Loading rows…" |
| `Grid/Empty state` | Tone (neutral / critical) | No results / nothing yet, or a load error; Title and Message text layers; Show action and an exposed Action button (Clear filters / Retry) |
| `Grid/BulkActionBar` | — | "N selected · Select all M matching" + Clear selection / Export / Delete / Primary action; Count, Select all and Show destructive properties; action buttons are exposed instances, so they can be renamed from the bar |
| `Chip/Filter` | State (default / hover / pressed / focus) | Label and Show remove properties |
| `Summary/Summary metric` | Status (normal / over-target) × State (default / loading) | Label and Show progress properties; over-target adds a warning icon and text; loading shows a skeleton bar and "Loading…" |
| `Input/Text`, `Input/Select` | State (default / hover / focus / error / error-focus / warning / disabled; Select adds open) × Content (value / placeholder) | Label, Value, Placeholder, Helper, Show label, Show helper properties; error and warning add an icon; hide the label only when a visible label sits next to the field |
| `Input/Option` | State (default / hover / selected / disabled) | Label property; selected adds a check icon |
| `Input/Option with description` | State (default / hover / selected / disabled) | Label and Description properties (muted second line, e.g. a saved view's filter) |
| `Input/Menu heading` | — | Label property; group heading inside a menu |
| `Input/Menu` | — | Raised list of five exposed Option instances; Select State = open shows it under the field |
| `Tabs/Tab` | State (default / hover / focus / disabled / selected / selected-focus) | Label, Count and Show count properties; selected adds an underline and bold label |

Fills, strokes, padding, gaps, radii and heights are all bound to variables; grid row
height and cell padding follow the Density mode.

**Truncate text, never numbers.** Text truncates with an ellipsis at a max width; numbers
never truncate, because hidden digits are a risk in financial data.

| Component | Text that truncates | Max width |
|---|---|---|
| `Grid/HeaderCell` | Label (fills the cell; sort icon at the cell edge — right edge for left-aligned, left edge for right-aligned headers) | cell width minus padding and the sort icon |
| `Grid/BodyCell` (text) | Value | fills the cell (cell width − padding) |
| `Grid/BodyCell` (numeric, gain, loss) | — never truncates | hugs; size the column with `numericColumnWidth()`: characters × 7.5 + 24 (+ 16 for the gain / loss glyph), rounded up to 8 |
| `Chip/Status` | Label | 160px |
| `Chip/Filter` | Label | 240px |
| `Tabs/Tab` | Label | 200px (count stays visible) |
| `Input/Text`, `Input/Select` | Value, Placeholder | fills the field (240px field − padding) |
| `Input/Option` | Label | fills the option (240px − padding, minus the check icon) |
| `Summary/Summary metric` | Label | fills the card (220px − 32px padding) |
| `Summary/Summary metric` | — the value never truncates | hugs; use compact notation (e.g. `$12.35B`) and put the full value in Detail |
| `Controls/Button`, bulk bar, pagination | — | no max width; labels hug and the control grows |

The Components page's **Edge cases** section shows each rule: long labels, left- and
right-aligned 200px header cells truncating at the cell width, text cells truncating, numeric cells sized by the column rule
(and one "don't" sized too narrow), and a compact-notation metric.

**Library checks:** each Build library run fails a check ("library checks: N FAILED" in the
notification) if a published component has no registry entry, no description, a description that
isn't exactly one sentence, or no documentation link; if a registry entry has no matching component;
or if a Primitives variable is visible to publishing.

**Focus:** every interactive control (button, checkbox, filter chip, tab, sortable header
cell, inputs) has a focus variant with a 2px `focus/ring` outline. The outline is an
absolutely positioned layer, so it never shifts the layout: it sits 3px outside buttons,
chips and checkboxes, and inside tabs and header cells, which touch their neighbours.

Slash names (`Controls/…`, `Chip/…`, `Grid/…`, `Icon/…`, `Input/…`, `Overlay/…`, `Summary/…`, `Tabs/…`) become folders in the
Assets panel only when **Show subfolders** is turned on in the panel's settings menu;
otherwise Assets shows a flat list of short names (e.g. `HeaderCell`).

**Renaming a component:** add its old name to `previousNames` in its spec. The plugin
then renames the existing component in place on the next run (instances stay linked)
instead of creating a new one.

**Property naming:** Figma names are sentence case and map 1:1 to camelCase code props (Show icon ↔ showIcon). Kind = visual style · Tone = semantic color · Size = dimensions · State = the element's UI state (interaction, plus selection and validation where it has them) · Status = a condition of the data · Checked = checkbox value · Show … = every boolean.

**Renaming a property or value:** Figma has no property aliases, so renames happen in
place. For a variant property or value, return the old variant name(s) from the spec's
`legacyVariantName`; the plugin renames each existing variant node, so instances keep their
link and selected variant. For a boolean, text or instance-swap property, pass the old name
in `ensureProp`'s `previousNames`; the property keeps its ID, so instance overrides survive.

**Link check:** every build records which variant each instance uses, then compares after
the build. **Build library** checks every page it doesn't redraw (Template, Component
architecture, the example page, and any page you add); **Build example** checks the example page. The
closing notification shows "links: N kept, M changed"; any change is listed as a warning in
the console. Instances in documentation frames that are redrawn each run count as rebuilt.

**More icons:** Sterling's `Icon/*` set is deliberately small. Any icon library enabled in
the Figma file (for example Material Symbols) can be used alongside it; size its icons to
16 (or bind to `icon/size`) and bind their color to a Color variable so they follow
Light/Dark.

**Duplicates are safe.** The plugin tracks the original Template frame (and the example
screen) by node ID, so reruns never touch copies. Originals are updated in place, and
layers you add inside them are kept.

### Component architecture page

**Component architecture** explains Figma component architecture with
working examples. Each of its nine sections (variants, text properties, boolean
properties, instance swap, exposed nested instances, slots, mirroring code props,
primitives → composites → patterns, and a decision summary) has a definition, a live
example, numbered callouts with leader lines, a "Use when / Don't use when" box, and a
Dev Mode annotation (category "Component architecture").

- Code: [`plugin/src/library/pages/componentArchitecture.ts`](plugin/src/library/pages/componentArchitecture.ts)
- Its own components, all prefixed `_Demo/` (the underscore hides them from publishing), live
  in the page's **Demo components** frame and are updated in place: `_Demo/Callout`,
  `_Demo/Status badge`, `_Demo/Field`, `_Demo/Filter row`, `_Demo/Filter chip group` and
  `_Demo/Card` (with a Body slot).
- The reference sheet is redrawn every run. It only instances library components; nothing on
  other pages is modified.

### Example: loan pooling

The **Example: Loan pooling** page is a loan pooling screen for a mortgage guarantor's
trading desk, with business context, workflows, and eligibility rules documented on the
page: build **Pool 2026-07** toward a $50.0M target, resolve issues, and submit it. The
About frame opens with the business context (who's involved, how the money flows, why
pools have rules, a glossary) for readers without a mortgage-industry background.

- **Pool loans** (1440 screen): the saved view "Harbor Point loans" (Lender is Harbor Point,
  58 of 186 loans — Ready, Exception, Signed off) in sync across the "Filter pool loans"
  panel and its chip; 3 Ready loans selected for Remove from pool; a Pool summary (totals)
  listing the 3 issues that block Submit pool.
- **Add loans** (1440 screen): "All candidates · edited" with two filters (Lender is not
  Harbor Point, FICO ≥ 700: 36 of 62 candidates), Save view enabled, Eligible / Exception /
  Ineligible rows, and a preview of the pool after adding the 2 selected.
- Tab counts and summary panels show totals; footers and chips show the filtered result.
- **Bulk action bar**: Sign off (on the selected exceptions, with the count; disabled with a hint when
  none are selected), Remove from pool (secondary — reversible; confirms only for all matching), Add
  to pool on Add loans. Example states show a (one exception selected), b (all 58 matching selected),
  b2 (remove confirmation), c (Add loans), and d (a submitted, read-only pool).
- Each build runs the data consistency check and an **action-trigger check** (every action the docs
  name has a visible trigger); the run notification ends with "example checks: pass" or "N FAILED".
- Each grid fills the 8 columns between the panels exactly; Lender is the flexible column.
  Views set columns as well as filters (Exceptions to sign off and Signed off add Sign-off note).
- **Example states**: Pool loans — filtered, View menu (open), Sign off dialog.
- **About this example**: brief, pool and loan workflows, eligibility rules and how they
  appear, the filter model (filter, filter set, view, status; criteria aren't filters),
  steps, and assumptions.
- **Example components** (hidden from publishing): `_Example/Pool loan row`,
  `_Example/Pool loans grid`, `_Example/Exceptions grid`, `_Example/Candidate row`,
  `_Example/Candidate grid`, `_Example/Pool action bar`.

The screens and the About frame read the same data (`loanData.ts`). Each loan's status,
eligibility and exception text are derived from its FICO and LTV, and every build runs
a consistency check (e.g. 181 + 2 + 3 = 186, 56 + 4 + 2 = 62, 60 addable, 3 issues,
preview UPB = pool UPB + selected UPBs); any mismatch is logged as a warning.

- Code: [`plugin/src/example/loan-pooling/`](plugin/src/example/loan-pooling/) (sample data in `loanData.ts`, checks in `checks.ts`)
- Planning docs and diagrams: [`docs/examples/loan-pooling/`](docs/examples/loan-pooling/)

To add another example, follow the same pattern: a folder under `plugin/src/example/`
that builds its own page from Sterling's components, plus planning docs under
`docs/examples/<name>/`.

**Learning the techniques:** [`docs/manual-walkthrough.md`](docs/manual-walkthrough.md)
shows how a designer would build these variables, modes, variants and properties by hand
in Figma, and where to compare each step with the generated file.

## Build

Requires Node 18+.

```bash
cd plugin
npm install
npm run build
```

This bundles `plugin/src/*.ts` and `tokens/tokens.json` into `plugin/dist/code.js`.

To type-check without building:

```bash
cd plugin
npm run typecheck
```

## Import into Figma (desktop app, one time)

1. Open or create a Figma design file.
2. Go to **Plugins → Development → Import plugin from manifest…**
3. Select `plugin/manifest.json` from this folder.

The plugin has no network access (`networkAccess.allowedDomains: ["none"]`).

## Run and rerun

**Plugins → Development → Sterling**, then choose a command:

| Command | What it does |
|---|---|
| **Build library** | Variables, text styles and every library page |
| **Build example** | Only the example page. Reads the existing variables, styles and library components without changing them, so run **Build library** once first. |

Rerunning is safe. Collections, modes, variables and text styles are matched by
name and updated in place, never duplicated. Items in the file that aren't in
`tokens.json` are kept, and the plugin lists them as warnings in the console
(**Plugins → Development → Show/Hide console**).

After editing `tokens.json`, run `npm run build` in `plugin/` and then rerun the plugin.
Use `npm run watch` to rebuild automatically while editing.

### Mode limits

If your Figma plan limits modes per collection, the plugin creates only the
first mode (Light, Compact), logs a warning, and leaves the other values in
`tokens.json`. The Professional plan supports all modes Sterling uses.

## Regenerating example diagrams

Example planning diagrams are Mermaid sources (`.mmd`) rendered to SVG next to them,
for example in `docs/examples/loan-pooling/`. After editing a `.mmd` file, re-render it
with the Mermaid CLI from the repo root. The first run downloads a headless browser.

```bash
npx -p @mermaid-js/mermaid-cli mmdc -i docs/examples/loan-pooling/pool-workflow.mmd -o docs/examples/loan-pooling/pool-workflow.svg -c docs/mermaid-config.json -C docs/mermaid.css -b white
```

Use the same command for each diagram. The shared config renders labels as plain SVG
text (no embedded HTML) and the CSS makes edge-label backgrounds opaque, so the images
display correctly in any Markdown viewer.

## Contrast check

From the repo root:

```bash
npm run contrast
```

This checks every text/background pair in `tokens.json` → `contrast.rules`, in
both Light and Dark. It exits with an error if body text is below 4.5:1, or if
large text or UI graphics are below 3:1. Disabled text is reported but not
enforced (WCAG exempts it). Use `npm run contrast:failures` to show only
failures.

## Token checks

```bash
npm run check:tokens
```

Every published token (Color, Spacing, Size, Density) needs a description in its group's
`"$descriptions"` map in `tokens.json`; the plugin writes it to the Figma variable. This check
fails if one is missing, if a description is left over for a token that no longer exists, or if
the version in `tokens.json` differs from `package.json`. Build library runs the same
description check against the variables in the file.

## Token reference site

```
npm run tokens:site
```

Writes two files to `site/` (gitignored), generated from `tokens/tokens.json`:

- **`site/index.html`**: a self-contained reference page with inline CSS and no network
  requests. It shows color tokens in Light and Dark with their primitive alias and hex,
  primitive ramps, spacing / radius / size scales, the Density table, type specimens, and
  every contrast pair with its ratio and result. A System / Light / Dark toggle switches
  the page itself, which is styled with the same tokens.
- **`site/tokens.css`**: CSS custom properties for code prototypes:
  - primitives (`--blue-600`);
  - semantic colors aliasing them (`--color-accent-default: var(--blue-600)`); Dark applies
    under `prefers-color-scheme: dark` unless `data-theme="light"`, or with `data-theme="dark"`;
  - spacing and size (`--space-8`, `--size-32`);
  - Density (Default on `:root`; `.density-compact` or `.density-comfortable` on a container);
  - `.text-*` type classes (Numeric uses `tabular-nums`).

The contrast results come from `scripts/lib/tokens.mjs`, the same code `npm run contrast`
uses, so the page and the check can't disagree.

**Publishing:** not set up yet. GitHub Pages isn't available for private repos on GitHub
Free. Once the repo is public, add a GitHub Actions workflow that runs `npm run contrast`
(failing on failures), then `npm run tokens:site`, and deploys `site/` with
`actions/deploy-pages`.

## Known limitations

- **Tabular figures:** the plugin API can't turn on OpenType features for a text
  style, so the **Numeric** style doesn't have tabular figures enabled. To fix it
  once per file: select the Numeric style, click the edit icon, open **Type
  settings → Details**, and set **Numbers → Style → Monospace uppercase/lining**.
  Reruns leave this setting alone: the plugin only writes style properties whose
  values differ from tokens.json.
- **Missing fonts:** if Inter isn't available, the affected text styles are skipped
  with a warning.

## Color decisions

- **Buy = blue, Sell = coral** (actions). **Gain = green, Loss = crimson** (data).
  Color is never the only signal: use B/S labels, +/− signs and ▲/▼ glyphs.
- Destructive buttons use `status/critical` (crimson), never `finance/sell`.
- `text/inverse` is the text color on every solid fill in both modes.
