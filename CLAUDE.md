# Sterling Design System

## Purpose
Sterling is a design system for data-dense applications. It is delivered as a **local Figma
plugin** that generates everything — variables, text styles, components, documentation pages —
from a single token file, and as **React components in Storybook** (`ui/`) built from the same
tokens and component definitions. One Figma file holds the library and, on its own page at the end,
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
  `core/` and `library/` never import from `example/`. `definitions/` imports nothing from `plugin/`.
- **Plan before building.** Propose token and component changes for approval before writing plugin
  code. Build incrementally: tokens → foundations → components → template.

## Project structure
```
tokens/tokens.json        Source of truth: primitives + semantic tokens,
                          Light/Dark color modes, Compact/Default/Comfortable density
definitions/              Plain data about components, with no Figma code (shared with other builds):
  components.ts           THE table of variant properties, values, and component properties with
                          defaults. The plugin builds from it (`variantAxes`, `defineProp` in
                          core/ensure.ts); a library check fails if a built component differs
  grid.ts                 Data grid datasets: Column / GridRow / Dataset types, the generic placeholder data,
                          which columns stretch, and numericColumnWidth(). Shared by the plugin and ui/
  site.ts                 THE public addresses (website and its pages, repository, raw files, Release downloads,
                          Figma Community, the view-only file for maintainers). The plugin doesn't bundle it: the
                          addresses the plugin uses (website, Storybook, repository, CONTRIBUTING) are in
                          pluginAddresses.ts, which site.ts re-exports and docRegistry.ts and the plugin import. The audience matrix (AUDIENCES) is in audiences.ts.
                          Never write a Sterling address anywhere else: `npm run check:urls` fails. Link the
                          Figma Community page, not the view-only file, except in maintainer docs
  docRegistry.ts          Also holds DOCS_TARGET ("figma" | "storybook": where documentation links point;
                          "storybook" since 1.1.1) and re-exports STORYBOOK_URL from pluginAddresses.ts (never import
                          site.ts here: the plugin bundles this file). `npm run check:docs` checks the pages exist
  docRegistry.ts          THE table of component documentation: one-sentence description, details,
                          use / don't use, related guidance. Every published component needs an entry
                          (shown under Guidelines › Component usage); its documentation link follows DOCS_TARGET
  icons.ts                Icon glyphs (original outline SVG path data)
  guidelines.ts           THE table of Guidelines and Patterns text: each section's summary, rules, and do /
                          don't notes; each pattern's summary, use / don't use, and numbered steps. The plugin
                          draws it and builds the examples (found by position: keep the order in step)
plugin/
  manifest.json           Figma plugin manifest ("Sterling"; no network access, dynamic-page access)
  src/main.ts             Entry point — runs "Build library" or "Build example", reports results
  src/core/               Shared machinery, no design content:
    meta.ts               Name, tagline, and version (version read from the root package.json)
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
    compositions.ts       Reusable layouts from library components (filter panel, view toolbar, view menu,
                          card, link row); used by the Patterns page and by examples
    docLinks.ts           Sets documentation links from the registry (after Guidelines / Patterns are drawn)
    checks.ts             Library checks: definitions matched, descriptions, doc links, registry coverage,
                          hidden Primitives
    icons.ts              Icon/<name> components drawn from definitions/icons.ts (layer "Glyph")
    components/*.ts       One spec per component; grid and bulk bar are data/spec-driven
                          (grid.ts also builds Skeleton row and Empty state; menu.ts builds
                          Input/Option and Input/Menu)
    pages/cover.ts        Cover page: name, tagline, version, component montage (rebuilt each run)
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
    annotations.ts        THE table of developer annotations on the Pool loans screen (target layer, category,
                          text); applied on every Build example
    checks.ts             Example checks: data consistency, action triggers (explicit ACTIONS list),
                          grid layout, annotation targets
  tsconfig.json           TypeScript config (uses @figma/plugin-typings)
  package.json            build (esbuild → dist/code.js), watch, typecheck
  dist/                   Build output (gitignored)
ui/                       Sterling in code (React + Storybook, Vite). Own package.json; Node 20.19+
  .storybook/             main.ts, preview.tsx (token CSS, Theme / Density toolbar, a11y as errors),
                          manager.ts (title with the version)
  src/tokens.ts           Reads tokens.json for the Foundations pages and toolbar
  src/styles/             base.css; fonts.css loads Inter 3.19 (`inter-ui`), the version Figma renders —
                          change both sides together; tokens.css is generated by `npm run tokens` (gitignored) —
                          never hand-edit it. CSS in ui/ uses token custom properties only, no raw values
  src/foundations/        Foundations pages drawn from tokens.json
  src/components/         <Name>.tsx + .css + .stories.tsx. Variant props are typed with
                          VariantValue<"Controls/Button", "Kind"> (the parity check requires it); a new
                          component is added to src/parity/coded.ts. Class names: stl-<component>[--<value>]
                          Select uses React Aria hooks (react-aria, react-stately) for behavior only;
                          Dialog is a native <dialog>. No other runtime dependencies besides React
  src/stories/definitions.tsx  Docs text (docRegistry), controls and defaults, and the "All variants"
                          grid (columns = State, forced with the pseudo-states addon), all from definitions/
  src/parity/             parity.ts (how definitions map to code: no `state` prop; hover / focus /
                          pressed are CSS, disabled is a boolean prop) and coded.ts (coded components)
  scripts/check-parity.ts `npm run check:parity`: every defined component is coded (24 of 24) and follows
                          definitions/components.ts; a new Figma component fails it until it is coded
  src/index.ts            Everything the sterling-ui package exports: every component, its props type, the
                          grid's data types, numericColumnWidth, textClass, densityClass. A new component is
                          added here too (check:ai fails otherwise)
  scripts/build-package.mjs  `npm run package`: ui/package/ (gitignored) and sterling-ui-<version>.tgz, with
                          dist/index.js, dist/types/, dist/styles.css (tokens + components), dist/fonts.css.
                          Private: installed from the tarball, never published to a registry
  src/examples/<name>/    Example screens written against the sterling-ui package (Storybook resolves it to
                          src/index.ts). Examples › Pool loans is the demo session's screen: committed as
                          delivered, then corrected one commit at a time. `npm run check:examples`: only
                          sterling-ui, React, and its own files; never a component's internal stl- classes
  scripts/export-demo-data.ts  Writes demo/data/pool-2026-07.json from the plugin's loan example (data and
                          rules only); `npm run check:demo-data` fails if it is out of date
  scripts/lib/ai-export.ts  Builds the export in ai/ from the sources; scripts/export-ai.ts writes it
                          (`npm run export:ai`), scripts/check-ai.ts checks it (`npm run check:ai`)
ai/                       The machine-readable export for AI tools (committed, generated: never hand-edit):
                          index.json, components.json, tokens.dtcg.json (DTCG 2025.10), guidelines.json.
                          Regenerate with `npm run export:ai` after changing tokens, definitions/, or coded.ts
demo/                     The demo kit: a test of building a screen from what Sterling publishes (demo/README.md).
                          template/ (empty app, the session's CLAUDE.md and settings), data/, prompt.md.
                          `npm run demo:kit` builds demo/kit/ (gitignored). NEVER commit a local path: the
                          folders the session must not read come from demo/kit.local.json (gitignored)
mcp/                      A read-only MCP server over the export, for AI tools. Own package.json (exact dependency
                          versions: @modelcontextprotocol/sdk, zod); stdio only, NO network access, nothing on npm
  scripts/build.mjs       Copies ai/ into data/ (gitignored) and bundles everything into dist/server.js (gitignored)
  src/tools.ts            THE table of the eight tools: name, description (what a client reads), arguments, logic.
                          src/tool-names.ts lists the names (also used by llms.txt); src/lookup.ts matches names
                          and finds the closest for an unknown one; src/server.ts wires tools to the protocol
  test/                   `npm run check:mcp` (root): every tool, the bundled data against ai/, no network code,
                          and the built file running alone in an empty folder. Rebuild after `npm run export:ai`
scripts/contrast-check.mjs  Reports WCAG contrast for every pair in tokens.json
                          `contrast.rules`; fails if body text < 4.5:1 or large
                          text/UI < 3:1. Run: `npm run contrast` (repo root)
scripts/check-tokens.mjs  Token checks: every published token (color, spacing, size, density) has a
                          description in its group's "$descriptions"; versions agree. Run: `npm run check:tokens`
scripts/build-token-css.mjs   Token CSS for code: `npm run tokens:css` writes dist/tokens.css (gitignored)
scripts/build-token-site.mjs  The token reference: `npm run tokens:site` writes site/tokens/index.html,
                          site/tokens.css (gitignored; the same CSS), and site/fonts/ (Inter 3.19 copied
                          from ui/node_modules/inter-ui, when installed). Addresses from ai/index.json
scripts/lib/page-shell.mjs  The website's page shell: head, fonts, token CSS, the site navigation, the Light /
                          Dark switch, the footer. Every website page uses it; phone width up
ui/scripts/build-pages.ts `npm run pages` (in ui/): Start here (site/index.html) from AUDIENCES in
                          definitions/audiences.ts, Install sterling-ui (site/install/) from definitions/setup.ts, and
                          Sterling and AI tools (site/ai-tools/): Chip/Status followed from source to code in seven
                          steps, the MCP setup block, a first prompt. Needs the MCP server built (npm run build in mcp/)
ui/scripts/lib/excerpts.ts  THE AI page's excerpts, read from the real files by selector (TS entry, JSON path, lines,
                          code symbol); each must match once. Step 7's code must be identical to 2872cf0, as delivered.
                          `npm run check:excerpts` runs them (needs git history and the built MCP server)
mcp/scripts/exchange.mjs  A real exchange with the built server (tools/list, get_component, get_pattern), as JSON,
                          for the AI page's step 6
definitions/setup.ts      THE setup instructions (Where / You need / Do / Scope / It worked if / If it didn't),
                          shown by the website, README, and Storybook
ui/scripts/check-site.mjs `npm run check:site`: every website page, axe in Light and Dark (system preference
                          emulated), as loaded and as without JavaScript (script-added parts marked data-script-added),
                          no sideways scroll at 375px, every internal link and anchor, the AI page's steps by keyboard
scripts/build-site.mjs    `npm run site`: site/ = Start here + install/ + tokens/ + ai-tools/ + Storybook under
                          storybook/ + a copy of ai/ + llms.txt (what Pages publishes); builds the MCP server first;
                          scripts/serve-site.mjs (`npm run site:serve`)
ui/scripts/docs-sync.ts   `npm run docs:sync`: writes the generated parts of docs between `<!-- generated: … -->`
                          markers: README's Start here table (AUDIENCES), mcp/README.md's setup block (setup.ts),
                          and docs/figma-community.md's version and counts. `npm run check:docs-sync` fails if stale
docs/figma-community.md   The Figma Community page text (pasted at release); docs/github-about.md: the About panel
scripts/figma-fingerprint.mjs  `npm run figma:fingerprint -- <file key>`: the call that fingerprints a Figma file
                          (read-only code in scripts/lib/figma-fingerprint.js: every library page, variable, text
                          style); `-- compare before.json after.json` compares two. Never commit a file key
scripts/lib/llms.mjs      Renders llms.txt from ai/index.json (`llmsTxt`: intro, guidance, sections of text and
                          links). To add a section, add it in ui/scripts/lib/ai-export.ts; check:ai validates it
scripts/lib/tokens.mjs    Shared token loading, alias resolution, and contrast evaluation
scripts/lib/token-names.mjs  Token name → CSS name (no imports; shared with ui/)
scripts/lib/token-css.mjs The one generator of the token CSS. CSS names carry the `stl-` code prefix
                          (--stl-space-8, .stl-text-body); Figma names take no prefix. Never hand-edit
                          generated CSS
package.json              Version (the single source; shown on the Cover and Read me pages) and root
                          scripts (contrast check, token checks, token site); no dependencies
README.md                 Public front page: what Sterling is, what's in it, how it's built, how to run it
docs/reference.md         Maintainer reference: every collection, component, property, and tool option
CONTRIBUTING.md           Propose, build, check, release; versioning rules
CHANGELOG.md              Every release, starting at 1.0.0
LICENSE, LICENSE-docs.md  MIT for code; CC BY 4.0 for documentation and design content
.github/workflows/        ci.yml (checks on every push and pull request); pages.yml (publishes the token
                          site from main; skipped while the repo is private)
ARCHITECTURE.md           How it fits together, for designers
docs/mermaid-config.json, docs/mermaid.css   Shared settings for rendering diagrams
docs/diagrams/            Library diagrams: ai-layer.mmd (how the AI layer is built and used; on the AI page),
                          rendered per color mode in Sterling's colors from the tokens (ai-layer.svg, ai-layer.dark.svg)
docs/examples/<name>/     Planning docs for an example: .mmd sources (source of truth) and rendered .svg
scripts/render-diagrams.mjs  `npm run diagrams`: every .mmd in docs/ → SVG beside it (Mermaid CLI, pinned in
                          scripts/lib/diagrams.mjs, which also builds the per-mode colors), stamped with the hash of
                          the source (and colors). `npm run check:diagrams` fails if either changed without a
                          re-render. Never hand-edit a rendered SVG
```

## Figma output
- **Variable collections**: Primitives · Color (Light, Dark) · Spacing · Size ·
  Density (Compact, Default, Comfortable). Color aliases Primitives; Density aliases the
  Size and Spacing scales — **every Density value is an alias, never a raw number**
  (written `"{size/32}"` / `"{space/6}"` in tokens.json). Add a scale step rather than a
  raw Density value. Existing Density variables keep their IDs; only values change.
  If the plan limits modes, create the first mode only, log it, and keep the other
  mode values in `tokens.json`.
- **Text styles** (Inter): Display 24, Title 20, Heading 16, Body 13, Body-strong 13, Body-link 13,
  Label 12, Label-link 12, Caption 11, Numeric 13 (tabular figures). The -link styles carry the underline:
  never write a text decoration on a layer bound to a text property (Figma copies it, with that variant's
  text style, to every variant sharing the property; see ARCHITECTURE.md).
- **Components**: auto layout throughout; every fill, stroke, padding, gap, and
  radius bound to variables; variants + component properties; slash naming; neutral
  placeholder content. Components whose names start with `_` (`_Demo/*`, `_Example/*`) are
  hidden from publishing.
- **Pages**: Cover · Read me · Foundations · Components · Guidelines · Patterns · Template (blank
  1440px skeleton, 12-col grid: filters | main content | summary slots) · Component architecture ·
  a page divider · Example: Loan pooling.
- **Menu commands**: "Build library" (variables, styles, every library page; never touches an
  example's screens or data) and "Build example" (only the example page; reads the library via
  libraryLoader and never writes to variables, styles, or library pages).

## Update strategy
- **Documentation frames** (Cover, Read me, Foundations, Guidelines, Patterns, an example's About frame):
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
  `numericColumnWidth()` (characters × 7.5 + 24, + 16 for gain / loss glyphs or for the flag icon in columns that can be
  flagged, rounded up to 8) and
  use compact notation (e.g. $12.35B) in summary metrics with the full value in Detail.
  Documented on the Guidelines page.
- **Sort icons**: only the sorted column shows one at rest; an unsorted Grid/HeaderCell hides its icon
  layer (kept, not removed) until hover or focus. Both builds fail if a grid header shows more than one.
- **Numeric columns** use tabular figures (Numeric style) and right alignment, so digits line up.
  In code a grid is a native table (data table, not role="grid"): Tab moves between header sort buttons and
  row checkboxes. Body cell focus variants are for future editable cells. See ARCHITECTURE.md.
  The intent: the sort icon always sits next to its label (code does this at any width; Figma approximates it,
  with the icon at the cell edge). Flagged cells (warning / error) keep their look on hover and selection.
  Right-aligned header labels stay flush with the values; the sort icon sits to the label's left. Never
  change the HeaderCell layout to move the icon: size numeric columns to their values instead (see
  ARCHITECTURE.md, "Where Figma and code differ"). Both builds check the alignment.
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
- Type-check before finishing: `cd plugin && npm run typecheck` (runs `tsc --noEmit`). After changes in
  `ui/` or `definitions/`: `cd ui && npm run typecheck && npm run check:parity && npm run check:css && npm run check:ai`, then
  `npm run check:mcp` (root; rebuilds the MCP server from ai/ and tests it), and
  `npm run build-storybook && npm run check:a11y` (axe on every story in Light and Dark; needs Chrome).
- Run `npm run contrast` after any color token change; it must exit 0 (248 pairs today). When
  adding a new text/background combination to a component, add it to `contrast.rules` too.
- Run `npm run check:tokens` after any token change; it must exit 0. Every new Color, Spacing, Size,
  or Density token needs a description in that group's `"$descriptions"` in tokens.json (Primitives
  need none: they're hidden).
- When a release changes the version, set it in package.json, plugin/package.json, ui/package.json,
  mcp/package.json, and tokens.json `$meta.version`, and add a CHANGELOG.md entry (see CONTRIBUTING.md).
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
  exactly (`fitColumns`: descriptive text columns share the extra width, Lender takes the rounding
  remainder; numeric, identifier (`identifier: true`, e.g. Loan ID), chip, and checkbox columns stay
  value-sized — the rule is `stretches()` in grid.ts); the default pool view has no Sign-off note column.
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
- `surface/scrim` (behind a modal dialog) is the only translucent color. Its `alpha/*` primitives are
  8-digit hex (#RRGGBBAA): neutral/900 at 50% in Light, black at 60% in Dark.
