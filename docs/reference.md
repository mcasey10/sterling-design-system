# Sterling reference

Detailed reference for **building and maintaining** Sterling: what the plugin generates, every
component and its properties, the rules behind them, and how to run each tool. For an overview,
start with the [README](../README.md); for how the pieces fit together, see
[ARCHITECTURE.md](../ARCHITECTURE.md). How to *use* Sterling on a new screen is on the **Read me**
page inside the Figma file.

Sterling is generated into Figma by a local plugin. Everything comes from one file,
[`tokens/tokens.json`](../tokens/tokens.json). To change Sterling, edit the tokens and rerun the plugin.

All sample data is made up. There are no real companies, lenders, logos or brands.

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

**Text styles:** Display, Title, Heading, Body, Body-strong, Body-link, Label, Label-link, Caption, Numeric (Inter). Body-link and Label-link are underlined, for link text
and Code (Roboto Mono).

### Pages

| Page | Reusable? | How it's updated |
|---|---|---|
| **Cover** | Yes | The file's cover: name, tagline, and version, beside a montage of live components. Redrawn every run. |
| **Read me** | Yes | Guide to using Sterling. Redrawn every run, so don't edit it by hand. |
| **Foundations** | Yes | Color swatches (Light and Dark), primitive ramps, type specimens, spacing, radius and density panels, all bound to the variables they show. Redrawn every run. |
| **Components** | Yes | The component library (below), with neutral placeholder content. Updated in place, so instances stay linked and keep their overrides. |
| **Guidelines** | Yes | Design principles (good vs bad table), accessibility, data display, naming, states and color rules, with do / don't pairs built from Sterling instances; icons; and Component usage (one `Component/<name>` entry per component, which its documentation link opens). Each section is a `Guideline/<name>` frame. Redrawn every run. |
| **Patterns** | Yes | Nine compositions built only from Sterling instances, each with numbered notes and use / don't-use guidance: filters + grid + bulk actions, the bulk action bar's states, filter panel and chips, saved views, status chips, warning and exception cells, the confirmation dialog, form layout, and loading / empty / error states. All sample data is domain-neutral. Redrawn every run. |
| **Template** | Yes | `Template/Desktop 1440`: a blank 1440 × 900 skeleton on a 12-column grid (16px margins and gutters, bound to `space/16`), with an app bar and empty slots for filters (2 cols), main content (8 cols) and summary (2 cols). |
| **Component architecture** | Yes | A reference on component architecture: variants, properties, slots, and hierarchy. See [Component architecture page](#component-architecture-page). |
| **Example: Loan pooling** | No | An example built with Sterling: a loan pooling screen for a mortgage guarantor's trading desk, with business context, workflows, and eligibility rules documented on the page. Built by **Build example**. See [Example: loan pooling](#example-loan-pooling). |

If the file only has an empty "Page 1", it becomes the Cover page. Build example keeps a page divider before the example page.

**Documentation:** every published component's documentation comes from one table,
[`definitions/docRegistry.ts`](../definitions/docRegistry.ts): a one-sentence description
(to see it, select an instance, then click the component's description in the right-hand panel; a
"Component documentation" popup opens with the description and the link; it also shows in Dev Mode), a
usage note under the component on the Components page (details, use when, don't use when), and a
documentation link to the component's Storybook Docs page (since 1.1.1). Its entry under Guidelines ›
Component usage links on to the related Guidelines sections and Patterns. Links need
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
| `Grid/HeaderCell` | Sort (none / asc / desc) × Align (left / right) × State (default / hover / focus) | Label and Show sort properties. Only a sorted header shows its icon at rest; an unsorted one reveals it on hover and focus, so a grid shows at most one sort icon. Show sort off = not sortable |
| `Grid/BodyCell` | Type (text / numeric / gain / loss / chip / checkbox) × State (default / hover / selected / selected-hover / focus / warning / warning-focus / error / error-focus), 54 variants | Value property; gain / loss add ▲ / ▼ and finance/gain / loss; Chip and Checkbox are exposed nested instances (swap the Chip to Chip/Side for buy / sell); warning and error add a border and icon |
| `Grid/Row` | State (default / hover / selected / selected-hover) | Checkbox cell + generic columns (ID, Name, Amount, Percent, Status) built from BodyCell instances |
| `Grid/Data grid` | — | Generic grid with placeholder data: two selected rows, one error cell |
| `Grid/Pagination` | — | Range and Page properties; Previous / Next are exposed Button instances (set disabled on the first or last page) |
| `Grid/Skeleton row` | — | Loading placeholder with the generic grid's column widths (`surface/skeleton` bars); Label and Show label add "Loading rows…" |
| `Grid/Empty state` | Tone (neutral / critical) | No results / nothing yet, or a load error; Title and Message text layers; Show action and an exposed Action button (Clear filters / Retry) |
| `Grid/BulkActionBar` | — | "N selected · Select all M matching" + Clear selection / Export / Delete / Primary action; Count, Select all, Show select all, Show destructive, Hint and Show hint properties (the hint says why an action is disabled); action buttons are exposed instances, so they can be renamed from the bar |
| `Chip/Filter` | State (default / hover / pressed / focus) | Label and Show remove properties |
| `Summary/Summary metric` | Status (normal / over-target) × State (default / loading) | Label and Show progress properties; over-target adds a warning icon and text; loading shows a skeleton bar and "Loading…" |
| `Input/Text`, `Input/Select` | State (default / hover / focus / error / error-focus / warning / warning-focus / disabled; Select adds open) × Content (value / placeholder) | Label, Value, Placeholder, Helper, Show label, Show helper properties; error and warning add an icon; hide the label only when a visible label sits next to the field |
| `Input/Option` | State (default / hover / focus / selected / disabled) | Label property; selected adds a check icon; focus adds a ring inside the row |
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
| `Grid/HeaderCell` | Label (fills the cell; sort icon at the cell edge — right edge for left-aligned, left edge for right-aligned headers, whose label stays flush with the numbers) | cell width minus padding and the sort icon |
| `Grid/BodyCell` (text) | Value | fills the cell (cell width − padding) |
| `Grid/BodyCell` (numeric, gain, loss) | — never truncates | hugs; size the column with `numericColumnWidth()`: characters × 7.5 + 24 (+ 16 for the gain / loss glyph, or for the warning / error icon in a column that can be flagged), rounded up to 8 |
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

**More icons:** Sterling's `Icon/*` set has 20 icons. Any icon library enabled in
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

- Code: [`plugin/src/library/pages/componentArchitecture.ts`](../plugin/src/library/pages/componentArchitecture.ts)
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
- Each grid fills the 8 columns between the panels exactly: descriptive text columns (Lender, Exception)
  share the extra width, while numeric and identifier columns (Loan ID) stay sized to their values, so
  header sort icons sit beside their labels.
  Views set columns as well as filters (Exceptions to sign off and Signed off add Sign-off note).
- **Developer annotations** on the Pool loans screen (press Shift+Y to show or hide): accessibility and
  behavior notes for engineers, from one table in `annotations.ts`. A build fails a check if a note's
  target layer is missing.
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

- Code: [`plugin/src/example/loan-pooling/`](../plugin/src/example/loan-pooling/) (sample data in `loanData.ts`, checks in `checks.ts`)
- Planning docs and diagrams: [`docs/examples/loan-pooling/`](examples/loan-pooling/)

To add another example, follow the same pattern: a folder under `plugin/src/example/`
that builds its own page from Sterling's components, plus planning docs under
`docs/examples/<name>/`.

**Learning the techniques:** [`docs/manual-walkthrough.md`](manual-walkthrough.md)
shows how a designer would build these variables, modes, variants and properties by hand
in Figma, and where to compare each step with the generated file.

## Build

Requires Node.js 20.19 or later (check with `node --version`).

```bash
cd plugin
npm install
npm run build
```

This bundles everything under `plugin/src/` and `tokens/tokens.json` into `plugin/dist/code.js`.

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

## Diagrams

Diagrams are Mermaid sources (`.mmd`) in `docs/`, rendered to SVG beside each. Those in `docs/diagrams/` (the AI
layer overview, on the website's AI page) are rendered once per color mode in Sterling's own colors, read from the
Color tokens: `ai-layer.svg` (Light) and `ai-layer.dark.svg` (Dark); the page shows the one for its theme. The
example's planning diagrams in `docs/examples/loan-pooling/` are rendered once, in Mermaid's default colors.
After editing a `.mmd` file, re-render from the repo root:

```bash
npm run diagrams
```

It renders every diagram with the Mermaid CLI at a pinned version (`scripts/lib/diagrams.mjs`), through npx: the
first run downloads it and a headless browser. To render one, add its path: `npm run diagrams -- docs/diagrams/ai-layer.mmd`.
Each SVG's first line names its source and the hash of what it was rendered from (the source, and for a themed
diagram its colors too), and `npm run check:diagrams` (in CI) fails if a source, or a color token a diagram uses,
changed without a re-render. Labels are plain SVG text (no embedded HTML) and edge-label backgrounds are opaque, so
the images display correctly in any Markdown viewer.

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

Writes the token reference to `site/` (gitignored), generated from `tokens/tokens.json`. `npm run site`
builds it as part of the whole website (Start here, Install sterling-ui, the token reference, Sterling and AI
tools, Storybook, the AI files, and llms.txt), and `npm run check:site` checks every page: axe in Light and Dark
(as loaded, and as without JavaScript), phone width, every internal link and anchor, and the AI page's steps by
keyboard. `npm run check:excerpts` checks the AI page's excerpts: each is read from its source when the site
builds, the code excerpts must be identical to the commit the page says they were delivered in (so it needs the
repository's history), and the MCP exchange is made with the built server (`mcp/scripts/exchange.mjs`).

- **`site/tokens/index.html`**: the token reference, in the website's page shell
  (`scripts/lib/page-shell.mjs`), with inline CSS and nothing loaded from another site. It shows color
  tokens in Light and Dark with their primitive alias and hex, primitive ramps, spacing / radius / size
  scales, the Density table, type specimens, and every contrast pair with its ratio and result. Its
  section links used to be on the site's home page (`/#color` and the rest); Start here forwards them.
- **`site/tokens.css`**: CSS custom properties for code. `npm run tokens:css` writes the same file
  to `dist/tokens.css` without building the page; both come from one generator,
  `scripts/lib/token-css.mjs`, so never edit either by hand. Everything carries Sterling's
  code prefix, `stl-`:
  - primitives (`--stl-blue-600`);
  - semantic colors aliasing them (`--stl-color-accent-default: var(--stl-blue-600)`); Dark applies
    under `prefers-color-scheme: dark` unless `data-theme="light"`, or with `data-theme="dark"`;
  - spacing and size (`--stl-space-8`, `--stl-size-32`);
  - Density (Default on `:root`; `.stl-density-compact` or `.stl-density-comfortable` on a container);
  - `.stl-text-*` type classes (Numeric uses `tabular-nums`).

The contrast results come from `scripts/lib/tokens.mjs`, the same code `npm run contrast`
uses, so the page and the check can't disagree.

**Publishing:** [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs the contrast
and token checks, builds the site, and publishes it to GitHub Pages on every push to `main`. It
does nothing while the repository is private (GitHub Pages isn't available for private repos on
GitHub Free). Once the repository is public, turn Pages on in **Settings → Pages → Source: GitHub
Actions**; the next push to `main` publishes the site.

**Continuous integration:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every
push and pull request: it type-checks and builds the plugin, runs the contrast and token checks, and
builds the token site; and for the coded layer it type-checks, runs the parity, raw-value, accessibility, and documentation-link checks, and builds Storybook. The library and example checks need a Figma file, so they run in the plugin.

## Files for AI tools, and the MCP server

- **The export** (`ai/`, committed, generated): `index.json`, `components.json`, `tokens.dtcg.json` (DTCG
  2025.10), `guidelines.json`, written by `npm run export:ai` from the tokens, `definitions/`, and the coded
  components (`ui/scripts/lib/ai-export.ts`). `npm run check:ai` fails if they no longer match the sources.
- **llms.txt**, at the website's root, is rendered from `ai/index.json` (`llmsTxt`) by `scripts/lib/llms.mjs`.
  To add a section, add it in `ai-export.ts`; `check:ai` validates every link in it.
- **The MCP server** (`mcp/`): eight read-only tools over a copy of the export, in one file. Users download it
  from the Release as `sterling-mcp.js` and register it with any MCP client; [mcp/README.md](../mcp/README.md)
  has the setup and the tools. `npm run check:mcp` rebuilds and tests it.
- **The AI page** (`/ai-tools/`) follows Chip/Status from the sources to code. Its excerpts are read from the
  files when the site builds, and step 6 is a real exchange with the built server: `npm run check:excerpts`.

## The sterling-ui package

`npm run package` builds `ui/package/` and `sterling-ui-<version>.tgz`: the components, their type
declarations, `styles.css` (tokens and every component's CSS), and `fonts.css`. It isn't on a package registry;
each Release attaches the tarball, and users install it from the Release address
([Install sterling-ui](https://mcasey10.github.io/sterling-design-system/install/), from `definitions/setup.ts`).
Example screens in `ui/src/examples/` import only from the package (`npm run check:examples`).

## Documentation written once

Some documentation is generated from data, between marker comments (`<!-- generated: … -->`), by
`npm run docs:sync`; `npm run check:docs-sync` (in CI) fails if it's out of date:

- the Start here table in the README, from `definitions/audiences.ts` (the website's Start here draws the same);
- the setup block in `mcp/README.md`, from `definitions/setup.ts` (the website's AI page shows the same);
- the version and the component and icon counts in `docs/figma-community.md`, the text pasted into the Figma
  Community page at each release.

`docs/github-about.md` holds the text for the repository's About panel, set by hand.

## After a release: check the live site

Once the Site workflow has published `main`:

1. Open Start here, Install, Tokens, Storybook, and AI tools from the navigation, in Light and Dark.
2. Follow every link on Start here, including the Figma Community page and the Release downloads
   (`sterling-ui-<version>.tgz`, and `sterling-mcp.js` from `releases/latest/download/`).
3. Fetch `llms.txt` and follow every link in it, including the raw files on `main`.
4. Install sterling-ui from the Release address into a new React project, and set up the MCP server from the
   download, following only the website.
5. Open one component's documentation link from Figma: select an instance, then click the component's
   description in the right-hand panel; a "Component documentation" popup opens with the link. It opens the
   component's Storybook Docs page.

## Backlog

Not planned for a release yet:

- **A Claude Code plugin** that carries the MCP server, so it's set up from inside Claude Code with one command,
  and a **Claude Desktop extension** (`.mcpb`), opened with a double click. Both after 1.2; until then the
  server is the Release download, registered with any MCP client.

- **Components a session building a real screen missed:** a toast or inline message, a card or panel, a
  screen-reader-only text class, layout tokens, and grouped options (and descriptions) in Select.

- **Tooltip component.** A Sterling tooltip, in Figma and in code. Until then the coded Icon button
  shows its label with the browser's own tooltip (`title`), which can't be styled, appears after a
  delay, and doesn't appear on keyboard focus.

- **Input/Option with description focus.** Figma has no focus variant for it; the coded option shows one.

- **From the repeat runs** (after the series; Sterling isn't changed during it):
  - **A z-index token.** Sterling has no z-index or layer token, so a screen's own popup needs a raw value.
  - **Say that component class names are private.** Nothing Sterling publishes says that `stl-` component classes
    (as opposed to token classes and custom properties) aren't for screens to use, and screens use them: the
    October 14 screen and run 1 both did. Related: Select gives no ref to its button, so a screen can't focus
    it without a class.
  - **Say who sets color mode and density.** The instructions say how to set them, not that the host page sets
    them and a screen mustn't change them. Run 1's screen removed them on load, like the October 14 screen. Add one
    sentence to Sterling's guidance (the server's instructions and the package README): the host app owns color mode
    and density, and a screen must never change them. Until then, a run that changes them is a Sterling fail
    (repeat-runs deviation 16).
  - **DataGrid's loading label truncates.** In run 1, at 1440px, the first skeleton row showed "Loading pool
    loa" in the last column, with no ellipsis. Check in Storybook.
  - **The example's filter panel.** Examples › Pool loans has no "+ Add filter", which the designer's screen
    shows (run 1's screen has it). A question about the example, not the runs.

## Known limitations

- **Component descriptions read back with `&quot;`:** Figma returns a description's quote marks as `&quot;` to
  plugins and tools (for example `The &quot;check&quot; icon…`), though Assets › Details shows them as quote
  marks. Only how Figma returns the text; nothing to fix.

- **Tabular figures:** the plugin API can't turn on OpenType features for a text
  style, so the **Numeric** style doesn't have tabular figures enabled. To fix it
  once per file: edit the Numeric text style, open **Type details (…) → Details →
  Numbers**, and set **Style** to **Monospace uppercase/lining**.
  Reruns leave this setting alone: the plugin only writes style properties whose
  values differ from tokens.json.
- **Missing fonts:** if Inter isn't available, the affected text styles are skipped
  with a warning.

## Color decisions

- **Buy = blue, Sell = coral** (actions). **Gain = green, Loss = crimson** (data).
  Color is never the only signal: use B/S labels, +/− signs and ▲/▼ glyphs.
- Destructive buttons use `status/critical` (crimson), never `finance/sell`.
- `text/inverse` is the text color on every solid fill in both modes.
