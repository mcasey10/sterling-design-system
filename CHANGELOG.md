# Changelog

All notable changes to Sterling are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/) as defined for a design system in
[CONTRIBUTING.md](CONTRIBUTING.md#versions).

## [Unreleased]

### Website

- **Two-level navigation.** The menu has two groups, Sterling (Start here, Install, Tokens, Storybook, GitHub) and
  Build with AI (Set up, Watch it build, Live example, Follow-up runs). A group's link opens its first page; the
  second row lists the current group's pages. No address changed. Links to these pages use the menu's names
  (Watch it build, Try the live example), and the demo page no longer shows a breadcrumb.
- **Five follow-up runs** (`/runs/`): the demo's build repeated five times from scratch after the three fixes, with
  what held, what varied, and the full record.
- **Two builds** (`/#two-builds`), a new section of Start here: building Sterling, and building a screen with it.
- The demo, the live example, and Set up link to both. Set up advises letting your AI tool see the app it builds.
- The demo page and the case study no longer say the first session had no browser available: Chrome was installed
  and could have been started from the shell, and the session didn't try.

### Tooling

- `docs/decks/` for public slide decks, and `check:decks`: every .pptx and .pdf is read in full and fails on a banned
  term, a local path, or an author or company in its metadata. CI runs it without the banned-terms list.

## [1.2.0] - 2026-10-21

Sterling for AI tools, and a website with every way in: an MCP server and machine-readable files that describe
every component, token, and guideline, the React components as an installable package, and pages that say who
Sterling is for and how each reader starts.

### Added

**The website**
- **Start here**, the new home page: who Sterling is for, why each would use it, and where each should go, with
  how you get each place (Browser, Duplicate, Read by URL, Install, Download and register once, Clone).
- **Install sterling-ui** (`/install/`) and **Sterling and AI tools** (`/ai-tools/`): setup written to one
  standard (where, what you need and how to check it, what to do, scope, how you know it worked, what to do if
  it didn't). The AI page follows one component, Chip/Status, from its sources to code an AI tool wrote; every
  excerpt is read from the real files when the site builds, and its MCP exchange comes from the built server.
- One page shell for every page, with the same navigation and a System / Light / Dark switch, at any width
  down to a phone's.

**For AI tools**
- **The AI files** (`ai/`): every component with its guidance, Figma properties, and React props; every token
  in the Design Tokens (DTCG) format, with its value in each mode and its CSS name; the guidelines and patterns;
  and an index. Generated from the sources and checked against them.
- **`llms.txt`** at the website's root: Sterling for tools that read by URL, linking to the AI files.
- **An MCP server:** eight read-only tools over the same files, in one file, `sterling-mcp.js`, attached to each
  Release. It works with any MCP client, runs on your machine, and makes no network requests. An MCP client
  calls it; it doesn't read `llms.txt`.

**In code**
- **The `sterling-ui` package:** the React components with type declarations, the token CSS, and Inter, as a
  tarball attached to each Release and installed from its address. It isn't on a package registry.
- **Examples › Pool loans** in Storybook: the loan example's screen, built by an AI session whose only sources for
  Sterling were the package and the MCP server, then corrected in six commits (a to f). Its "Filter counts" test
  checks the loan counts after a filter, Reset, "Any lender", and Clear all; "Loans by status, wrapped" checks that
  no wrapped line of the summary's status links starts with a separator.
- **Data grid:** a flagged cell can carry its reason for screen readers (a row's `descriptions`, read after
  the value and its flag).

**The demo**
- **The demo replay** (`/demo/`): the session that built the Pool loans screen, step by step: the request, every
  call to the MCP server with its answer (as the server gave it, from a pre-release build), the session's own
  notes, and the screen as delivered. Linked from Start here and the AI page.
- **The case study** (`docs/case-study/pool-loans.md`): what Sterling and 1.2 are for, how the session went, what
  was corrected afterwards and whose each correction was, what the checks missed, how well it worked, and how
  teams might apply it.

**For maintainers**
- Checks for everything above, in CI: the AI files against their sources, the MCP server's tools and its copy
  of the files, the website (axe in Light and Dark, phone width, every link), the AI page's excerpts, the
  generated parts of the documentation, the diagrams, Storybook's interaction tests, and the demo replay's
  record (no local path or unknown address in it).
- `npm run figma:fingerprint`, to show a rebuild changed nothing it shouldn't have.

### Changed

- **The token reference** moved to `/tokens/`; its old section links still work.
- **Figma, the Read me page:** links to the website, Storybook, and GitHub; the text styles include Body-link
  and Label-link; restyling is described as maintainer work, with a link to CONTRIBUTING.
- **Figma, the Cover:** the website's address.
- **Patterns, Reset and Clear all:** Reset returns every field to the active saved view's filters (or empty if
  no view is active); Clear all removes every filter. **Filter panel and chips** also says that a field left
  empty, or set to its "Any …" option, doesn't filter.
- **The Icon entry** says an icon is the Icon value of Controls/Button and Controls/Icon button.
- **The README** starts with the website and the Start here table; setting up Sterling to work on it moved to
  "Work on Sterling".
- **Storybook:** the Introduction links to the install page, Start here, the token reference, Figma Community,
  and the AI page; the browser tab reads "Sterling" and the version.
- The Guidelines and Patterns text is plain data in `definitions/guidelines.ts`, read by the plugin and the
  AI files. The pages in Figma are unchanged apart from the text above.

### Fixed

- **Data grid:** in a grid wider than its container, the empty state stays in view instead of centering
  across every column, where its message was cut off.
- **Guidelines and Patterns:** the footers name the file their text comes from.

### Ideas for later releases (not scheduled)

A Claude Code plugin that carries the MCP server, and a Claude Desktop extension (`.mcpb`);
a toast or inline message, a card or panel, a screen-reader-only text class, layout tokens, grouped options
and descriptions in Select, and a tooltip; and name the Numeric style's Type details in the plugin's three
copies of the tabular-figures step: the Read me step, the run report reminder, and the Numeric style's
description (tokens/tokens.json).

Maintenance: newer GitHub Actions (checkout, setup-node, and the Pages actions), CI on Node 22 or 24 instead of 20,
and no `shell: true` in `scripts/build-site.mjs` (Node's DEP0190 warning).

## [1.1.1] - 2026-10-11

### Changed

- **Documentation links** in Figma open the component's Docs page in Storybook, which shows the same
  guidance beside the coded component. Each component keeps its entry under Guidelines › Component usage.

### Fixed

- **Token reference site:** it loads Inter itself (3.19, the files Storybook uses), so it looks the same
  on machines without Inter installed.

## [1.1.0] - 2026-10-11

Sterling in code: every component as a React component, documented in Storybook and built from the
same tokens and definitions as the Figma library.

### Added

**Coded components**
- All 24 components and the 20 icons as React components, styled only with Sterling's tokens.
- Storybook, with a Docs page per component (the same guidance as the Figma library), an "All
  variants" story laid out like each Figma variant set, and a toolbar for Theme (Light, Dark) and
  Density (Compact, Default, Comfortable).
- Foundations pages for color, spacing and size, density, and typography, drawn from the token file.
- A data grid that is a native table, with a select-all checkbox, Shift+click and Shift+Space range
  selection, sorting, pagination, and loading, empty, and error states. Selection and loading are
  announced to screen readers.
- A select with full keyboard support (React Aria) and a dialog on the native `<dialog>` element.

**One source for Figma and code**
- `definitions/`: each component's variants and properties, its documentation, the icon glyphs, and
  the grid's placeholder data, shared by the plugin and the coded layer.
- A library check that every built Figma component matches its definition.

**Checks**
- `check:parity`: every Figma component has a coded counterpart whose props match its definition.
- `check:a11y`: an automated accessibility run (axe) over every story, in Light and Dark.
- `check:css`: no color, size, or font value in the coded layer's CSS that isn't a token.
- `check:docs`: every component has the Storybook Docs page its documentation link can open.
- Library and example checks that every link, and every instance of one, is underlined.

**Site**
- One site: the token reference at the root, with Storybook under `storybook/`, linked to each other.
- `DOCS_TARGET`: a setting for whether a component's documentation link in Figma opens its entry in
  the file or its Docs page in Storybook.

**Tokens**
- Text styles `Label-link` and `Body-link`: Label and Body with an underline, for link text.
- Density tokens `card/padding` and `card/gap`: padding and gap for cards (12 / 16 / 24 and 6 / 8 / 12).
- Color token `surface/scrim`: the layer that dims the page behind a modal dialog.

**Components**
- Input/Text and Input/Select: a `warning-focus` state.
- Input/Option: a `focus` state, for the option the arrow keys are on.

**Guidelines and Patterns**
- The confirmation dialog shown over a dimmed screen.
- Rules for where the sort icon sits, flags staying visible on hover and selection, selected tabs
  having no hover state, chips and density, and why Sterling's grids are data tables.

### Changed

- **Summary metric** follows Density: its padding and the gap between its parts use `card/padding` and
  `card/gap`. Default looks the same as before.
- **Controls/Link** is underlined in Figma, through the new link text styles. It was meant to be from the
  start, but the underline was lost on every build.
- **Bulk action bar:** removed the checkbox-like mark beside the count; it looked interactive but wasn't.
- **Bulk action bar:** "Select all N matching" is underlined, like every link, so it isn't marked by
  color alone. It uses `Body-link`.
- **Node.js 20.19 or newer** is needed to run Storybook and the coded layer's checks.

## [1.0.0] - 2026-10-10

The first release.

### Added

**Tokens**
- One source file, `tokens/tokens.json`, with five variable collections: Primitives (hidden), Color
  (Light and Dark), Spacing, Size, and Density (Compact, Default, and Comfortable).
- Color aliases Primitives, and Density aliases the Size and Spacing scales, so no component value
  sits off the scale.
- A description on every published variable, saying what it's for.
- Nine text styles, including Numeric for tabular figures.

**Components**
- 44 published components: Button, Icon button, Link, Checkbox, Status chip, Side chip, Filter
  chip, Text input, Select, Menu, Option, Option with description, Menu heading, Tab, Dialog,
  Summary metric, and 20 icons.
- A data grid built from its parts: Header cell, Body cell, Row, Data grid, Pagination, Skeleton
  row, Empty state, and Bulk action bar.
- A visible keyboard focus state on every interactive control.
- A one-sentence description and a documentation link on every component.

**Guidelines and patterns**
- Guidelines: principles, accessibility, data display, naming, states, color, icons, and an entry
  for each component saying when to use it and when not to.
- Nine patterns with neutral sample data: filters, grid, and bulk actions; bulk action bar; filter
  panel and chips; saved views; status chips; warning and exception cells; confirmation dialog;
  form layout; and loading, empty, and error states.
- A blank 1440 × 900 template on a 12-column grid.
- A reference page on component architecture: variants, properties, slots, and hierarchy.

**Example**
- A loan pooling workflow built with Sterling: two screens, the bulk action bar's states, dialogs,
  developer annotations, and an About frame with the business context, workflows, and rules. All
  data is fictional.

**Tooling**
- A Figma plugin with two commands, Build library and Build example. Both update the file in place,
  so instances stay linked and keep their overrides.
- Checks in every build: instance links, component and variable documentation, grid layout
  (right-aligned headers flush with their values, content that fits its column, at most one sort
  icon), and, for the example, data consistency, action triggers, and annotation targets.
- Checks without Figma: WCAG contrast for 248 text and background pairs (`npm run contrast`) and
  token descriptions (`npm run check:tokens`).
- A token reference site with CSS custom properties under the `stl-` prefix (`npm run tokens:site`),
  published to GitHub Pages.
- Continuous integration on every push and pull request.

[1.2.0]: https://github.com/mcasey10/sterling-design-system/releases/tag/v1.2.0
[1.1.1]: https://github.com/mcasey10/sterling-design-system/releases/tag/v1.1.1
[1.1.0]: https://github.com/mcasey10/sterling-design-system/releases/tag/v1.1.0
[1.0.0]: https://github.com/mcasey10/sterling-design-system/releases/tag/v1.0.0
