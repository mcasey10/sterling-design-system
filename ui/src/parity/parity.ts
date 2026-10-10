// Parity between the Figma library and the coded components. Both are built from definitions/components.ts;
// this module says how a definition maps to code, and reports where a coded component doesn't follow it.
//
// The mapping:
//   • A property name becomes camelCase: "Show icon" → showIcon. Values keep the same strings.
//   • Every variant property except State is a prop, typed from the definition with
//     VariantValue<"Controls/Button", "Kind">, so its values can't differ.
//   • State is the one deliberate difference. Code has no `state` prop:
//       hover, pressed, focus   → CSS (:hover, :active, :focus-visible), never a prop
//       disabled                → the boolean prop `disabled`
//       anything else           → a prop the component names in `stateProps` (selected → `selected`,
//                                 error → `validation`, …)
//     A combined value such as "error-focus" is the combination of its parts.
//   • Text, boolean and instance-swap properties are props too. A slot is `children`.
// Anything else a component leaves out or adds must be listed with its reason (`figmaOnly`, `codeOnly`),
// which is what the "Where Figma and code differ" documentation is written from. Native HTML attributes
// that a component passes through (onClick, href, …) are not design props and aren't listed.

import type { ComponentDef } from "../../../definitions/components";

/** Figma State values that code expresses with a CSS pseudo-class instead of a prop. */
export const CSS_STATES: Record<string, string> = { hover: ":hover", pressed: ":active", focus: ":focus-visible" };
/** The Figma State value that code expresses with the boolean prop of the same name. */
export const DISABLED = "disabled";
/** The Figma State value that means "no state": nothing in code. */
export const REST = "default";

export interface CodedComponent {
  /** The component's source file, relative to ui/. */
  source: string;
  /** The component's design props, by code name. */
  props: readonly string[];
  /** State parts expressed by a prop: Figma part → the prop, e.g. { selected: "selected", error: "validation" }. */
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

/** The parts of a State value: "error-focus" → ["error", "focus"]. */
export const stateParts = (value: string): string[] => value.split("-");

/**
 * Where a coded component doesn't follow its definition; empty when it does. `sourceText` is the content of
 * the component's source file.
 */
export function parityProblems(name: string, def: ComponentDef, coded: CodedComponent, sourceText: string): string[] {
  const problems: string[] = [];
  const expected = new Set<string>();
  const figmaOnly = coded.figmaOnly ?? {};

  for (const [axis, values] of Object.entries(def.variants)) {
    if (axis === "State") {
      for (const value of values) {
        for (const part of stateParts(value)) {
          if (part === REST || part in CSS_STATES) continue;
          if (coded.stateProps?.[part]) { expected.add(coded.stateProps[part]); continue; }
          if (part === DISABLED) expected.add(DISABLED);
          else problems.push(`${name}: State "${value}" has no mapping for "${part}" (add it to stateProps)`);
        }
      }
      continue;
    }
    if (axis in figmaOnly) continue;
    expected.add(propName(axis));
    const type = `VariantValue<"${name}", "${axis}">`;
    if (!sourceText.includes(type)) problems.push(`${name}: ${coded.source} must type ${propName(axis)} as ${type}`);
  }
  for (const property of def.properties) {
    if (!(property.name in figmaOnly)) expected.add(property.type === "SLOT" ? "children" : propName(property.name));
  }

  for (const prop of expected) {
    if (!coded.props.includes(prop)) problems.push(`${name}: missing prop ${prop}`);
  }
  for (const prop of coded.props) {
    if (!expected.has(prop) && !(prop in (coded.codeOnly ?? {}))) {
      problems.push(`${name}: prop ${prop} isn't in the definition (add it there, or to codeOnly with a reason)`);
    }
  }
  if (coded.props.includes("state")) problems.push(`${name}: code has no state prop; states come from CSS and boolean props`);
  return problems;
}
