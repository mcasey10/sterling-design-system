// Input/Text: a labeled text field with helper text and validation. Hover and focus come from CSS, disabled
// is the native attribute, and error / warning are the `validation` prop. The placeholder shows whenever the
// value is empty, so Figma's Content property has no prop here.

import { type InputHTMLAttributes, useId } from "react";
import { TONE_ICONS } from "../../../definitions/icons";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon } from "./Icon";
import "./TextInput.css";

export type Validation = "error" | "warning";

/** The helper icon and its accessible name for each validation state: the same icons as the status tones. */
const FLAGS = {
  error: { icon: TONE_ICONS.critical, name: "Error" },
  warning: { icon: TONE_ICONS.warning, name: "Warning" },
} as const;

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "aria-label"> {
  /** The field's label. With showLabel off it is still the accessible name. */
  label: string;
  helper?: string;
  /** Hide the label only when a visible label sits right next to the field. */
  showLabel?: boolean;
  showHelper?: boolean;
  /** Adds the error or warning border, icon, and helper color. Say what is wrong in `helper`. */
  validation?: Validation;
}

export function TextInput({
  label, helper, showLabel = true, showHelper = true, validation, disabled, className, id, type = "text", ...rest
}: TextInputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const helperId = `${inputId}-helper`;
  const hasHelper = showHelper && !!helper;
  return (
    <div className={cx("stl-field", validation && `stl-field--${validation}`, className)}>
      {showLabel && (
        <label className={cx("stl-field__label", textClass("Label"))} htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={cx("stl-field__input", textClass("Numeric"))}
        aria-label={showLabel ? undefined : label}
        aria-invalid={validation === "error" ? true : undefined}
        aria-describedby={hasHelper ? helperId : undefined}
        disabled={disabled}
        {...rest}
      />
      {hasHelper && (
        // aria-disabled marks the helper as part of a disabled control, whose text is exempt from contrast minimums.
        <div id={helperId} className={cx("stl-field__helper", textClass("Caption"))} aria-disabled={disabled || undefined}>
          {validation && <Icon name={FLAGS[validation].icon} label={FLAGS[validation].name} />}
          {helper}
        </div>
      )}
    </div>
  );
}
