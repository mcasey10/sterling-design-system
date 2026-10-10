// Parity between the Figma library and the coded components. Both are built from definitions/components.ts;
// this module says how a definition maps to code, and reports where a coded component doesn't follow it.
//
// The mapping:
//   • A property name becomes camelCase: "Show icon" → showIcon. Values keep the same strings.
//   • Every variant property except State is a prop with the same values.
//   • State is the one deliberate difference. Code has no `state` prop:
//       hover, pressed, focus   → CSS (:hover, :active, :focus-visible), never a prop
//       disabled                → the boolean prop `disabled`
//       anything else           → a prop the component names in `stateProps` (selected, error, open, …)
//     A combined value such as "error-focus" is the combination of its parts.
//   • Text, boolean, instance-swap and slot properties are props too.
// Anything else a component leaves out or adds must be listed with its reason (`figmaOnly`, `codeOnly`),
// which is what the "Where Figma and code differ" documentation is written from.

import type { ComponentDef } from "../../../definitions/components";

/** Figma State values that code expresses with a CSS pseudo-class instead of a prop. */
export const CSS_STATES: Record<string, string> = { hover: ":hover", pressed: ":active", focus: ":focus-visible" };
/** The Figma State value that code expresses with the boolean prop of the same name. */
export const DISABLED = "disabled";
/** The Figma State value that means "no state": nothing in code. */
export const REST = "default";

export interface CodedComponent {
  /** The props that come from the definition, by code name; a variant prop lists its values. */
  props: Record<string, { values?: readonly string[] }>;
  /** State parts expressed by a prop: Figma part → how code writes it, e.g. { selected: "selected" }. */
  stateProps?: Record<string, string>;
  /** Figma properties with no prop in code: Figma name → reason. */
  figmaOnly?: Record<string, string>;
  /** Props in `props` with no Figma property: code name → reason. */
  codeOnly?: Record<string, string>;
}

/** "Show icon" → "showIcon" */
export function propName(figmaName: string): string {
  const [first, ...rest] = figmaName.trim().split(/\s+/);
  return first.toLowerCase() + rest.map((word) => word[0].toUpperCase() + word.slice(1)).join("");
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v) => b.includes(v));

/** Where a coded component doesn't follow its definition; empty when it does. */
export function parityProblems(name: string, def: ComponentDef, coded: CodedComponent): string[] {
  const problems: string[] = [];
  const expected = new Set<string>();
  const figmaOnly = coded.figmaOnly ?? {};

  for (const [axis, values] of Object.entries(def.variants)) {
    if (axis === "State") {
      for (const value of values) {
        for (const part of value.split("-")) {
          if (part === REST || part in CSS_STATES || part in (coded.stateProps ?? {})) continue;
          if (part === DISABLED) expected.add(DISABLED);
          else problems.push(`${name}: State "${value}" has no mapping for "${part}" (add it to stateProps)`);
        }
      }
      continue;
    }
    if (axis in figmaOnly) continue;
    const prop = propName(axis);
    expected.add(prop);
    const got = coded.props[prop]?.values;
    if (got && !sameSet(got, values)) problems.push(`${name}: ${prop} takes ${got.join(" / ")}; the definition has ${values.join(" / ")}`);
    if (coded.props[prop] && !got) problems.push(`${name}: ${prop} must list its values`);
  }
  for (const property of def.properties) {
    if (!(property.name in figmaOnly)) expected.add(propName(property.name));
  }

  for (const prop of expected) {
    if (!(prop in coded.props)) problems.push(`${name}: missing prop ${prop}`);
  }
  for (const prop of Object.keys(coded.props)) {
    if (!expected.has(prop) && !(prop in (coded.codeOnly ?? {}))) {
      problems.push(`${name}: prop ${prop} isn't in the definition (add it there, or to codeOnly with a reason)`);
    }
  }
  if ("state" in coded.props) problems.push(`${name}: code has no state prop; states come from CSS and boolean props`);
  return problems;
}
