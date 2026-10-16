# Figma Community page

The text for Sterling's page on Figma Community. At each release, after the version bump, run
`npm run docs:sync`: it sets the version, the counts (contrast pairs, guideline sections, patterns, components,
icons), and the three addresses below, and `npm run check:docs-sync` fails while any is out of date. Then paste
everything under **Description** into the page's description, and set the tags. The banned-terms check covers
this file.

## Description

Sterling Design System 1.2.0

A design system you can check, not just browse. Design tokens, this Figma library, and the same components in React, all from one set of definitions: a plugin builds this file, the React components follow the same definitions, and a check fails if a component's variants or properties ever differ between Figma and code.

What sets Sterling apart

- One source, no drift. Variables, components and documentation pages are generated, not drawn by hand. The React components (sterling-ui) use the same tokens and are checked against the same definitions.
- Checked on every build. Contrast for 124 text and background pairs, each in Light and Dark; automated accessibility tests on every component's stories, in Light and Dark; token-only CSS; design–code parity.
- Readable by AI tools. An MCP server and machine-readable files describe every component, token and guideline. Watch Claude Code build a screen with it: https://mcasey10.github.io/sterling-design-system/demo/
- Guidance included. 7 guideline sections and 9 patterns, with when to use each component and when not to.

What's inside: 24 components and 20 icons for data-dense screens, including a data grid built as a data table (read, sort, select, and act; no inline editing or column resizing).

Use it: duplicate this file (one manual step: turn on tabular figures for the Numeric text style, under Type settings → Details → Numbers → Style → Monospace uppercase/lining). In code, or with AI tools, start at https://mcasey10.github.io/sterling-design-system/

Changing Sterling itself is maintainer work: this file is generated from the GitHub repository, so edits to Sterling's own values are reset on the next rebuild. See https://github.com/mcasey10/sterling-design-system

All example data is fictional.

## Tags

accessibility, data grid, design system, design tokens, mcp, storybook

If Figma limits the number of tags, drop storybook.
