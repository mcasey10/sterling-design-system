// The coded components, by their Figma name, with the design props each takes from its definition. A
// component is added here when it is built; `npm run check:parity` compares every entry with
// definitions/components.ts and lists the components that aren't coded yet.
// Icons (Icon/<name>) have no properties, so they have no definition and no entry: <Icon name> takes any
// name in definitions/icons.ts.

import type { CodedComponent } from "./parity";

export const CODED: Record<string, CodedComponent> = {
  "Controls/Button": {
    source: "src/components/Button.tsx",
    props: ["kind", "size", "label", "showIcon", "icon", "disabled"],
  },
  "Controls/Icon button": {
    source: "src/components/IconButton.tsx",
    props: ["kind", "size", "label", "icon", "disabled"],
  },
  "Controls/Link": {
    source: "src/components/Link.tsx",
    props: ["size", "label"],
  },
};
