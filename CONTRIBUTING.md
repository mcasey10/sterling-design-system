# Contributing to Sterling

Every change to Sterling goes through the same four stages: **propose, build, check, release**.
Sterling's Figma file and its coded components are both generated from this repo, so a change is
always a change to the tokens, the definitions, or the code, never an edit made by hand in Figma. [ARCHITECTURE.md](ARCHITECTURE.md) explains
why, and how the pieces fit together.

Sterling is a personal project, maintained by Michael Casey, and isn't accepting outside contributions.
This guide explains how changes are made, for anyone studying the system.

## 1. Propose

A change starts as a written plan, approved before anything is built. It says:

- **What's the problem?** Describe the screen or task that Sterling doesn't handle well today, with
  a screenshot if you have one.
- **What kind of change is it?** A token, a component, a guideline, a pattern, or the example.
- **Can an existing component do it?** A new property or variant on an existing component is
  usually better than a new component.
- **Does it break anything?** See [Versions](#versions). A breaking change needs a reason and a
  note on how files that use Sterling should adapt.

For a new or changed component, the proposal covers its variants and properties, every state it
needs, what happens with long text and large numbers, and how it meets the rules on the Guidelines
page (keyboard focus, contrast, never color alone).

The approach is settled in the plan before any code is written.

## 2. Build

Work on a branch, in this order: **tokens → components → guidelines and patterns → example**.

| To change… | Edit… |
|---|---|
| A color, spacing step, size, density value, or text style | `tokens/tokens.json` |
| A component's variants, properties, or their defaults | `definitions/components.ts` |
| How a component is drawn in Figma | `plugin/src/library/components/` |
| The React component, its CSS, and its stories | `ui/src/components/` |
| How a coded component maps to its definition | `ui/src/parity/coded.ts` |
| A component's description, usage text, or documentation link | `definitions/docRegistry.ts` |
| A guideline's or pattern's text | `definitions/guidelines.ts` |
| A guideline's or pattern's examples | `plugin/src/library/pages/` |
| The example | `plugin/src/example/loan-pooling/` |

**A component change has three parts, made together:**

1. **The definition** (`definitions/components.ts`): the variant, property, or default.
2. **The Figma spec** (`plugin/src/library/components/`): how the plugin draws it.
3. **The React component** (`ui/src/components/`): the prop, its styling, and its stories, with
   its entry in `ui/src/parity/coded.ts` updated.

The checks hold you to it: the library check fails if the Figma component doesn't match its
definition, and `check:parity` fails if the coded component doesn't, or doesn't exist. If Figma and
code must differ, record the difference and the reason in `coded.ts` and in
[ARCHITECTURE.md](ARCHITECTURE.md#11-where-figma-and-code-differ).

Rules that keep a rebuild safe:

- **Update in place; never recreate.** The plugin finds components, variants, and layers by name.
  Keep those names stable, and instances in every file stay linked with their overrides.
- **To rename** a component, variant, or property, use the rename support in
  `plugin/src/core/ensure.ts` (`previousNames`, `legacyVariantName`). It renames the existing node
  instead of making a new one.
- **Bind everything to variables.** No raw colors, and no raw sizes where a token exists. In code,
  that means `var(--stl-…)` and the `stl-text-…` classes only; `check:css` enforces it.
- **Never write a text decoration on a layer bound to a text property.** Figma copies it, with that
  variant's text style, to every variant sharing the property. Use a text style that has it
  (`Label-link`, `Body-link`).
- **Document as you build.** A new published component needs an entry in `docRegistry.ts`: a
  one-sentence description, its details, when to use it and when not to, and the related guidance.
  In Figma, select an instance, then click the component's description in the right-hand panel; a
  "Component documentation" popup opens with the description and the documentation link.
  A new published token needs a description in its group's `"$descriptions"` in `tokens.json`.
- **A new color pair needs a contrast rule.** Add the text and background combination to
  `contrast.rules` in `tokens.json`.
- **Sample data is fictional and neutral.** No real companies, people, or brands. Library pages use
  generic records; anything specific to one product belongs to an example.
- **The library never depends on an example.** Code in `core/` and `library/` doesn't import from
  `example/`.

## 3. Check

From the repo root, all of these must pass:

```bash
npm run contrast
```

```bash
npm run check:tokens
```

And in `plugin/`:

```bash
npm run typecheck
```

```bash
npm run build
```

For the coded components (run `npm install` in `ui/` once, then from the repo root):

```bash
npm run check:parity
```

```bash
npm run check:css
```

```bash
npm run check:a11y
```

```bash
npm run check:docs
```

```bash
npm run check:ai
```

```bash
npm run check:mcp
```

```bash
npm run check:examples
```

```bash
npm run check:demo-data
```

```bash
npm run check:urls
```

```bash
npm run package
```

```bash
npm run site
```

```bash
npm run check:site
```

```bash
npm run check:excerpts
```

```bash
npm run check:interactions
```

```bash
npm run check:demo-session
```

```bash
npm run check:diagrams
```

```bash
npm run check:docs-sync
```

`check:a11y` builds Storybook and runs every story in Chrome, in Light and Dark; `check:docs` reads
that build. `check:ai` fails when the export in `ai/` no longer matches the sources: after changing a
token, a definition, or guideline text, run `npm run export:ai` and commit the result with the change.
`check:mcp` (run `npm install` in `mcp/` once) rebuilds the MCP server from `ai/` and tests it, so run it
after `export:ai`. `check:examples` keeps example screens to the sterling-ui package's public API;
`check:demo-data` keeps the demo kit's data in step with the plugin's example; `check:urls` fails if a
Sterling address is written anywhere but `definitions/site.ts`, or if the view-only Figma file is linked
where the Figma Community page belongs; `package` builds the sterling-ui tarball; `site` builds the
website and `check:site` checks every page (axe in Light and Dark, phone width, and every link);
`check:demo-session` fails if the demo replay's record holds a local path, a user folder, or an address
that isn't Sterling's; `check:decks` reads every slide deck in `docs/decks/` (.pptx and .pdf, all text including
speaker notes, hidden slides and comments) and fails on a banned term (with `--banned <file>`, the list kept outside
the repository), a local path, or an author, editor, company or manager in its metadata; `check:interactions` runs every story with a play function (after `npm run build-storybook`) and fails if
one throws; `check:excerpts` fails if an excerpt on the AI page can no longer be read from its source, or if its code differs
from the commit it was delivered in; `check:diagrams` fails if a diagram's source changed without
`npm run diagrams`; `check:docs-sync` fails if a generated part of the documentation (the README's Start
here table, the MCP server's setup block, the Community text's version) is out of date: run `npm run docs:sync`.
Also run
`npm run typecheck` in `ui/`.

GitHub runs the same checks on every push and pull request.

Then look at the coded component in Storybook (`npm run storybook`):

1. Compare its "All variants" story with the Figma variant set.
2. Switch Theme and Density in the toolbar.
3. Use it with the keyboard alone: Tab to it, operate it, and check where focus goes afterwards.
4. Open the Accessibility panel. The automated run covers every story, but not what only appears
   after you interact (an open menu, a dialog opened by a click).

And build in Figma, in a duplicate of the Sterling file (never the published one):

1. Run **Sterling → Build library**, then **Sterling → Build example**.
2. Read both notifications. Each must end with its checks passing, and the link check must report
   **0 changed**. A change there means an instance lost its component, which usually means
   something was recreated instead of updated.
3. Look at what you changed in both color modes (Light and Dark) and all three densities (Compact,
   Default, Comfortable): switch the modes on the page's top frame.
4. Check the edges: a long label, a large number, a negative number, an empty value.
5. For a component, open its entry on the Guidelines page and confirm that the preview, the usage
   text, and the documentation link are right.

If a check fails, the notification says how many failed and the console
(**Plugins → Development → Show/Hide console**) names each one.

When a change should leave the Figma output alone (a refactor, or a change for the website or the code only)
but changes the built plugin (`plugin/dist/code.js`), prove it with a fingerprint of the duplicate: every
library page layer by layer, every variable, and every text style, each as a hash.

```bash
npm run figma:fingerprint -- <file key>
```

It prints a call for an AI tool connected to Figma's MCP server, which runs the read-only code in
`scripts/lib/figma-fingerprint.js` in that file. Save the result before Build library and again after it,
then compare them; every row must be the same:

```bash
npm run figma:fingerprint -- compare before.json after.json
```

## 4. Release

1. **Choose the version** using the rules below.
2. **Set it in five places:** `package.json`, `plugin/package.json`, `ui/package.json`,
   `mcp/package.json`, and `$meta.version` in `tokens/tokens.json`. `npm run check:tokens` fails if they disagree. The Cover
   and Read me pages and Storybook's title pick it up from `package.json` on the next build.
3. **Regenerate what carries the version:** `npm run export:ai` (the AI files and llms.txt), then
   `npm run check:mcp` (the MCP server's copy of them), then `npm run docs:sync` (the README, the MCP
   server's setup block, and the Community text), and commit the result.
4. **Update [CHANGELOG.md](CHANGELOG.md):** what was added, changed, fixed, or removed, written for
   someone who uses Sterling. For a breaking change, say what to do about it. Until the release date is
   chosen, the heading carries `RELEASE-DATE` (`## [1.2.0] - RELEASE-DATE`), which the AI files, llms.txt, and
   the MCP server copy from it.
5. **Set the release date, last before pushing:** write it into the heading, run `npm run export:ai`,
   `npm run docs:sync`, and `npm run check:mcp`, re-run the checks, and commit. `npm run check:release-date`
   fails while `RELEASE-DATE` is anywhere; it must pass before a push.
6. **Merge to `main`.** The checks run again, and the website (Start here, the token reference,
   Storybook, the AI files, and llms.txt) is republished. Open it and follow its links.
7. **Rebuild the Sterling Figma file** with both commands, confirm the checks pass, then publish
   the library from Figma's Assets panel with the changelog entry as the description. Fingerprint the
   file before and after the rebuild (`npm run figma:fingerprint`, see [Check](#3-check)): only the
   pages this release changes may differ, such as the Cover and Read me, which show the version.
8. **Tag the release** `v<version>` on GitHub, and attach its two downloads: the package
   (`npm run package` writes `ui/package/sterling-ui-<version>.tgz`) and the MCP server
   (`npm run check:mcp` builds it; attach it as `sterling-mcp.js`).
9. **Update the Figma Community page** with the text in `docs/figma-community.md`, and check
   the live site (`docs/reference.md`, "After a release: check the live site").

### Versions

Sterling follows semantic versioning. What matters is what happens to a file that already uses
Sterling when it accepts the update.

| Version | When | Examples |
|---|---|---|
| **Major** (2.0.0) | Existing instances lose something or change meaning | Removing a component, variant, or property; renaming a layer that instances override (the override is reset); removing or renaming a token; changing what a property value means |
| **Minor** (1.1.0) | Something new, and nothing existing changes | A new component, variant, property, token, guideline, or pattern; a component gaining its coded counterpart |
| **Patch** (1.0.1) | A fix that keeps the same components and names | A visual fix, a contrast fix, a corrected description, a documentation change |

Renames done with the plugin's rename support keep instances linked, but they still change the
name people and code see, so they count as **major**.

## Writing for Sterling

Guidelines, descriptions, and notes are part of the product.

- Write for the person who has to use the component, in plain words.
- A component's description is one sentence saying what it is. "Use when" and "Don't use when"
  say when to choose it and what to choose instead.
- Name the thing the way Figma shows it: the property (`Show sort`), the value (`State = focus`).
- Setup instructions (`definitions/setup.ts`, shown on the website and in `mcp/README.md`) follow one standard,
  in this order: Where, You need, Do, Scope (only where it matters), It worked if, If it didn't. **Do** holds
  every action, as numbered steps in the order they're taken; a condition for skipping a step comes first, in the
  step's opening words ("Check the install (optional; skip it if …)"). **It worked if** only describes what the
  reader should see; it never introduces a step. **Next** follows It worked if. **You need** only states a
  requirement, how to check it, and at most a one-line pointer to what provides it ("or create one in step 1");
  any instructions are steps. Only **If it didn't** may say how to fix a cause. Say which terminal and folder,
  say to open a file in an editor before changing it, and mention every question a tool asks on the way.
