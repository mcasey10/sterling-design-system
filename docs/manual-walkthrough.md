# Building Sterling by hand: a designer's walkthrough

The plugin generates everything in Sterling automatically. This guide shows how a
designer would create the same things manually in Figma, and where to compare each
step with what the plugin built. Figma's menu labels shift a little between versions,
so look for the nearest icon or wording.

**About `tokens.json`:** designers don't usually write a token file by hand. They create
variables directly in Figma, and a JSON token file is exported from Figma or kept in a
plugin such as Tokens Studio. Sterling runs the other way (JSON → plugin → Figma), which
keeps tokens in version control and lets a script check contrast, but the result in
Figma is the same.

## 1. Primitive variables (the raw palette)

1. Open the **Variables** panel (left rail, or the right panel with nothing selected →
   **Local variables**).
2. Create a **collection** named `Primitives`.
3. **Create variable → Color**, name it `neutral/50`, value `#F7F8FA`. The slash makes
   `neutral` a group.
4. Repeat for every step of every ramp.
5. In each variable's settings, **turn off all scopes** and tick **Hide from publishing**,
   so designers pick semantic colors instead of raw ones.

**Compare:** Variables → Primitives (62 colors in groups); Foundations page → Primitives.

## 2. Semantic color variables with Light and Dark modes

1. Create a collection named `Color`. Rename "Mode 1" to **Light** and click **+** to add
   a **Dark** mode column.
2. Create `surface/background`. In the Light cell, click the swatch and choose the
   **`neutral/50`** variable instead of typing a hex code. That makes it an **alias**.
   In the Dark cell, choose `neutral/900`.
3. Repeat for the text, border, status and finance roles. Set **scopes** so each one shows
   up only where it belongs (text colors for text fills, borders for strokes).

**Compare:** Variables → Color (every cell shows a primitive's name, not a hex); Foundations
page → Color (Light and Dark side by side).

## 3. Spacing and Density (number variables)

1. Create a `Spacing` collection with **Number** variables such as `space/16` = 16 and
   `radius/sm` = 4. Set scopes to **Gap** and **Corner radius**.
2. Create a `Density` collection with three modes (**Compact, Default, Comfortable**) and
   variables such as `row/height` = 24 / 32 / 40 and `control/height`.

**Compare:** Variables → Spacing and Density; Foundations page → Spacing and radius, Density.

## 4. Applying variables to a layer

1. Draw a frame and press **Shift+A** for **auto layout**.
2. **Fill:** in the Fill row, click the **Apply variable** icon (four dots) and choose
   `surface/panel`.
3. **Padding, gap and radius:** hover each field, click its variable icon, and pick
   `control/padding-x`, `control/gap` and `radius/sm`.
4. **Height:** set it to **Fixed**, then apply `control/height` to the height field.

**Compare:** select any button on the Components page; its fill, padding, gap, radius and
height show variable names instead of numbers.

## 5. A component with variants (the Button)

1. Add a text layer ("Button") and an icon inside the auto-layout frame; apply
   `text/inverse` to the text color.
2. Make it a component with **Ctrl+Alt+K** (Cmd+Option+K on Mac).
3. In the right panel, choose **Add variant**. Figma wraps it in a **component set** with
   a property called "Property 1". Rename it **Variant** and name this one `primary`.
4. Add variants for `secondary`, `ghost` and `danger`, changing only which variables are
   applied (for example, `danger` uses `status/critical` for its fill).
5. Add two more properties: **Size** (sm / md) and **State** (default / hover / disabled),
   and fill in every combination (hover uses `accent/hover`; disabled uses
   `surface/disabled` with `text/disabled`). That's 4 × 2 × 3 = 24 variants.

**Compare:** Components page → Button (the 24 variants in a grid inside the dashed
component-set box). Select the set to see the Variant, Size and State properties.

## 6. Component properties (per-instance edits that aren't variants)

Select the component set and, under **Properties**, click **+**:

- **Text → "Label"** (default "Button"). Select the text layer and link its content to
  the property.
- **Boolean → "Show icon"**. Select the icon layer and link its **visibility** to it.
- **Instance swap → "Icon"**. Link the icon layer so any icon can be swapped in.

**Compare:** select the "Save draft" button on the example page. You'll see the
Variant / Size / State dropdowns (variants) plus the Label field and Show icon toggle
(properties).

## 7. Using it: instances and variable modes

1. Drag the Button from **Assets** (Controls → Button, with **Show subfolders** on in the
   Assets settings menu) into a frame. Pick the variant from the dropdowns and type a
   label.
2. Select the **parent frame**. In the right panel's **Appearance** section, use
   **Apply variable mode** to set **Color: Dark** or **Density: Compact**. Everything
   inside updates at once.

**Compare:** select `Template/Desktop 1440` and switch its Color and Density modes.

## Applying variables vs. applying variable modes

**In one sentence:** a variable collection can have several modes, each giving the
collection's variables their own set of values; setting a mode on a frame changes what
every property linked to that collection's variables, inside that frame, resolves to — a
quick way to switch a whole area at once (e.g., Light vs. Dark theme, or Compact vs.
Comfortable density).

These are two separate actions that work together:

| | Applying a **variable** | Applying a **variable mode** |
|---|---|---|
| Question it answers | *Which token* does this property use? | *Which version* of the tokens should this area use? |
| Where you do it | On one property of one layer (a fill, padding, height…) | On a container frame (or instance), in **Appearance → Apply variable mode** |
| Scope | That one property | The frame and everything inside it, for one collection |
| Example | Button fill → `accent/default` | Frame → Color: **Dark** |
| What changes | The link between the property and a variable | Which mode column every linked variable reads from |

How they combine: the Button's fill is linked to `accent/default`. That variable has two
values, `blue/600` in Light and `blue/400` in Dark. The mode set on the surrounding frame
decides which one shows. Switching the frame to Dark doesn't touch the Button's link; it
changes the answer the link resolves to.

Things to know:

- **Modes cascade.** A frame without its own mode inherits from its parent. If nothing
  sets one, the collection's first mode (Light, Compact) is used.
- **Modes only affect linked properties.** A fill typed as a hex code ignores modes. That's
  why every fill, padding and height in Sterling is linked to a variable.
- **Modes are per collection.** Setting Color: Dark leaves Density alone, and vice versa.
  In the Layers panel, a badge such as **Default + 1** means a frame sets its own modes
  (here, Density: Default plus one more: Color: Light).
- **Nested overrides work.** On the Foundations page, the Color → Dark panel sets Dark
  inside a frame that's otherwise Light, which is how Light and Dark appear side by side.

## Where each step lives in the plugin code

| Manual step | Code |
|---|---|
| 1–3: collections, modes, aliases, scopes | [`tokens/tokens.json`](../tokens/tokens.json) (values) and [`plugin/src/variables.ts`](../plugin/src/variables.ts) (creates them) |
| 4: applying variables to layers | `configureFrame`, `bindFill` and `setNum` in [`plugin/src/helpers.ts`](../plugin/src/helpers.ts) |
| 5–6: variants and properties | [`plugin/src/components/button.ts`](../plugin/src/components/button.ts): `combos(...)` creates the variants, `LOOKS` picks variables per variant and state, `wire` adds the properties |
| 7: applying variable modes to frames | `pinMode` in [`plugin/src/helpers.ts`](../plugin/src/helpers.ts) |

## Practice

Steps 4–6 on a small component, such as the Status chip or a Tab, take about 15 minutes
by hand. Build yours next to the generated one to compare; a plugin rerun won't touch it,
because the plugin only edits what it created.
