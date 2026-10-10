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
  "Controls/Checkbox": {
    source: "src/components/Checkbox.tsx",
    props: ["checked", "label", "showLabel", "disabled", "onCheckedChange"],
    codeOnly: { onCheckedChange: "Reports the value the user chose as \"on\" or \"off\"; Figma has no behavior." },
  },
  "Chip/Status": {
    source: "src/components/StatusChip.tsx",
    props: ["tone", "label", "showIcon"],
  },
  "Tabs/Tab": {
    source: "src/components/Tab.tsx",
    props: ["label", "count", "showCount", "selected", "disabled"],
    stateProps: { selected: "selected" },
  },
  "Input/Text": {
    source: "src/components/TextInput.tsx",
    props: ["label", "value", "placeholder", "helper", "showLabel", "showHelper", "validation", "disabled"],
    stateProps: { error: "validation", warning: "validation" },
    figmaOnly: { Content: "In code the field shows its placeholder whenever the value is empty, so there is nothing to choose." },
  },
};

/** Coded components with no Figma component, each with the reason. */
export const CODE_ONLY_COMPONENTS: Record<string, string> = {
  TabList:
    "The row that holds Tabs: it gives them the tablist role, an accessible name, and arrow-key navigation. In Figma, " +
    "tabs are placed side by side in a frame.",
};
