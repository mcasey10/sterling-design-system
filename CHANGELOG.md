# Changelog

All notable changes to Sterling are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/) as defined for a design system in
[CONTRIBUTING.md](CONTRIBUTING.md#versions).

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

[1.1.1]: https://github.com/mcasey10/sterling-design-system/releases/tag/v1.1.1
[1.1.0]: https://github.com/mcasey10/sterling-design-system/releases/tag/v1.1.0
[1.0.0]: https://github.com/mcasey10/sterling-design-system/releases/tag/v1.0.0
