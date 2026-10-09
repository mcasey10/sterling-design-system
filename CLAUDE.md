# Sterling Design System

## Purpose
Sterling is a design system for data-dense applications. It is delivered as a **local Figma
plugin** that generates everything — variables, text styles, components, documentation pages —
from a single token file. One Figma file holds the library and, on its own page at the end,
**an example built with Sterling** (a loan pooling and commitment workflow).

`tokens/tokens.json` is the **source of truth**. Never hand-edit generated output in Figma and
expect it to survive; change the tokens or plugin code and rerun the plugin.
[ARCHITECTURE.md](ARCHITECTURE.md) explains how it fits together.

## Hard rules
- **Fictional data only.** No real company names, lenders, logos, tickers, people, or branding in
  data — tokens, sample data, copy, README, or screenshots. Use obviously fictional names
  (e.g., "Harbor Point Lending", "LN-000123"). Public industry background may name real
  organizations, with a source note: real company names appear only in the example's About frame,
  section 1 source note (`CONTEXT.sourceNote` in `loanData.ts`).
- **Naming.** Use "Sterling" everywhere: manifest, package names, docs, Figma pages and
  descriptions, code comments. Don't reintroduce the names of the project Sterling was ported
  from, or copy that frames Sterling as test, practice, or hiring work; the maintainer keeps the
  exact list of banned terms outside the repo. Internal code names `kit` / `Kit` (the resolved
  variables and text styles passed to every builder) are fine.
- **No network access** in the plugin (`networkAccess.allowedDomains: ["none"]`).
- **Idempotent**: rerunning the plugin updates variables, styles, components, and pages by name —
  it never duplicates them.
- **Never rely on color alone** for meaning (status, buy/sell, gain/loss): pair with an icon,
  sign, or text label. Keep Buy/Sell hues distinct from Gain/Loss hues.
- **Library vs example.** Read me, Foundations, Components, Guidelines, Patterns, Template and
  Component architecture stay domain-neutral (placeholder labels and data). Anything specific to
  one product brief — sample data, workflow rules, domain actions, planning diagrams — belongs to
  that example's page, code (`plugin/src/example/<name>/`), and docs (`docs/examples/<name>/`).
  `core/` and `library/` never import from `example/`.
- **Plan before building.** Propose token and component changes for approval before writing plugin
  code. Build incrementally: tokens → foundations → components → template.

## Project structure
```
tokens/tokens.json        Source of truth: primitives + semantic tokens,
                          Light/Dark color modes, Compact/Default/Comfortable density
plugin/
  manifest.json           Figma plugin manifest ("Sterling"; no network access, dynamic-page access)
  src/main.ts             Entry point — runs "Build library" or "Build example", reports results
  src/core/               Shared machinery, no design content:
    tokens.ts             Typed import of tokens.json (bundled by esbuild)
    variables.ts          Variable collections (Primitives, Color, Spacing, Size, Density)
    textStyles.ts         Inter text styles
    helpers.ts            Node helpers (bound fills/strokes/spacing, text, pages, mode pinning),
                          library page order
    ensure.ts             In-place builders: match children/variants by name, update,
                          never recreate (keeps instance links and overrides)
    docBlocks.ts          Documentation building blocks (paragraphs, sections, steps, stages)
    layout.ts             Desktop screen layout: 1440 × 900, 12-col grid, column spans
    linkCheck.ts          Before/after check that instances keep their main component
    log.ts                Run report (created / updated / warnings)
  src/library/            Sterling itself:
    buildLibrary.ts       "Build library": variables, styles, every library page, link check
    libraryLoader.ts      Read-only library lookup, used by "Build example"
    docRegistry.ts        THE table of component documentation: one-sentence description, details,
                          use / don't use, documentation target. Every published component needs an entry
    docLinks.ts           Sets documentation links from the registry (after Guidelines / Patterns are drawn)
    checks.ts             Library checks: descriptions, doc links, registry coverage, hidden Primitives
    icons.ts              Icon/<name> components (original outline glyphs, layer "Glyph")
    components/*.ts       One spec per component; grid and bulk bar are data/spec-driven
                          (grid.ts also builds Skeleton row and Empty state; menu.ts builds
                          Input/Option and Input/Menu)
    pages/readme.ts       Read me page (rebuilt each run at the same position)
    pages/foundations.ts  Foundations page (rebuilt each run at the same position)
    pages/componentsPage.ts  Components page (updated in place); returns the component library
    pages/guidelines.ts   Guidelines page — principles and rules with do / don't pairs (rebuilt each run)
    pages/patterns.ts     Patterns page — compositions from library instances (rebuilt each run)
    pages/template.ts     Template page: blank 1440px skeleton on a 12-col grid (updated in
                          place, never prunes; original tracked by node ID)
    pages/componentArchitecture.ts  "Component architecture" reference page
                          (_Demo/* components in place; reference sheet rebuilt each run)
  src/example/loan-pooling/  An example built with Sterling:
    buildExample.ts       "Build example": reads the library, builds the page, runs the checks
    loanPooling.ts        Screen, About frame, example components (_Example/*), state frames
    loanData.ts           Loan sample data, eligibility rules, counts, consistency check
    checks.ts             Example checks: data consistency + action triggers (explicit ACTIONS list)
  tsconfig.json           TypeScript config (uses @figma/plugin-typings)
  package.json            build (esbuild → dist/code.js), watch, typecheck
  dist/                   Build output (gitignored)
scripts/contrast-check.mjs  Reports WCAG contrast for every pair in tokens.json
                          `contrast.rules`; fails if body text < 4.5:1 or large
                          text/UI < 3:1. Run: `npm run contrast` (repo root)
scripts/build-token-site.mjs  Token reference site: `npm run tokens:site` writes site/index.html
                          and site/tokens.css (gitignored)
scripts/lib/tokens.mjs    Shared token loading, alias resolution, and contrast evaluation
package.json              Root scripts (contrast check, token site); no dependencies
README.md                 Building and maintaining Sterling (usage lives on the Figma Read me page)
ARCHITECTURE.md           How it fits together, for designers
docs/mermaid-config.json, docs/mermaid.css   Shared settings for rendering example diagrams
docs/examples/<name>/     Planning docs for an example: .mmd sources (source of truth) and
                          rendered .svg — re-render after editing a .mmd (command in README)
```

## Figma output
- **Variable collections**: Primitives · Color (Light, Dark) · Spacing · Size ·
  Density (Compact, Default, Comfortable). Color aliases Primitives; Density aliases the
  Size and Spacing scales — **every Density value is an alias, never a raw number**
  (written `"{size/32}"` / `"{space/6}"` in tokens.json). Add a scale step rather than a
  raw Density value. Existing Density variables keep their IDs; only values change.
  If the plan limits modes, create the first mode only, log it, and keep the other
  mode values in `tokens.json`.
- **Text styles** (Inter): Display 24, Title 20, Heading 16, Body 13, Body-strong 13,
  Label 12, Caption 11, Numeric 13 (tabular figures).
- **Components**: auto layout throughout; every fill, stroke, padding, gap, and
  radius bound to variables; variants + component properties; slash naming; neutral
  placeholder content. Components whose names start with `_` (`_Demo/*`, `_Example/*`) are
  hidden from publishing.
- **Pages**: Read me · Foundations · Components · Guidelines · Patterns · Template (blank 1440px
  skeleton, 12-col grid: filters | main content | summary slots) · Component architecture ·
  Example: Loan pooling.
- **Menu commands**: "Build library" (variables, styles, every library page; never touches an
  example's screens or data) and "Build example" (only the example page; reads the library via
  libraryLoader and never writes to variables, styles, or library pages).

## Update strategy
- **Documentation frames** (Read me, Foundations, Guidelines, Patterns, an example's About frame):
  deleted and redrawn each run at the same spot.
- **Template and example screens**: updated in place; originals are tracked by node ID so user
  duplicates are never touched.
- **Components** (library, demo, and example): never deleted. Component sets, variants and their
  layers are matched by name and updated in place so instances stay linked. Stale variants are
  warned about, not removed. Keep layer names stable (e.g. "Label", "Icon", "Glyph");
  renaming one breaks in-place updates and instance overrides for it.
- **Moving or renaming generated components**: move the existing node (keeps every instance
  linked) rather than recreating it. To rename, add the old name to the spec's `previousNames`;
  the plugin renames the node in place.
- **Focus rings**: every interactive control has a `State=focus` variant with a 2px
  `focus/ring` outline drawn as an absolutely positioned layer (`ensureFocusRing`), so it
  never shifts layout. Place it **outside** the control by default (3px offset); place it
  **inside** for grid cells, tabs, and other tightly packed elements so it isn't clipped and
  doesn't overlap neighbours. Documented on the Guidelines page.
- **Truncate text, never numbers**: labels and text values truncate with an ellipsis at a max
  width; numeric values (cells, metric values) never truncate — size numeric columns with
  `numericColumnWidth()` (characters × 7.5 + 24, + 16 for gain / loss glyphs, rounded up to 8) and
  use compact notation (e.g. $12.35B) in summary metrics with the full value in Detail.
  Documented on the Guidelines page.
- **Numeric columns** use tabular figures (Numeric style) and right alignment, so digits line up.
  Documented on the Guidelines page.
- **Property names**: Figma names are sentence case and map 1:1 to camelCase code props (Show icon ↔
  showIcon). Kind = visual style · Tone = semantic color · Size = dimensions · State = the
  element's UI state (interaction, plus selection and validation where it has them) · Status = a
  condition of the data · Checked = checkbox value · Show … = every boolean. Rename in place (no
  aliases in Figma): variant props/values via `legacyVariantName`, other props via `ensureProp`'s
  `previousNames`. Documented on the Guidelines page.
- **Names**: every library component sits under a slash folder (Controls, Chip, Grid, Icon, Input,
  Overlay, Summary, Tabs) with a self-describing last segment, since Assets shows leaf names.

## Verification
- Type-check before finishing: `cd plugin && npm run typecheck` (runs `tsc --noEmit`).
- Run `npm run contrast` after any color token change; it must exit 0 (248 pairs today). When
  adding a new text/background combination to a component, add it to `contrast.rules` too.
- Before committing, grep for the banned terms (see Hard rules → Naming); there must be none.

## Loan-pooling example (approved)
Build Pool 2026-07 toward a $50.0M target; resolve issues; submit. Data, rules, counts and
the consistency check live in `plugin/src/example/loan-pooling/loanData.ts`; screens and About read it.
- **Pool workflow**: Draft → Submit pool → Submitted. Submit pool is enabled only with 0
  issues; submitted pools are read-only.
- **Loan workflow** (inside a Draft pool): Available → Add to pool → Ready (eligible) or
  Exception (needs sign-off); Exception → Sign off (note required) → Signed off; Remove from
  pool returns any loan to Available; Ineligible loans can't be added; loans lock with the pool.
- **Eligibility**: Eligible FICO ≥ 680 and LTV ≤ 90% · Exception FICO 660–679 or LTV 90–95%
  · Ineligible FICO < 660 or LTV > 95% · Limit: largest lender share ≤ 30% of pool UPB.
- **Issues** (block Submit pool): each Exception loan, each limit breach.
- **Filter model**: filter = one condition; filter set = applied filters, always chips;
  view = named filter set (+ columns, sort), predefined or saved; status is just a field
  (shortcuts add a chip); pool criteria are not filters. Each tab has its own left filter
  panel (filters the grid only); panel and chips stay in sync; choosing a view fills both.
- **Layout**: filter panel 2 cols | grid 8 cols | summary 2 cols. Grids fill the 8 columns
  exactly (`fitColumns`, Lender flexible); the default pool view has no Sign-off note column.
- **Status tones**: Ready positive, Exception warning, Signed off info. Use ⚠ for exceptions,
  never ▲/▼ (gain/loss). One role (the trader); a second approver is out of scope.
- **Counts**: pool 181 Ready + 2 Exception + 3 Signed off = 186; candidates 56 Eligible +
  4 Exception + 2 Ineligible = 62 (60 addable); issues 2 + 1 = 3. Screens show filtered views:
  Pool loans "Harbor Point loans" (58), Add loans "All candidates · edited" (36, 35 addable).
  Tabs and summary panels show totals. `consistencyProblems()` checks all of this on each build.
- **Bulk action bar**: Pool loans — Sign off (selected exceptions only, label shows the count; disabled
  with the hint "No Exception loans selected" when none) and Remove from pool (secondary, reversible;
  confirmation only when all matching are selected). Add loans — Add to pool. States a / b / b2 / c / d
  in Example states. **Action-trigger check**: every action in the explicit `ACTIONS` list in
  `checks.ts` needs a visible trigger on a screen or state frame. The check never reads
  descriptions or documentation text (those are for people) and logs which actions it checked.
  Failures and data problems show as "example checks: N FAILED" in the run notification.

## Color decisions (approved)
- Neutral is **cool slate**. `neutral/750` is an extra step for dark raised/hover surfaces.
- `blue/75` and `blue/850` are extra steps for `selection/row-hover`: blue/100 and blue/800 failed
  4.5:1 for finance and accent text on hovered selected rows.
- **Sell = coral** (action), **Loss = crimson red** (data). Danger buttons use
  `status/critical` (crimson), never `finance/sell`, so Sell never looks destructive.
- `text/inverse` is the foreground for every solid fill; dark-mode fills are light
  enough to take dark text.
