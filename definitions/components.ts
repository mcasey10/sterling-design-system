// Component definitions: every published component's variant properties and component properties, as plain
// data. One source for two builds:
//   • the Figma plugin creates each component's variants and properties from it, and its library checks
//     fail if a built component doesn't match;
//   • the coded layer types its props from it (VariantValue), generates its "All variants" stories from it,
//     and its parity check fails if a coded component's props don't match.
// Names and values are written exactly as Figma shows them (sentence case: "Show icon"). In code a property
// name becomes camelCase (showIcon); values keep the same strings.
// Icons (Icon/<name>) have no properties and aren't listed; their glyphs are in icons.ts.

export type PropertyType = "TEXT" | "BOOLEAN" | "INSTANCE_SWAP" | "SLOT";

export interface PropertyDef {
  name: string;
  type: PropertyType;
  /**
   * TEXT: the default text. BOOLEAN: the default value. INSTANCE_SWAP: the default icon's name (a key of
   * ICONS). SLOT: none.
   */
  default?: string | boolean;
}

export interface ComponentDef {
  /** Variant properties in declaration order, each with its values in display order. */
  variants: Record<string, readonly string[]>;
  /** Component properties (text, boolean, instance swap, slot), in the order they're created. */
  properties: readonly PropertyDef[];
}

const text = (name: string, value: string): PropertyDef => ({ name, type: "TEXT", default: value });
const bool = (name: string, value: boolean): PropertyDef => ({ name, type: "BOOLEAN", default: value });
const icon = (name: string, value: string): PropertyDef => ({ name, type: "INSTANCE_SWAP", default: value });
const slot = (name: string): PropertyDef => ({ name, type: "SLOT" });

const BUTTON_STATES = ["default", "hover", "pressed", "focus", "disabled"] as const;
const FIELD_STATES = ["default", "hover", "focus", "error", "error-focus", "warning", "disabled"] as const;
const OPTION_STATES = ["default", "hover", "selected", "disabled"] as const;
/** Input/Text and Input/Select share their properties; only the default value and placeholder differ. */
const fieldProperties = (value: string, placeholder: string): PropertyDef[] => [
  text("Label", "Label"),
  text("Value", value),
  text("Placeholder", placeholder),
  text("Helper", "Helper text"),
  bool("Show label", true),
  bool("Show helper", true),
];

const DEFINITIONS = {
  "Controls/Button": {
    variants: { Kind: ["primary", "secondary", "ghost", "danger"], Size: ["sm", "md"], State: BUTTON_STATES },
    properties: [text("Label", "Button"), bool("Show icon", false), icon("Icon", "plus")],
  },
  "Controls/Icon button": {
    variants: { Kind: ["secondary", "ghost", "danger"], Size: ["sm", "md"], State: BUTTON_STATES },
    properties: [text("Label", "Action"), icon("Icon", "more")],
  },
  "Controls/Link": {
    variants: { Size: ["sm", "md"], State: ["default", "hover", "focus"] },
    properties: [text("Label", "Link")],
  },
  "Controls/Checkbox": {
    variants: { Checked: ["off", "on", "indeterminate"], State: ["default", "hover", "focus", "disabled"] },
    properties: [text("Label", "Label"), bool("Show label", false)],
  },
  "Chip/Status": {
    variants: { Tone: ["positive", "warning", "critical", "info", "neutral"] },
    properties: [text("Label", "Status"), bool("Show icon", true)],
  },
  "Chip/Side": {
    variants: { Side: ["buy", "sell"] },
    properties: [],
  },
  "Chip/Filter": {
    variants: { State: ["default", "hover", "pressed", "focus"] },
    properties: [text("Label", "Filter: Value"), bool("Show remove", true)],
  },
  "Grid/HeaderCell": {
    variants: { Sort: ["none", "asc", "desc"], Align: ["left", "right"], State: ["default", "hover", "focus"] },
    properties: [text("Label", "Column"), bool("Show sort", true)],
  },
  "Grid/BodyCell": {
    variants: {
      Type: ["text", "numeric", "gain", "loss", "chip", "checkbox"],
      State: ["default", "hover", "selected", "selected-hover", "focus", "warning", "warning-focus", "error", "error-focus"],
    },
    properties: [text("Value", "Value")],
  },
  "Grid/Row": {
    variants: { State: ["default", "hover", "selected", "selected-hover"] },
    properties: [],
  },
  "Grid/Data grid": { variants: {}, properties: [] },
  "Grid/Pagination": {
    variants: {},
    properties: [text("Range", "Showing 1–5 of 120"), text("Page", "Page 1 of 24")],
  },
  "Grid/Skeleton row": {
    variants: {},
    properties: [text("Label", "Loading rows…"), bool("Show label", false)],
  },
  "Grid/Empty state": {
    variants: { Tone: ["neutral", "critical"] },
    properties: [bool("Show action", true)],
  },
  "Grid/BulkActionBar": {
    variants: {},
    properties: [
      text("Count", "2 selected"),
      text("Select all", "Select all 120 matching"),
      bool("Show select all", true),
      text("Hint", "No eligible items selected"),
      bool("Show hint", false),
      bool("Show destructive", true),
    ],
  },
  "Summary/Summary metric": {
    variants: { Status: ["normal", "over-target"], State: ["default", "loading"] },
    properties: [text("Label", "Metric"), bool("Show progress", true)],
  },
  "Input/Text": {
    variants: { State: FIELD_STATES, Content: ["value", "placeholder"] },
    properties: fieldProperties("Value", "Enter a value"),
  },
  "Input/Select": {
    // A select has every field state, plus open (its menu showing).
    variants: {
      State: ["default", "hover", "focus", "open", "error", "error-focus", "warning", "disabled"],
      Content: ["value", "placeholder"],
    },
    properties: fieldProperties("Option", "Select an option"),
  },
  "Input/Option": {
    variants: { State: OPTION_STATES },
    properties: [text("Label", "Option")],
  },
  "Input/Menu": { variants: {}, properties: [] },
  "Input/Option with description": {
    variants: { State: OPTION_STATES },
    properties: [text("Label", "Option"), text("Description", "Description")],
  },
  "Input/Menu heading": {
    variants: {},
    properties: [text("Label", "Group")],
  },
  "Tabs/Tab": {
    variants: { State: ["default", "hover", "focus", "disabled", "selected", "selected-focus"] },
    properties: [text("Label", "Tab"), text("Count", "0"), bool("Show count", true)],
  },
  "Overlay/Dialog": {
    variants: {},
    properties: [text("Title", "Dialog title"), bool("Show close", true), slot("Body")],
  },
} as const satisfies Record<string, ComponentDef>;

/** Every definition, by component name. */
export const COMPONENTS: Record<string, ComponentDef> = DEFINITIONS;

/** The name of a defined component, e.g. "Controls/Button". */
export type ComponentName = keyof typeof DEFINITIONS;
/** The values of one variant property, as a union: VariantValue<"Controls/Button", "Kind"> is "primary" | "secondary" | … */
export type VariantValue<
  C extends ComponentName,
  P extends keyof (typeof DEFINITIONS)[C]["variants"],
> = (typeof DEFINITIONS)[C]["variants"][P] extends readonly (infer V)[] ? V : never;

/** A component's definition; throws for a name that has none, so a typo fails loudly. */
export function componentDef(name: string): ComponentDef {
  const def = COMPONENTS[name];
  if (!def) throw new Error(`No component definition for "${name}" in definitions/components.ts`);
  return def;
}

/** One property of a component; throws if the component doesn't define it. */
export function propertyDef(component: string, property: string): PropertyDef {
  const def = componentDef(component).properties.find((p) => p.name === property);
  if (!def) throw new Error(`"${component}" has no property "${property}" in definitions/components.ts`);
  return def;
}

/** A text property's default text. */
export const defaultText = (component: string, property: string) => String(propertyDef(component, property).default ?? "");

/** How many variants a component has: the product of its variant properties' value counts (1 if it has none). */
export const variantCount = (def: ComponentDef) => Object.values(def.variants).reduce((n, values) => n * values.length, 1);
