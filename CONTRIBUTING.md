# Contributing to Sterling

Every change to Sterling goes through the same four stages: **propose, build, check, release**.
Sterling's Figma file is generated from this repo, so a change is always a change to the tokens or
the plugin code, never an edit made by hand in Figma. [ARCHITECTURE.md](ARCHITECTURE.md) explains
why, and how the pieces fit together.

Sterling is maintained by Michael Casey. Suggestions and bug reports are welcome as GitHub issues.

## 1. Propose

Open an issue before building anything. Say:

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

Agree on the approach in the issue before writing code.

## 2. Build

Work on a branch, in this order: **tokens → components → guidelines and patterns → example**.

| To change… | Edit… |
|---|---|
| A color, spacing step, size, density value, or text style | `tokens/tokens.json` |
| A component | `plugin/src/library/components/` |
| A component's description, usage text, or documentation link | `plugin/src/library/docRegistry.ts` |
| A guideline or pattern | `plugin/src/library/pages/` |
| The example | `plugin/src/example/loan-pooling/` |

Rules that keep a rebuild safe:

- **Update in place; never recreate.** The plugin finds components, variants, and layers by name.
  Keep those names stable, and instances in every file stay linked with their overrides.
- **To rename** a component, variant, or property, use the rename support in
  `plugin/src/core/ensure.ts` (`previousNames`, `legacyVariantName`). It renames the existing node
  instead of making a new one.
- **Bind everything to variables.** No raw colors, and no raw sizes where a token exists.
- **Document as you build.** A new published component needs an entry in `docRegistry.ts`: a
  one-sentence description, its details, when to use it and when not to, and the related guidance.
  Figma shows the description in the Assets Details panel (click a component in Assets) and in the
  Component documentation panel, with the link to the component's entry on the Guidelines page.
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

GitHub runs the same checks on every push and pull request.

Then build in Figma, in a duplicate of the Sterling file (never the published one):

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

## 4. Release

1. **Choose the version** using the rules below.
2. **Set it in three places:** `package.json`, `plugin/package.json`, and `$meta.version` in
   `tokens/tokens.json`. `npm run check:tokens` fails if they disagree. The Cover and Read me pages
   pick it up from `package.json` on the next build.
3. **Update [CHANGELOG.md](CHANGELOG.md):** what was added, changed, fixed, or removed, written for
   someone who uses Sterling. For a breaking change, say what to do about it.
4. **Merge to `main`.** The checks run again, and the token site is republished.
5. **Rebuild the Sterling Figma file** with both commands, confirm the checks pass, then publish
   the library from Figma's Assets panel with the changelog entry as the description.
6. **Tag the release** `v<version>` on GitHub.

### Versions

Sterling follows semantic versioning. What matters is what happens to a file that already uses
Sterling when it accepts the update.

| Version | When | Examples |
|---|---|---|
| **Major** (2.0.0) | Existing instances lose something or change meaning | Removing a component, variant, or property; renaming a layer that instances override (the override is reset); removing or renaming a token; changing what a property value means |
| **Minor** (1.1.0) | Something new, and nothing existing changes | A new component, variant, property, token, guideline, or pattern |
| **Patch** (1.0.1) | A fix that keeps the same components and names | A visual fix, a contrast fix, a corrected description, a documentation change |

Renames done with the plugin's rename support keep instances linked, but they still change the
name people and code see, so they count as **major**.

## Writing for Sterling

Guidelines, descriptions, and notes are part of the product.

- Write for the person who has to use the component, in plain words.
- A component's description is one sentence saying what it is. "Use when" and "Don't use when"
  say when to choose it and what to choose instead.
- Name the thing the way Figma shows it: the property (`Show sort`), the value (`State = focus`).
