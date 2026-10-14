// Everything the sterling-ui package exports: every component, its props type, and the types and helpers an
// application needs to use them. `npm run package` (ui/scripts/build-package.mjs) builds the package from
// this file; `npm run check:ai` fails if a component named in the export isn't exported here.
// Styles are separate files: import "sterling-ui/styles.css" once (tokens, text styles, and every
// component's CSS) and, to load Inter, "sterling-ui/fonts.css".

export { BodyCell, type BodyCellProps, type BodyCellType } from "./components/BodyCell";
export { BulkActionBar, type BulkActionBarProps } from "./components/BulkActionBar";
export { Button, type ButtonKind, type ButtonProps, type ButtonSize } from "./components/Button";
export { Checkbox, type CheckboxChecked, type CheckboxProps } from "./components/Checkbox";
export { FilterChip, SideChip, type FilterChipProps, type SideChipProps, type SideChipSide } from "./components/Chips";
export { DataGrid, Row, type DataGridProps, type GridSort, type RowProps } from "./components/DataGrid";
export { Dialog, type DialogProps } from "./components/Dialog";
export {
  EmptyState, Pagination, SkeletonRow,
  type EmptyStateProps, type EmptyStateTone, type PaginationProps, type SkeletonRowProps,
} from "./components/GridStates";
export { HeaderCell, type HeaderCellAlign, type HeaderCellProps, type HeaderCellSort } from "./components/HeaderCell";
export { ICON_NAMES, Icon, type IconName, type IconProps } from "./components/Icon";
export { IconButton, type IconButtonKind, type IconButtonProps, type IconButtonSize } from "./components/IconButton";
export { Link, type LinkProps, type LinkSize } from "./components/Link";
export {
  Menu, MenuGroup, MenuHeading, Option, OptionWithDescription,
  type MenuGroupProps, type MenuHeadingProps, type MenuProps, type OptionProps, type OptionWithDescriptionProps,
} from "./components/Menu";
export { Select, SelectField, type SelectFieldProps, type SelectOption, type SelectProps } from "./components/Select";
export { StatusChip, type StatusChipProps, type StatusChipTone } from "./components/StatusChip";
export { SummaryMetric, type SummaryMetricProps, type SummaryMetricStatus } from "./components/SummaryMetric";
export { Tab, TabList, type TabListProps, type TabProps } from "./components/Tab";
export { TextInput, type TextInputProps, type Validation } from "./components/TextInput";

// The data a grid takes, and the rule for sizing a numeric column to its longest value.
export { numericColumnWidth, type CellType, type Column, type Dataset, type GridRow } from "../../definitions/grid";

// Class names for things that aren't components: a text style ("Body" → "stl-text-body") and a density
// ("Compact" → "stl-density-compact"). The color mode is the data-theme attribute ("light" or "dark").
export { densityClass, textClass } from "./tokens";
