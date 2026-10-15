# Figma Community page

The text for Sterling's page on Figma Community. At each release, after the version bump and
`npm run docs:sync` (which sets the version and the component and icon counts below), paste everything under
**Description** into the page's description, and set the tags. The banned-terms check covers this file.

## Description

Sterling Design System 1.2.0

A design system for data-dense applications: design tokens, this Figma library, and the same components in React, all built from one set of definitions. Intentionally small: 24 components, 20 icons, and a data grid built as a data table (read, sort, select, and act; no inline editing or column resizing).

Use it

- As it is: duplicate this file and use the components, variables, and text styles, or publish them as your team's library. One manual step: turn on tabular figures for the Numeric text style (Type settings → Details → Numbers → Style → Monospace uppercase/lining).
- In code: install the sterling-ui package into a React project. The components are documented in Storybook.
- With AI tools: an MCP server and machine-readable files describe every component, token, and guideline, so an AI tool builds with Sterling instead of inventing its own.

Everything starts at the website, with every way in for each kind of reader:
https://mcasey10.github.io/sterling-design-system/

Changing Sterling itself (maintainers): this file is generated from the GitHub repository by a plugin, so restyling means changing the tokens there and rebuilding. Edits made by hand to Sterling's own values are reset on the next rebuild. See https://github.com/mcasey10/sterling-design-system

All example data is fictional.

## Tags

accessibility, data grid, design system, design tokens, storybook, mcp
