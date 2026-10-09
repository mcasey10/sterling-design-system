# Sterling architecture

> **Status: proposed.** This describes Sterling 1.0.0 as planned. It will be updated as the
> port lands, so that it always matches the code.

Sterling is a design system for data-dense applications. One Figma file holds it, generated
by a local Figma plugin from one token file (`tokens/tokens.json`). The same file also holds
**an example built with Sterling**: a loan pooling workflow on its own pages at the end.

This document is written for designers first. Code paths are given so you can find things,
but you don't need to read code to follow it.

---

## 1. The one idea: the file is generated

Figma is the **output**, not the source. Colors, sizes, components, and documentation pages
all come from files in this repo:

| You want to change… | Edit this | Then |
|---|---|---|
| A color, spacing step, size, density value, or text style | `tokens/tokens.json` | build, then run **Build library** |
| A component's structure, states, or properties | `plugin/src/library/components/<name>.ts` | build, then run **Build library** |
| A component's description or documentation link | `plugin/src/library/docRegistry.ts` (one table) | build, then run **Build library** |
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
├── package.json            Repo version (the single source of the version number) and scripts
│
├── tokens/
│   └── tokens.json         SOURCE OF TRUTH: primitives, semantic colors (Light/Dark), spacing,
│                           size, density (Compact/Default/Comfortable), type, contrast rules,
│                           and a description for every published variable
│
├── plugin/                 The Figma plugin that generates the file
│   ├── manifest.json       Plugin name ("Sterling"), menu commands, no network access
│   ├── package.json        build / watch / typecheck
│   └── src/
│       ├── main.ts         Entry point: runs "Build library" or "Build example"
│       ├── core/           Shared machinery, no design content
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
│       │   ├── docRegistry.ts    ONE TABLE: every published component's description,
│       │   │                     usage note, and documentation link
│       │   ├── checks.ts         Library checks (descriptions, doc links, variables)
│       │   ├── compositions.ts   Reusable layouts used by Patterns and the example
│       │   │                     (filter panel, view toolbar, side-panel card)
│       │   ├── icons.ts          Icon/* glyphs
│       │   ├── components/       One file per component (button.ts, grid.ts, inputs.ts, …)
│       │   └── pages/            cover, readme, foundations, components, guidelines,
│       │                         patterns, template, componentArchitecture
│       └── example/
│           └── loan-pooling/     Everything for the example, nothing else imports it
│               ├── buildExample.ts   Runs the example build
│               ├── loanData.ts       Sample data, eligibility rules, counts, views
│               ├── loanPooling.ts    Screens, states, About frame, example components
│               └── checks.ts         Data consistency + action-trigger checks
│
├── scripts/                Node scripts (no Figma needed)
│   ├── contrast-check.mjs     WCAG check of every text/background pair (Light and Dark)
│   ├── check-tokens.mjs       Every published variable has a description; versions agree
│   ├── build-token-site.mjs   Token reference website → site/
│   └── lib/tokens.mjs         Shared token loading and contrast math
│
├── docs/
│   ├── manual-walkthrough.md  How a designer would build variables/variants by hand
│   └── examples/loan-pooling/ Planning diagrams (.mmd source, .svg rendered)
│
└── .github/workflows/
    ├── ci.yml                 Typecheck, build, contrast, token checks on every push
    └── pages.yml              Publishes the token site (runs only once the repo is public)
```

**The one-way rule:** `example/` may use `library/` and `core/`. `library/` and `core/` never
use `example/`. That keeps Sterling usable without the loan example, and lets another
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
| `npm run check:tokens` | Every published variable has a description; the version in tokens.json matches package.json. |
| `npm run tokens:site` | Writes the token reference site to `site/` |

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

At the start of each build, the plugin records every top-level instance on the Template,
Component architecture, and Example pages: its ID and the exact variant it points to. At the
end, it checks again:

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
3. **Grid chips read-back:** after filling each grid row, the plugin reads every status
   chip back and warns if its label or tone doesn't match the data.

---

## 8. Documentation links

Every published component has a **description** (one sentence) and a **documentation link**,
both from one table: `plugin/src/library/docRegistry.ts`. Each entry names its target as a
place (for example "Guidelines › Data display" or "Patterns › Bulk action bar"), not a URL.
At build time the plugin turns that into a link to the frame in this file. Later, an entry
can point to a Storybook URL instead, without touching the components.

Every published variable in Color, Spacing, Size, and Density has a description from
`tokens.json`. Primitives are hidden from publishing and from property pickers, so designers
reach for semantic tokens.

**Library checks** (run by Build library; failures show as "library checks: N FAILED"):
a published component without a description or doc link fails, a published variable without
a description fails, and a visible Primitive fails.

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

## 10. Versioning

The version number lives in the root `package.json` (1.0.0). The plugin reads it at build
time and prints it on the Cover and Read me pages and in the run notification.
`check:tokens` fails if `tokens.json` says otherwise. CHANGELOG.md records every release;
CONTRIBUTING.md defines what counts as major, minor, or patch for a design system (renaming
a layer or property is breaking).
