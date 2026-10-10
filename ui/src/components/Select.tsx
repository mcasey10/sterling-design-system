// Input/Select: a labeled dropdown for one choice from a short list. Keyboard behavior, typeahead, and
// screen-reader semantics come from React Aria (hooks only); the look is Sterling's own CSS, shared with
// Input/Text. Hover and focus come from CSS, `disabled` and `open` are props, and error / warning are the
// `validation` prop. The placeholder shows whenever nothing is selected, so Figma's Content property has no
// prop here.

import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { DismissButton, HiddenSelect, Overlay, useButton, useListBox, useOption, usePopover, useSelect } from "react-aria";
import { Item, type ListState, type SelectState, useSelectState } from "react-stately";
import { TONE_ICONS } from "../../../definitions/icons";
import { spacePx, textClass } from "../tokens";
import { cx } from "./classes";
import { Icon } from "./Icon";
import { Menu, Option } from "./Menu";
import type { Validation } from "./TextInput";
import "./TextInput.css";
import "./Select.css";

/** The helper icon and its accessible name for each validation state: the same icons as the status tones. */
const FLAGS = {
  error: { icon: TONE_ICONS.critical, name: "Error" },
  warning: { icon: TONE_ICONS.warning, name: "Warning" },
} as const;

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** The field's label. With showLabel off it is still the accessible name. */
  label: string;
  /** The choices, in order. */
  options: SelectOption[];
  /** The `value` of the selected option. The field shows that option's label. */
  value?: string | null;
  onValueChange?: (value: string) => void;
  /** Shown while nothing is selected. */
  placeholder?: string;
  helper?: string;
  /** Hide the label only when a visible label sits right next to the field. */
  showLabel?: boolean;
  showHelper?: boolean;
  /** Adds the error or warning border, icon, and helper color. Say what is wrong in `helper`. */
  validation?: Validation;
  disabled?: boolean;
  /** Whether the menu is open. Leave it out and the select opens and closes by itself. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The field's name when it is submitted with a form. */
  name?: string;
  className?: string;
  /** data-* attributes go on the field's button. */
  [data: `data-${string}`]: string | undefined;
}

export function Select({
  label, options, value, onValueChange, placeholder, helper, showLabel = true, showHelper = true, validation, disabled = false,
  open, onOpenChange, name, className, ...data
}: SelectProps) {
  const hasHelper = showHelper && !!helper;
  const ariaProps = {
    label: showLabel ? label : undefined,
    "aria-label": showLabel ? undefined : label,
    description: hasHelper ? helper : undefined,
    items: options,
    children: (option: SelectOption) => (
      <Item key={option.value} textValue={option.label}>
        {option.label}
      </Item>
    ),
    disabledKeys: options.filter((option) => option.disabled).map((option) => option.value),
    // Leaving `value` undefined lets the select keep its own value.
    ...(value !== undefined ? { value } : {}),
    onChange: (key: string | number | null) => {
      if (key != null) onValueChange?.(String(key));
    },
    isOpen: open,
    onOpenChange,
    isDisabled: disabled,
    isInvalid: validation === "error",
    name,
  };
  const state = useSelectState<SelectOption>(ariaProps);
  const trigger = useRef<HTMLButtonElement>(null);
  const { labelProps, triggerProps, valueProps, menuProps, descriptionProps } = useSelect(ariaProps, state, trigger);
  const { buttonProps } = useButton(triggerProps, trigger);
  const selected = state.selectedItem;

  return (
    <div className={cx("stl-field", "stl-select", validation && `stl-field--${validation}`, className)}>
      {showLabel && (
        <span {...labelProps} className={cx("stl-field__label", textClass("Label"))}>
          {label}
        </span>
      )}
      <HiddenSelect state={state} triggerRef={trigger} label={label} name={name} isDisabled={disabled} />
      <button
        {...data}
        {...buttonProps}
        ref={trigger}
        type="button"
        className={cx("stl-field__input", "stl-select__trigger", textClass("Body"))}
        aria-invalid={validation === "error" ? true : undefined}
      >
        <span {...valueProps} className={cx("stl-select__value", !selected && "stl-select__value--placeholder")}>
          {selected ? selected.rendered : placeholder}
        </span>
        <Icon name={state.isOpen ? "chevron-up" : "chevron-down"} />
      </button>
      {hasHelper && (
        // aria-disabled marks the helper as part of a disabled control, whose text is exempt from contrast minimums.
        <div {...descriptionProps} className={cx("stl-field__helper", textClass("Caption"))} aria-disabled={disabled || undefined}>
          {validation && <Icon name={FLAGS[validation].icon} label={FLAGS[validation].name} />}
          {helper}
        </div>
      )}
      {state.isOpen && (
        <Popover state={state} trigger={trigger}>
          <ListBox menuProps={menuProps} state={state} />
        </Popover>
      )}
    </div>
  );
}

/**
 * The menu's layer: placed under the field (4px below, as wide as the field), above the page. It is not
 * modal: the page behind stays reachable, and the menu closes when focus or a click goes elsewhere.
 */
function Popover({ state, trigger, children }: { state: SelectState<SelectOption>; trigger: RefObject<HTMLButtonElement | null>; children: ReactNode }) {
  const popover = useRef<HTMLDivElement>(null);
  const { popoverProps } = usePopover(
    { triggerRef: trigger, popoverRef: popover, placement: "bottom start", offset: spacePx("space/4"), isNonModal: true },
    state
  );
  const [width, setWidth] = useState<number>();
  useLayoutEffect(() => setWidth(trigger.current?.offsetWidth), [trigger]);
  return (
    <Overlay>
      <div {...popoverProps} ref={popover} className="stl-select__popover" style={{ ...popoverProps.style, width }}>
        <DismissButton onDismiss={state.close} />
        {children}
        <DismissButton onDismiss={state.close} />
      </div>
    </Overlay>
  );
}

function ListBox({ menuProps, state }: { menuProps: object; state: SelectState<SelectOption> }) {
  const list = useRef<HTMLUListElement>(null);
  const { listBoxProps } = useListBox(menuProps, state, list);
  return (
    <Menu {...listBoxProps} ref={list}>
      {[...state.collection].map((item) => (
        <ListOption key={item.key} itemKey={item.key} label={item.textValue} state={state} />
      ))}
    </Menu>
  );
}

function ListOption({ itemKey, label, state }: { itemKey: string | number; label: string; state: ListState<SelectOption> }) {
  const option = useRef<HTMLLIElement>(null);
  const { optionProps, isSelected, isFocused, isFocusVisible, isDisabled } = useOption({ key: itemKey }, state, option);
  return (
    <Option
      {...optionProps}
      ref={option}
      label={label}
      selected={isSelected}
      disabled={isDisabled}
      data-focused={isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
    />
  );
}
