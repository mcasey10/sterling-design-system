# Sterling Design System

Sterling is a design system for data-dense applications: tokens, a Figma component library, and
written guidelines, with first-class support for the things dense screens depend on, such as grids,
filters, bulk actions, and numbers that always line up.

![Sterling's cover: the name, tagline, and version beside a data grid, a bulk action bar, and summary metrics built from Sterling components](docs/images/cover.png)

- **Figma file (view only):** [Sterling Design System](https://www.figma.com/design/1Ah1TdgOoCkaCq1dUZFYbd/Sterling-Design-System)
- **Token reference site:** [mcasey10.github.io/sterling-design-system](https://mcasey10.github.io/sterling-design-system/)
- **Version:** 1.0.0 ([changelog](CHANGELOG.md))

## What's in it

| | |
|---|---|
| **Tokens** | One source file, [`tokens/tokens.json`](tokens/tokens.json). Color has Light and Dark modes; Density has Compact, Default, and Comfortable. Semantic tokens alias a hidden set of primitives, and every published variable says what it's for. |
| **Components** | 44 published components: buttons, inputs and menus, chips, tabs, a dialog, summary metrics, 20 icons, and a data grid built from cells, rows, headers, pagination, and loading and empty states. Every interactive control has a visible keyboard focus state, plus the states it needs: hover, pressed, disabled, selected, error. |
| **Guidelines** | The rules the components follow: accessibility, data display, naming, states, color, and icons, with do and don't pairs. Each component has its own entry saying when to use it and when not to. |
| **Patterns** | Nine compositions with neutral sample data: filters with a grid and bulk actions, the bulk action bar's states, filter panel and chips, saved views, status chips, warning and exception cells, the confirmation dialog, form layout, and loading, empty, and error states. |
| **Template** | A blank 1440 × 900 screen on a 12-column grid to duplicate and build on. |
| **An example** | A loan pooling workflow built with Sterling, on its own page. See [below](#the-example-loan-pooling). |

## How it's built

**The Figma file is generated.** A local Figma plugin reads the token file and builds everything:
variables, text styles, components, and the documentation pages. To change Sterling, I change the
tokens or the plugin code and rebuild. Nothing is drawn by hand, so the file can't drift from its
source.

Rebuilding is safe. The plugin finds each component, variant, and layer by name and updates it in
place, so every instance in the file stays linked and keeps its overrides.

**Each build checks itself.** It reports a problem, and says where, if:

- a text and background pair falls below WCAG contrast (248 pairs, in Light and Dark);
- a published component is missing its description or its documentation link, or a published
  variable is missing its description;
- an instance loses the link to its main component;
- a right-aligned header isn't flush with the numbers below it, a value doesn't fit its column, or
  a grid shows more than one sort icon;
- in the example, the totals don't add up, an action has no visible trigger, or a developer
  annotation has lost its target.

**I built Sterling with [Claude Code](https://claude.com/claude-code), under my direction.** I set
the scope, made the design decisions, and reviewed each step in Figma before accepting it. Claude
Code wrote the plugin and scripts and ran the checks. [ARCHITECTURE.md](ARCHITECTURE.md) explains
how the pieces fit together, in plain language.

## The example: loan pooling

The last page of the Figma file is an example built with Sterling: a screen where a trader
assembles mortgage loans into a pool, resolves the loans that fall outside the eligibility rules,
and submits it.

![The Pool loans screen: a filter panel, a grid of loans with one exception flagged, a bulk action bar, and a pool summary listing the issues that block submission](docs/images/example-pool-loans.png)

- Two screens (Pool loans and Add loans), the states of the bulk action bar, and the dialogs.
- An About frame with the business context, the workflows, and the eligibility rules, written for
  readers who don't know the mortgage industry.
- Developer annotations on the Pool loans screen (press Shift+Y in Figma to show or hide them).
- Every number on the page comes from one data file, and each loan's status is worked out from its
  figures, so the screens and the documentation can't disagree.

All data is fictional: the lenders, loans, and figures are made up.

## Run it yourself

You need [Node.js](https://nodejs.org) 18 or newer and the Figma desktop app on a plan that allows
several variable modes per collection (Professional or higher).

```bash
cd plugin
npm install
npm run build
```

Then, in an empty Figma design file:

1. Choose **Plugins → Development → Import plugin from manifest…** and select `plugin/manifest.json`.
2. Run **Plugins → Development → Sterling → Build library**.
3. Run **Plugins → Development → Sterling → Build example**.
4. One manual step, once per file: turn on tabular figures for the **Numeric** text style
   (**Type settings → Details → Numbers → Style → Monospace uppercase/lining**). The plugin can't
   set it, and reminds you until it's on.

The checks that don't need Figma run from the repo root:

```bash
npm run contrast
```

```bash
npm run check:tokens
```

```bash
npm run tokens:site
```

## Find your way around

| | |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How it fits together: folders, the build cycle, what you can edit in Figma, and how the checks work |
| [docs/reference.md](docs/reference.md) | Every collection, component, and property, and each tool's options |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How a change is proposed, built, checked, and released |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each version |
| [docs/manual-walkthrough.md](docs/manual-walkthrough.md) | How a designer would build these variables and variants by hand |

## License

The code (the plugin, the scripts, and the token file) is under the [MIT License](LICENSE). The
documentation and the design content are under [CC BY 4.0](LICENSE-docs.md).

© 2026 Michael Casey
