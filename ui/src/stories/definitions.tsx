// What every component's stories take from the shared definitions: the Docs text (definitions/docRegistry.ts),
// the controls and their defaults, and the "All variants" grid (definitions/components.ts). A story file adds
// only what is particular to its component.

import type { ReactNode } from "react";
import { type ComponentName, componentDef } from "../../../definitions/components";
import { docFor } from "../../../definitions/docRegistry";
import { ICON_NAMES } from "../components/Icon";
import { CSS_STATES, DISABLED, REST, propName, stateParts } from "../parity/parity";
import { textClass } from "../tokens";
import "./stories.css";

const sentence = (text: string) => text[0].toUpperCase() + text.slice(1);
/** ["a", "b", "c"] → "a, b, and c" */
const list = (items: string[]) => (items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`);

/** The component's Docs description, from the documentation registry, with how its states work in code. */
export function docs(name: ComponentName): string {
  const doc = docFor(name);
  if (!doc) return "";
  const states = componentDef(name).variants.State ?? [];
  const parts = new Set(states.flatMap(stateParts));
  const css = Object.keys(CSS_STATES).filter((part) => parts.has(part));
  const inCode = [
    css.length ? `${sentence(list(css))} come from CSS (${css.map((part) => `\`${CSS_STATES[part]}\``).join(", ")}), not from a prop.` : "",
    parts.has(DISABLED) ? "Disabled is the `disabled` prop." : "",
  ].filter(Boolean);
  return [
    doc.description,
    doc.details,
    `**Use when** ${doc.use}`,
    `**Don't use when** ${doc.dont}`,
    inCode.length ? `**In code** ${inCode.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Controls for the props that come from the definition. */
export function argTypes(name: ComponentName): Record<string, object> {
  const def = componentDef(name);
  const types: Record<string, object> = {};
  for (const [axis, values] of Object.entries(def.variants)) {
    if (axis === "State") {
      if (values.some((value) => stateParts(value).includes(DISABLED))) {
        types[DISABLED] = { control: "boolean", description: "The disabled state.", table: { type: { summary: "boolean" } } };
      }
    } else {
      // The prop's type is a union taken from the definition, which the docs table can't read; spell it out.
      const summary = values.map((value) => `"${value}"`).join(" | ");
      types[propName(axis)] = { control: "select", options: [...values], table: { type: { summary } } };
    }
  }
  for (const property of def.properties) {
    if (property.type === "TEXT") types[propName(property.name)] = { control: "text" };
    if (property.type === "BOOLEAN") types[propName(property.name)] = { control: "boolean" };
    if (property.type === "INSTANCE_SWAP") {
      types[propName(property.name)] = { control: "select", options: ICON_NAMES, table: { type: { summary: "IconName" } } };
    }
  }
  return types;
}

/** The default of every prop that comes from the definition: the first variant value, and each property's default. */
export function defaultArgs(name: ComponentName): Record<string, unknown> {
  const def = componentDef(name);
  const args: Record<string, unknown> = {};
  for (const [axis, values] of Object.entries(def.variants)) {
    if (axis !== "State") args[propName(axis)] = values[0];
  }
  for (const property of def.properties) {
    if (property.default !== undefined) args[propName(property.name)] = property.default;
  }
  return args;
}

/**
 * Forces hover, pressed, and focus on the "All variants" cells that show those states (pseudo-states addon).
 * Each cell's component carries data-state with the State parts it should show.
 */
export const FORCED_STATES = {
  hover: '[data-state~="hover"]',
  active: '[data-state~="pressed"]',
  focusVisible: '[data-state~="focus"]',
};

/** What a State value becomes in code: `disabled`, plus the parts the story must force or map itself. */
export interface StateProps {
  disabled?: boolean;
  "data-state"?: string;
}

/** `own` maps the State parts a component expresses with its own props, e.g. { selected: { selected: true } }. */
export function stateProps(value: string, own: Record<string, object> = {}): StateProps {
  const parts = stateParts(value).filter((part) => part !== REST);
  const forced = parts.filter((part) => part in CSS_STATES);
  return {
    ...Object.assign({}, ...parts.map((part) => own[part] ?? {})),
    ...(parts.includes(DISABLED) ? { disabled: true } : {}),
    ...(forced.length ? { "data-state": forced.join(" ") } : {}),
  };
}

/** Every combination of the given variant properties, the first one varying slowest (the order Figma lists them). */
function combinations(axes: [string, readonly string[]][]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>(
    (rows, [axis, values]) => rows.flatMap((row) => values.map((value) => ({ ...row, [propName(axis)]: value }))),
    [{}]
  );
}

/**
 * Every variant in the definition, laid out like the Figma variant set: one column per State, one row per
 * combination of the other variant properties. `render` gets the variant props (camelCase) and the state props.
 * A component with no State property gets one row, with a column per value of its variant property.
 */
export function AllVariants<P>({
  component, render, states: own = {},
}: {
  component: ComponentName;
  render: (props: P) => ReactNode;
  /** Props for the State parts the component expresses with its own props (see `stateProps` in src/parity/coded.ts). */
  states?: Record<string, object>;
}) {
  const variants = Object.entries(componentDef(component).variants);
  // Columns are the State values; a component with no State uses its first variant property instead.
  const columnAxis = variants.some(([axis]) => axis === "State") ? "State" : variants[0]?.[0];
  const states = variants.find(([axis]) => axis === columnAxis)?.[1] ?? [REST];
  const rows = combinations(variants.filter(([axis]) => axis !== columnAxis));
  // A component with one variant property has a single row, which needs no row header.
  const labelled = rows.length > 1;
  const columnProps = (value: string) =>
    columnAxis === "State" ? stateProps(value, own) : columnAxis ? { [propName(columnAxis)]: value } : {};
  return (
    <table className="stl-variants">
      <thead>
        <tr>
          {labelled && <td />}
          {states.map((state) => (
            <th key={state} scope="col" className={textClass("Caption")}>
              {state}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const label = Object.values(row).join(" · ");
          return (
            <tr key={label}>
              {labelled && (
                <th scope="row" className={textClass("Caption")}>
                  {label}
                </th>
              )}
              {states.map((state) => (
                <td key={state}>{render({ ...row, ...columnProps(state) } as P)}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
