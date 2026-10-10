# Sterling architecture

Sterling is a design system for data-dense applications. One Figma file holds it, generated
by a local Figma plugin from one token file (`tokens/tokens.json`). The same file also holds
**an example built with Sterling**: a loan pooling workflow on its own page at the end.

This document is written for designers first. Code paths are given so you can find things,
but you don't need to read code to follow it.

---

## 1. The one idea: the file is generated

Figma is the **output**, not the source. Colors, sizes, components, and documentation pages
all come from files in this repo:

| You want to change… | Edit this | Then |
|---|---|---|
| A color, spacing step, size, density value, or text style | `tokens/tokens.json` | build, then run **Build library** |
| A component's variants, properties, or their defaults | `definitions/components.ts` (one table) | build, then run **Build library** |
| How a component is drawn (layers, layout, which tokens it uses) | `plugin/src/library/components/<name>.ts` | build, then run **Build library** |
| A component's description or documentation link | `definitions/docRegistry.ts` (one table) | build, then run **Build library** |
| An icon's glyph | `definitions/icons.ts` | build, then run **Build library** |
| Guidelines or Patterns content | `plugin/src/library/pages/guidelines.ts` / `patterns.ts` | build, then run **Build library** |
| Example data, rules, or counts | `plugin/src/example/loan-pooling/loanData.ts` | build, then run **Build example** |

If you change something in Figma by hand that the plugin owns, the next build puts it
back. See [section 5](#5-what-you-can-and-cant-edit-in-figma).

---

## 2. Folder structure

```
sterling-design-system/
├── README.md               What Sterling is, how to view and run it (public front page)
├── ARCHITECTURE.md         This file: how it fits together
├── CONTRIBUTING.md         Propose → build → check → release
├── CHANGELOG.md            Every release, starting at 1.0.0
├── CLAUDE.md               Rules for Claude Code when working in this repo
├── LICENSE, LICENSE-docs.md   MIT for code; CC BY 4.0 for documentation and design content
├── package.json            Repo version (the single source of the version number) and scripts
│
├── tokens/
│   └── tokens.json         SOURCE OF TRUTH: primitives, semantic colors (Light/Dark), spacing,
│                           size, density (Compact/Default/Comfortable), type, contrast rules,
│                           and a description for every published variable
│
├── definitions/            What each component is, as plain data (no Figma code)
│   ├── components.ts       ONE TABLE: every published component's variant properties, values,
│   │                       and component properties with their defaults
│   ├── docRegistry.ts      ONE TABLE: every published component's description,
│   │                       usage note, and documentation link
│   └── icons.ts            The 20 icon glyphs (SVG path data)
│
├── plugin/                 The Figma plugin that generates the file
│   ├── manifest.json       Plugin name ("Sterling"), menu commands, no network access
│   ├── package.json        build / watch / typecheck
│   └── src/
│       ├── main.ts         Entry point: runs "Build library" or "Build example"
│       ├── core/           Shared machinery, no design content
│       │   ├── meta.ts           Name, tagline, and version (read from package.json)
│       │   ├── tokens.ts         Reads tokens.json
│       │   ├── variables.ts      Creates/updates variable collections
│       │   ├── textStyles.ts     Creates/updates text styles
│       │   ├── helpers.ts        Binds fills, strokes, spacing to variables; text; truncation rules
│       │   ├── ensure.ts         "Update in place" builders (the reason instances stay linked)
│       │   ├── docBlocks.ts      Paragraphs, tables, do/don't pairs, diagrams for doc pages
│       │   ├── layout.ts         1440 × 900 screen, 12-column grid
│       │   ├── linkCheck.ts      Before/after check that instances stay linked
│       │   └── log.ts            The run report (created / updated / warnings)
│       ├── library/        Everything that is Sterling itself
│       │   ├── buildLibrary.ts   Runs the library build in order
│       │   ├── libraryLoader.ts  Reads an existing library without changing it (used by Build example)
│       │   ├── docLinks.ts       Turns registry targets into documentation links (after docs pages are drawn)
│       │   ├── checks.ts         Library checks (components match their definitions, component and
│       │   │                     variable documentation, hidden Primitives, grid layout)
│       │   ├── compositions.ts   Reusable layouts used by Patterns and the example
│       │   │                     (filter panel, view toolbar, view menu, card, link row)
│       │   ├── icons.ts          Draws each glyph in definitions/icons.ts as an Icon/* component
│       │   ├── components/       One file per component (button.ts, grid.ts, inputs.ts, …)
│       │   └── pages/            cover, readme, foundations, components, guidelines,
│       │                         patterns, template, componentArchitecture
│       └── example/
│           └── loan-pooling/     Everything for the example, nothing else imports it
│               ├── buildExample.ts   Runs the example build
│               ├── loanData.ts       Sample data, eligibility rules, counts, views
│               ├── loanPooling.ts    Screens, states, About frame, example components
│               ├── annotations.ts    Developer annotations on the Pool loans screen (one table)
│               └── checks.ts         Data consistency, action triggers, grid layout, annotation targets
│
├── ui/                     Sterling in code: React components documented in Storybook
│   ├── .storybook/         Storybook setup: token CSS, Theme and Density toolbar, accessibility
│   │                       checks, forced hover / focus / pressed states
│   ├── scripts/check-parity.ts   Coded components follow definitions/components.ts
│   └── src/
│       ├── tokens.ts         Reads tokens/tokens.json for the Foundations pages and the toolbar
│       ├── styles/           base.css, fonts.css (Inter 3.19, the version Figma renders), and
│       │                     tokens.css (generated by `npm run tokens`, never edited
│       │                     or committed)
│       ├── foundations/      Color, Spacing and size, Density, Typography pages, drawn from tokens.json
│       ├── components/       One component per file with its CSS and stories (Button.tsx, Button.css,
│       │                     Button.stories.tsx); props are typed from definitions/components.ts
│       ├── stories/          What every story takes from the definitions: Docs text, controls,
│       │                     and the "All variants" grid
│       └── parity/           How a definition maps to code (parity.ts) and the coded components (coded.ts)
│
├── scripts/                Node scripts (no Figma needed)
│   ├── contrast-check.mjs     WCAG check of every text/background pair (Light and Dark)
│   ├── check-tokens.mjs       Every published token has a description; versions agree
│   ├── build-token-css.mjs    Token CSS for code → dist/tokens.css
│   ├── build-token-site.mjs   Token reference website → site/ (inlines the same CSS)
│   ├── lib/tokens.mjs         Shared token loading and contrast math
│   ├── lib/token-names.mjs    How a token name becomes a CSS name (shared with ui/)
│   └── lib/token-css.mjs      The one generator of the token CSS (stl- prefix)
│
├── docs/
│   ├── reference.md           Every collection, component, property, and tool option
│   ├── images/                Screenshots used by the README
│   ├── manual-walkthrough.md  How a designer would build variables/variants by hand
│   └── examples/loan-pooling/ Planning diagrams (.mmd source, .svg rendered)
│
└── .github/workflows/
    ├── ci.yml                 Typecheck, build, contrast, token checks on every push
    └── pages.yml              Publishes the token site (runs only once the repo is public)
```

**The one-way rule:** `example/` may use `library/` and `core/`. `library/` and `core/` never
use `example/`. `definitions/` uses nothing: it is plain data with no Figma code, so anything
else that builds Sterling's components can read the same tables. The plugin creates each
component's variants and properties from `definitions/components.ts`, and Build library fails
its checks if a built component doesn't match. That keeps Sterling usable without the loan example, and lets another
example be added beside it.

---

## 3. Build and run cycle

### One-time setup

1. Install Node 18 or newer.
2. In a terminal: `cd plugin`, then `npm install`.
3. In the Figma desktop app, open the Sterling file, then **Plugins → Development → Import
   plugin from manifest…** and choose `plugin/manifest.json`. Figma now lists **Sterling**
   under Plugins → Development. (This is a new plugin entry. It is separate from any older
   plugin you have imported, and it never touches other files.)

### After the first Build library (one time per file)

Turn on **tabular figures** for the **Numeric** text style, so digits line up in columns:
select the Numeric style, open **Type settings → Details → Numbers**, and set **Style** to
**Monospace uppercase/lining**. The plugin API can't set OpenType features on a text style,
so this is the only manual step. Builds never undo it, and until it's done **Build library**
adds a reminder to its run report (it reads the setting from a Numeric text on the
Components page). The Read me page lists the same step.

### Every time you change something

```
cd plugin
npm run build        # bundles the code and tokens into plugin/dist/code.js
```

Then in Figma: **Plugins → Development → Sterling → Build library** (or **Build example**).

`npm run watch` rebuilds automatically on every save, so you only rerun the menu command.

Figma loads `plugin/dist/code.js` fresh each time you run a command, so there is no
"reload plugin" step. Just build, then run.

### Menu commands

| Command | What it does | What it never does |
|---|---|---|
| **Build library** | Variables, text styles, then the library pages in order: Cover, Read me, Foundations, Components, Guidelines, Patterns, Template, Component architecture. Runs the link check across every page that uses library components, including the example's. Then runs the library checks. | Touch the example's screens or data |
| **Build example** | Reads the existing library (fails with a clear message if it isn't there), then builds the example page: example components, the Pool loans and Add loans screens, Example states, and the About frame. Runs the link check on the example page, the data consistency check, and the action-trigger check. | Write variables, text styles, or any library page |

The notification at the end summarizes the run, in this shape:

> Sterling 1.0.0 library: N variables, N text styles, N pages · links: N kept, 0 changed · library checks: pass

> Sterling example: loan pooling · links: N kept, 0 changed · example checks: pass

Details (every item created, updated, and every warning) are in **Plugins → Development →
Show/Hide console**.

### Node checks (no Figma needed)

From the repo root:

| Command | Checks |
|---|---|
| `npm run contrast` | Every text/background pair in both color modes meets WCAG (4.5:1 text, 3:1 large text and UI). 248 pairs today, 0 failures. |
| `npm run check:tokens` | Every published token has a description, no description is left over for a removed token, and the version in tokens.json matches package.json. |
| `npm run tokens:css` | Writes the token CSS to `dist/tokens.css` |
| `npm run tokens:site` | Writes the token reference site to `site/` (with the same CSS as `site/tokens.css`) |
| `npm run check:parity` | Every coded component in `ui/` follows its definition; lists the components not coded yet. Needs `npm install` in `ui/` first. |
| `npm run storybook` | Starts Storybook for `ui/` at http://localhost:6006 (regenerates the token CSS first) |

GitHub runs the same checks on every push (`ci.yml`).

---

## 4. Figma file structure

Library first, example last, separated by a divider in the page list:

| # | Page | Built by | Contents |
|---|---|---|---|
| 1 | Cover | Build library | Sterling name, tagline, version. Set as the file thumbnail. |
| 2 | Read me | Build library | What Sterling is, version, how to use it, rules |
| 3 | Foundations | Build library | Color (Light/Dark), primitives, type, spacing, radius, density |
| 4 | Components | Build library | Every component: main component and variants, usage note, link to full guidance, and Edge cases |
| 5 | Guidelines | Build library | Principles, accessibility, data display, naming, states, color, icons |
| 6 | Patterns | Build library | Compositions with neutral data (see below) |
| 7 | Template | Build library | Blank 1440 × 900 skeleton on a 12-column grid |
| 8 | Component architecture | Build library | Reference on variants, properties, slots, and hierarchy (uses hidden `_Demo/*` components) |
| — | *Example* (divider) | Build example | |
| 9 | Example: Loan pooling | Build example | "An example built with Sterling": screens, states, About frame, example components |

**Patterns:** Filters, grid, and bulk actions · Bulk action bar (states) · Filter panel and
chips · Saved views · Status chips · Warning and exception cells · Confirmation dialog ·
Form layout · Loading, empty, and error states.

---

## 5. What you can and can't edit in Figma

Think of each generated thing as one of four kinds:

| Kind | What's in it | What a build does | Safe to edit by hand? |
|---|---|---|---|
| **Redrawn** | Cover, Read me, Foundations, Guidelines, Patterns, the Component architecture reference sheet, the Components page's Edge cases, the example's Example states and About frame | Deleted and drawn again at the same position | **No.** Any edit is lost. You *can* move the frame; it's redrawn where you left it. |
| **Updated in place** | Components (library, `_Demo/*`, and `Example/*`), Components page sections | Matched by name; properties, layers, fills, and sizes are set back to what the code says. Layers the code doesn't know are removed from components. | **No.** Change the code instead. Moving a component set on the page is fine. |
| **Updated in place, additions kept** | The Template frame and the two example screens | The plugin's own layers are reset. Layers you add at the top level of the frame are kept. Found by node ID, so **duplicates are never touched**. | Duplicate first, then edit the copy freely. |
| **Values from tokens** | Variables and text styles | Values and descriptions are reset from tokens.json. Extra variables or styles you add are kept and listed as warnings. | Add new ones freely; don't edit Sterling's. One exception: the Numeric style's tabular figures setting (the one-time step after the first build), which the API can't set, survives builds. |

**Rule of thumb:** if the plugin made it, change it in code. If you made it (a duplicate, a
new page, a new frame), it's yours and builds leave it alone.

---

## 6. How rebuilds keep instances linked

A Figma instance stays connected to its main component through the component's internal ID.
If a build deleted a component and made a new one with the same name, every instance in the
file would break. They'd keep their look but lose the link, so future changes wouldn't
reach them.

Sterling never does that. For every component, the plugin:

1. **Finds** the existing component set by name (or by an old name listed in
   `previousNames`, then renames it in place).
2. **Finds each variant** by its name, e.g. `Kind=primary, Size=md, State=hover`.
   Renamed variants are renamed in place via `legacyVariantName`.
3. **Finds each layer** inside by name and type (`Label`, `Icon`, `Glyph`, …) and
   **updates** it: text, fill, size, padding. New layers are added; layers the code no
   longer has are removed.
4. **Finds each property** (Label, Show icon, …) by name and updates it. Renamed properties
   keep their internal ID (`previousNames` in `ensureProp`), so overrides on instances survive.

Because IDs never change, instances keep their link **and** their overrides (a button
instance whose label you changed to "Submit" stays "Submit").

That's why **layer names are an API**. Renaming `Label` to `Text` in code would reset that
override on every instance. Treat it as a breaking change (see CONTRIBUTING.md).

### What the link check verifies

At the start of each build, the plugin records every top-level instance on the pages it checks:
its ID and the exact variant it points to. **Build library** checks every page it doesn't redraw
(Template, Component architecture, the example page, and any page you add yourself); **Build
example** checks the example page. At the end, it checks again:

| Result | Meaning |
|---|---|
| **kept** | Same instance, same main component variant. Good. |
| **kept (renamed)** | Same variant, but a property or value was renamed in place. Still good. |
| **changed** | The instance now points to a different variant or component. **Warning**: something was rebuilt instead of updated. |
| **missing main** | The instance has lost its main component. **Warning.** |
| **rebuilt** | The instance was inside a redrawn frame, so it's new. Expected, not compared. |

**Build library** also checks the example page, because the example's screens are built
from library components. A library change that breaks them shows up there.

---

## 7. How loanData.ts feeds the example

`plugin/src/example/loan-pooling/loanData.ts` is the only place the example's facts live.
Everything else reads from it, so the screens, the state frames, and the About text can't
disagree.

```
                           loanData.ts
   ┌────────────────────────────────────────────────────────────┐
   │ POOL          Pool 2026-07, $50.0M target, $42.6M UPB, criteria
   │ COUNTS        186 pool loans (181 Ready, 2 Exception, 3 Signed off),
   │               62 candidates (56 Eligible, 4 Exception, 2 Ineligible), 1 limit breach
   │ RULES +       FICO/LTV thresholds; classify() turns a loan's FICO and LTV
   │ classify()    into Eligible / Exception / Ineligible and the failing reason
   │ POOL_LOANS,   Sample rows (fictional lenders, LN-2043xx IDs)
   │ CANDIDATES
   │ VIEWS,        Saved views and their filters; each filter has a test function
   │ filters
   │ fitColumns()  Column widths that exactly fill the 8-column grid area
   │ BAR_STATE_A…  Which rows are selected in bulk-bar states a, b, d
   │ ACTIONS       Every action the docs may mention + the visible label that triggers it
   │ CONTEXT       Business context text for the About frame
   └────────────────────────────────────────────────────────────┘
        │                   │                    │                    │
        ▼                   ▼                    ▼                    ▼
  Grid datasets       Screens (Pool loans,   Example states       About frame
  POOL_DATA, …        Add loans): counts,    (filtered, View      (rules table,
  → Example/* rows    tab badges, footers,   menu, bar states     workflows, steps,
  and grids, each     chips, summary panel,  a–d, Sign off and    glossary): every
  row's status and    preview               confirm dialogs)     number and name
  flags derived from                                              read from data
  classify()
```

**Derived, not typed:** a loan's status chip, its warning or error cells, and its
"Exception" text ("FICO 672 — below 680") are all computed from its FICO and LTV by
`classify()`. Change a loan's FICO and its row, chip, and flags all follow.

**Per-state grids:** bar states a and b need different rows selected. Selecting rows by
overriding instances would drop the rows' other overrides, so each state gets its own grid
component built from data that already has that selection.

### The example checks

Each **Build example** run starts with these, and failures appear in the notification as
"example checks: N FAILED":

1. **Data consistency** (`consistencyProblems()`): the totals add up (181 + 2 + 3 = 186;
   56 + 4 + 2 = 62; 60 addable; 2 + 1 = 3 issues); every visible row matches its view's
   filters; sample rows never exceed the totals; the Harbor Point share is plausible; the
   preview's UPB equals pool UPB plus the selected loans; each grid's columns fill the grid
   area exactly; each bar state selects what its caption says.
2. **Action trigger** (`actionTriggerFailures()`): every action named in the About frame,
   a state caption, or an example or dialog description (Sign off, Remove from pool, Save
   view, …) must have a **visible** button or link with that label on a screen or state
   frame, and in the right place (e.g. Sign off must be in a bulk action bar, not only in a
   dialog). Adding an action to the docs without a trigger fails the build.
3. **Grid layout:** in every example grid, right-aligned header labels end exactly where their values
   end, every numeric cell's content fits its column, and the header shows at most one sort icon.
4. **Annotations:** the Pool loans screen carries developer annotations (press Shift+Y in Figma to
   show or hide them). They come from one table, `annotations.ts`; the check fails if an
   annotation's target layer is missing after the build.
5. **Grid chips read-back:** after filling each grid row, the plugin reads every status
   chip back and warns if its label or tone doesn't match the data.

---

## 8. Documentation links

Every published component's documentation comes from one table,
`definitions/docRegistry.ts`. Each entry has:

| Field | Shown where |
|---|---|
| `description`: exactly one sentence | The component's Figma description: the Assets Details panel (click a component in Assets), the Component documentation panel, and Dev Mode |
| `details`: variants, properties, rules | The component's entry under Guidelines › Component usage, and its usage note on the Components page when its section holds more than one component (a single-component section already says it in its description) |
| `use` / `dont` | The usage note, and the component's entry under Guidelines › Component usage |
| `related`: Guidelines sections and Patterns that apply | "Related" links in the component's entry |
| `docs` (optional): where the documentation link goes | By default, the component's own entry under Guidelines › Component usage |

Every component has its own entry on the Guidelines page (a frame named `Component/<name>`
under Component usage) with a live preview, its details, when to use it, and links to the
related rules. Its documentation link opens that entry; icons share the Icons section. Targets
are named as places, not URLs: at the end of each Build library run, after the Guidelines and
Patterns pages are redrawn (their frames get new IDs), the plugin turns each one into a link
to that frame in this file. Later, an entry can set `docs` to a Storybook URL instead, without
touching the components.
Descriptions are for people: no check or build logic parses them.

Every published variable in Color, Spacing, Size, and Density has a description, written in
`tokens.json` in that group's `"$descriptions"` map (next to the values, so adding a token and
describing it happen in the same place). In Figma, it's the Description field in a variable's
edit window (Variables panel), and it appears as a tooltip when you point at the variable where
it's applied, such as a Fill row in the right panel. Primitives are hidden from publishing and
from property pickers, so designers reach for semantic tokens. `npm run check:tokens` fails
if a published token has no description, before anything reaches Figma.

**Library checks** (run by Build library; failures show as "library checks: N FAILED"):
a published component with no registry entry, no description, a description that isn't exactly
one sentence, or no documentation link fails; a registry entry with no matching component fails;
a published variable without a description fails; a visible Primitive fails; and the generic grid
must follow the layout rules (right-aligned headers flush with their values, content that fits its
column, at most one sort icon).

Components whose names start with `_` (`_Demo/*`, `_Example/*`) are hidden from publishing,
so they don't need entries.

---

## 9. Naming and code prefix

- **Figma names** stay unprefixed and use slash folders (`Controls/Button`, `Grid/BodyCell`).
  The library name, Sterling, is the namespace in the Assets panel.
- **Code prefix `stl-`** applies to everything that shares a global namespace in code:
  - **now:** CSS custom properties and classes in the token site (`--stl-color-text-primary`,
    `--stl-space-8`, `.stl-density-compact`, `.stl-text-body`), and the plugin's data key
    (`sterling`) in the Figma file;
  - **later (Storybook):** component CSS classes (`.stl-button`), custom elements if any
    (`<stl-button>`), and story titles (`Sterling/Controls/Button`). Component and prop names
    in code mirror Figma 1:1 (`Show icon` ↔ `showIcon`) and take no prefix.

---

## 10. Where Figma and code differ

**Right-aligned grid headers.** The rule is: the header label is flush with the numbers below it,
and the sort icon sits immediately to the label's left. In code that's one flex row: the label
shrinks and truncates when the column is narrow, and the icon stays beside it at any width.

Figma auto layout has no equivalent of flex-shrink. A text layer either **fills** its container
(it truncates at the container's width, but then the icon sits at the far edge) or **hugs** its
text (the icon stays beside it, but it only truncates at a fixed max width). And an instance can't
change the max width of a layer nested inside it: Figma rejects it with "This property cannot be
overridden in an instance: max-size" (tested October 2026). So a hugging label's max width can't
follow each column's width.

Sterling's Figma component therefore keeps what matters most for data: the label **fills** the
cell, so it is always flush with the values and always truncates correctly. To keep the sort icon
beside the label, numeric columns are sized to their values (`numericColumnWidth()`), and the
example's column fitting gives extra width only to descriptive text columns (identifier columns
such as Loan ID stay value-sized too). Both builds check that every
right-aligned header label ends exactly where its values end, in every row, and that every numeric
cell's content fits its column.

The coded `HeaderCell` implements the rule exactly, at any column width: the label ends where the
values end, the icon sits 4px to its left, and a label longer than its column truncates while the
icon keeps its place (the "Right-aligned at any width" story shows all three).

The intent, as Guidelines states it, is that **the sort icon always sits next to its label**. Code
does that for both alignments. Figma approximates it: a left-aligned header's icon sits at the
cell's right edge, away from a short label, because the label fills the cell.

**Grids are data tables.** Sterling's grids are used to read and compare rows, sort them, select
some, and act on the selection. Nothing is edited in place, and a row holds one control (its
checkbox). So the coded Data grid is a native `<table>`, not an interactive grid (`role="grid"`):

- Tab moves between the header sort buttons and the row checkboxes; there is no cell-by-cell focus.
- Screen readers keep their own table commands (move by row and column, hear the header with each
  cell), which `role="grid"` would replace with navigation Sterling had to build and maintain.
- The cost is one Tab stop per row. The offsets are a select-all checkbox in the header,
  "Select all N matching" in the bulk action bar, and Shift+click or Shift+Space to select a range.

Sterling would move to `role="grid"` when cells become editable or hold more than one control: then
arrow keys between cells are worth their cost. Until then the body cell's focus variants in Figma
(`focus`, `warning-focus`, `error-focus`) have no trigger in code. Focus variants are for future editable cells; read-only grids show focus on header buttons and row checkboxes only.

**Data grid and bulk action bar.** The coded Data grid is driven by data (`columns`, `rows`, `sort`,
`selected`), using the same dataset shape and placeholder data as the plugin (`definitions/grid.ts`);
in Figma a grid is instances with overridden values. It reports what the person asks for and leaves
sorting, paging, and storing the selection to the application. In the bulk action bar:

- The actions are `children`; Figma exposes four button instances and a Show destructive toggle.
- The mark beside the count is a picture of the selection, hidden from assistive technology. In
  Figma it is a Checkbox instance. The count itself is a status that screen readers announce.
- "Select all N matching" is underlined, like every link; Figma shows it in the accent color only.
- Focus is never dropped: after "Select all N matching" it moves to the count, and when clearing the
  selection removes the bar, the screen moves it to the grid's select-all checkbox.

**Grid cells.** The coded cells are table cells (`<th>`, `<td>`), so they only work inside a table.
In a chip or checkbox cell, the chip or checkbox is `children`; in Figma it is an exposed nested
instance. Error and warning are one prop, `validation`, as on the inputs.

**States.** Figma shows each state as a variant (`State=hover`). Code has no `state` prop: hover,
pressed, and focus come from CSS (`:hover`, `:active`, `:focus-visible`), and disabled is the
`disabled` prop. The mapping is written down once, in `ui/src/parity/parity.ts`, and
`npm run check:parity` applies it to every coded component. Storybook's "All variants" stories
force the CSS states so they can be compared with the Figma variant set.

**Fonts change together.** Figma renders Inter 3.19, and the coded layer bundles the same version
(`inter-ui`, loaded in `ui/src/styles/fonts.css`), so text has the same width on both sides. Inter 4
is about 2% narrower at Medium and Semi Bold, which is enough to change the width of every button.
If the Figma text styles move to another Inter version, change the package in the same release.
(Figma also rounds each text box up to a whole pixel, so a text-sized control can still be up to
1px wider in Figma.)

**Input content.** Figma's Input/Text has a Content property (value / placeholder) so a mockup can show
either. In code there is nothing to choose: the field shows its placeholder whenever its value is
empty. Error and warning are one prop, `validation`.

**Tab list.** Code has a `TabList` with no Figma component. It gives its tabs the tablist role, an
accessible name, and arrow-key navigation; in Figma, tabs are placed side by side in a frame.
Differences like these are recorded with their reasons in `ui/src/parity/coded.ts` (`figmaOnly`,
`codeOnly`, `CODE_ONLY_COMPONENTS`).

**Select and its menu.** The coded Select gets its keyboard behavior, typeahead, and screen-reader
semantics from React Aria (`react-aria` and `react-stately`, hooks only), because a custom listbox
is easy to get subtly wrong. The look is Sterling's own CSS. It is the only component with a
runtime dependency besides React. The choices are an `options` prop; in Figma they are the Option
instances inside Input/Menu. While the menu is open React Aria treats it as modal, its default: the
rest of the page is hidden from assistive technology and can't be scrolled until the menu closes.

**Dialog.** The coded Dialog is a native `<dialog>` opened as a modal, so the browser keeps focus
inside it, makes the page behind inert, closes on Escape, and returns focus. Figma's Body slot is
`children`; the Cancel and Primary buttons, which Figma exposes as nested instances, are props
(`cancelLabel`, `primaryLabel`, `primaryKind`, `primaryDisabled`). The backdrop is `surface/scrim`.

**Icon button tooltip.** In Figma an icon button's Label is a hidden layer: its accessible name. In
code the label is the `aria-label` and, for now, the browser's own tooltip (`title`). A Sterling
Tooltip component is on the backlog ([reference](docs/reference.md#backlog)); when it exists, the
icon button will use it instead.

---

## 11. Versioning

The version number lives in the root `package.json` (1.0.0). The plugin reads it at build
time and prints it on the Cover and Read me pages and in the run notification.
`check:tokens` fails if `tokens.json` says otherwise. CHANGELOG.md records every release;
CONTRIBUTING.md defines what counts as major, minor, or patch for a design system (renaming
a layer or property is breaking).
