// The coded components, by their Figma name, with the design props each takes from its definition. A
// component is added here when it is built; `npm run check:parity` compares every entry with
// definitions/components.ts and fails if any defined component isn't coded.
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
  "Chip/Side": {
    source: "src/components/Chips.tsx",
    props: ["side", "label"],
    codeOnly: { label: "\"Buy\" or \"Sell\" by default. In Figma, a text layer to override (for example with B / S)." },
  },
  "Chip/Filter": {
    source: "src/components/Chips.tsx",
    props: ["label", "showRemove", "onRemove"],
    codeOnly: { onRemove: "Called when the chip is used to remove its filter; Figma has no behavior." },
  },
  "Summary/Summary metric": {
    source: "src/components/SummaryMetric.tsx",
    props: ["status", "label", "showProgress", "loading", "value", "detail", "progress"],
    stateProps: { loading: "loading" },
    codeOnly: {
      value: "In Figma, a text layer to override: it differs per variant, so it isn't a property.",
      detail: "In Figma, a text layer to override: it differs per variant, so it isn't a property.",
      progress: "Progress toward the target, 0 to 1. In Figma, resize the Bar layer.",
    },
  },
  "Input/Option with description": {
    source: "src/components/Menu.tsx",
    props: ["label", "description", "selected", "disabled"],
    stateProps: { selected: "selected" },
  },
  "Input/Menu heading": {
    source: "src/components/Menu.tsx",
    props: ["label"],
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
  "Grid/Row": {
    source: "src/components/DataGrid.tsx",
    props: ["selected", "children"],
    stateProps: { selected: "selected" },
    codeOnly: { children: "The row's BodyCells. In Figma a row is built from body cell instances." },
  },
  "Grid/Data grid": {
    source: "src/components/DataGrid.tsx",
    props: [
      "label", "columns", "rows", "tones", "rowKey", "selected", "onSelectedChange", "sort", "onSortChange", "unsortable", "fill",
      "loading", "loadingLabel", "empty", "emptyLabel",
    ],
    codeOnly: {
      label: "The grid's accessible name.",
      columns: "The application owns the data: the grid shows what it is given and reports what the person asks for. In Figma, columns are edited on the instance.",
      rows: "The application owns the data: the grid shows what it is given and reports what the person asks for. In Figma, rows are instances with overridden values.",
      tones: "The tone of each chip label. In Figma, set on each chip.",
      rowKey: "Which column identifies a row, for selection.",
      selected: "The selected rows. In Figma, each row's State.",
      onSelectedChange: "Reports selection, including select-all and Shift ranges; Figma has no behavior.",
      sort: "The sorted column. In Figma, each header cell's Sort.",
      onSortChange: "Reports a request to sort; Figma has no behavior.",
      unsortable: "Columns that can't be sorted. In Figma, each header cell's Show sort.",
      fill: "Stretches descriptive text columns to fill the container, as the plugin does when it fits a grid to a screen.",
      loading: "Shows skeleton rows and marks the grid busy. In Figma, place Grid/Skeleton row instances under the header.",
      loadingLabel: "What the first skeleton row and screen readers say while loading.",
      empty: "The EmptyState shown when there are no rows. In Figma, place Grid/Empty state under the header.",
      emptyLabel: "What screen readers hear when the empty state appears.",
    },
  },
  "Grid/Pagination": {
    source: "src/components/GridStates.tsx",
    props: ["range", "page", "onPrevious", "onNext", "previousDisabled", "nextDisabled"],
    codeOnly: {
      onPrevious: "Called for Previous; Figma has no behavior.",
      onNext: "Called for Next; Figma has no behavior.",
      previousDisabled: "On the first page. In Figma, set on the exposed Previous button instance (State).",
      nextDisabled: "On the last page. In Figma, set on the exposed Next button instance (State).",
    },
  },
  "Grid/Skeleton row": {
    source: "src/components/GridStates.tsx",
    props: ["label", "showLabel", "columns"],
    codeOnly: { columns: "The grid's columns, one bar each. In Figma the row is drawn for the generic grid's columns." },
  },
  "Grid/Empty state": {
    source: "src/components/GridStates.tsx",
    props: ["tone", "showAction", "title", "message", "actionLabel", "onAction"],
    codeOnly: {
      title: "In Figma, a text layer to override.",
      message: "In Figma, a text layer to override.",
      actionLabel: "In Figma, set on the exposed Action button instance.",
      onAction: "Called for the action; Figma has no behavior.",
    },
  },
  "Grid/BulkActionBar": {
    source: "src/components/BulkActionBar.tsx",
    props: ["count", "selectAll", "showSelectAll", "hint", "showHint", "onSelectAll", "hintId", "children"],
    figmaOnly: { "Show destructive": "In code the actions are children: leave the destructive button out instead of hiding it." },
    codeOnly: {
      onSelectAll: "Called for \"Select all N matching\"; Figma has no behavior.",
      hintId: "Lets a disabled action point to the hint that explains it (aria-describedby).",
      children: "The action Buttons. In Figma they are exposed button instances.",
    },
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
  MenuGroup:
    "A named group of options in a Menu: it ties a Menu heading to the options under it for screen readers. In Figma, " +
    "a heading and its options are placed one after another.",
  SelectField: "The select's label, field, and helper without behavior. Select is built on it; it also draws a select that isn't live.",
};
