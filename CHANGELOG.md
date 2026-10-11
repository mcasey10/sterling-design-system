# Changelog

All notable changes to Sterling are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/) as defined for a design system in
[CONTRIBUTING.md](CONTRIBUTING.md#versions).

## [Unreleased]

### Added

- **Text styles `Label-link` and `Body-link`:** Label and Body with an underline, for link text.
- **Density tokens `card/padding` and `card/gap`:** padding and gap for cards (12 / 16 / 24 and 6 / 8 / 12).

### Changed

- **Summary metric** follows Density: its padding and the gap between its parts use `card/padding` and
  `card/gap`. Default looks the same as before.
- **Controls/Link** is underlined in Figma, through the new link text styles. It was meant to be from the
  start, but the underline was lost on every build.

- **Bulk action bar:** removed the checkbox-like mark beside the count, in Grid/BulkActionBar and the
  loan example's bars. It looked like a control and did nothing; select-all is the checkbox in the
  grid's header. The count, the row highlights, and Clear selection carry the meaning. A correction to
  1.0.0, which was never published.
- **Bulk action bar:** "Select all N matching" is underlined, like every link, so it isn't marked by
  color alone. It uses `Body-link`.

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

[1.0.0]: https://github.com/mcasey10/sterling-design-system/releases/tag/v1.0.0
