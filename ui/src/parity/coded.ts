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
  "Input/Select": {
    source: "src/components/Select.tsx",
    props: [
      "label", "value", "placeholder", "helper", "showLabel", "showHelper", "validation", "disabled", "open",
      "options", "onValueChange", "onOpenChange", "name",
    ],
    stateProps: { open: "open", error: "validation", warning: "validation" },
    figmaOnly: { Content: "In code the field shows its placeholder whenever nothing is selected, so there is nothing to choose." },
    codeOnly: {
      options: "The choices. In Figma they are the Option instances inside Input/Menu.",
      onValueChange: "Reports the option the user chose; Figma has no behavior.",
      onOpenChange: "Reports the menu opening and closing; Figma has no behavior.",
      name: "The field's name when it is submitted with a form.",
    },
  },
  "Input/Menu": {
    source: "src/components/Menu.tsx",
    props: [],
  },
  "Input/Option": {
    source: "src/components/Menu.tsx",
    props: ["label", "selected", "disabled"],
    stateProps: { selected: "selected" },
  },
  "Grid/HeaderCell": {
    source: "src/components/HeaderCell.tsx",
    props: ["sort", "align", "label", "showSort", "onSort"],
    codeOnly: { onSort: "Called when the person asks to sort by the column; Figma has no behavior." },
  },
  "Grid/BodyCell": {
    source: "src/components/BodyCell.tsx",
    props: ["type", "value", "selected", "validation", "children"],
    stateProps: { selected: "selected", warning: "validation", error: "validation" },
    codeOnly: { children: "The StatusChip or Checkbox of a chip or checkbox cell. In Figma it is an exposed nested instance." },
  },
  "Overlay/Dialog": {
    source: "src/components/Dialog.tsx",
    props: [
      "title", "showClose", "children", "open", "onClose", "cancelLabel", "primaryLabel", "primaryKind", "primaryDisabled",
      "onPrimary",
    ],
    codeOnly: {
      open: "Whether the dialog is showing. In Figma a dialog is placed on the canvas or not.",
      onClose: "Called for Cancel, the close button, and Escape; Figma has no behavior.",
      cancelLabel: "In Figma, set on the exposed Cancel button instance.",
      primaryLabel: "In Figma, set on the exposed Primary button instance.",
      primaryKind: "In Figma, set on the exposed Primary button instance (Kind).",
      primaryDisabled: "In Figma, set on the exposed Primary button instance (State).",
      onPrimary: "Called for the primary action; Figma has no behavior.",
    },
  },
};

/** Coded components with no Figma component, each with the reason. */
export const CODE_ONLY_COMPONENTS: Record<string, string> = {
  TabList:
    "The row that holds Tabs: it gives them the tablist role, an accessible name, and arrow-key navigation. In Figma, " +
    "tabs are placed side by side in a frame.",
};
