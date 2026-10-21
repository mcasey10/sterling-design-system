# sterling-ui

Sterling's React components, with type declarations for every component and prop, and the token CSS.
Sterling is a design system for data-dense applications.

This package isn't published to a registry: it is attached to each GitHub Release, and installed from there.
Every step, with how to check each one: https://mcasey10.github.io/sterling-design-system/install/

It needs React 19 or newer (`react` and `react-dom`).

## Use

Import the styles once, at the top of the application, then the components:

```tsx
import "sterling-ui/styles.css";
import "sterling-ui/fonts.css";
import { Button, DataGrid, type Column, type GridRow } from "sterling-ui";
```

- `styles.css` holds the design tokens as CSS custom properties (`--stl-…`), the text style classes
  (`.stl-text-…`), and every component's CSS.
- `fonts.css` loads Inter. Leave it out if the application already loads Inter 3.19.

## Color mode and density

- **Color mode** follows the operating system. To set it, put `data-theme="light"` or `data-theme="dark"` on
  the root element.
- **Density** is Default unless a parent has the class `stl-density-compact` or `stl-density-comfortable`.

## What's in it

Every component has a props type with the same name plus `Props` (`ButtonProps`). The types are in
`dist/types/`. For what each component is for, when to use it, and the rules that apply, ask the Sterling
MCP server or read the AI files it is built from: https://mcasey10.github.io/sterling-design-system/ai-tools/
