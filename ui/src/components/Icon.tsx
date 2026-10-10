// Icon: one of Sterling's 16px outline glyphs (definitions/icons.ts), drawn inline. It takes its color from
// the text color around it and its size from the Density icon size.

import { ICONS, type IconName } from "../../../definitions/icons";
import { cx } from "./classes";
import "./Icon.css";

export type { IconName };

/** Every icon name, in the order the library lists them. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

// The glyph data is drawn in black; in code the stroke and fill follow the text color.
const GLYPHS = Object.fromEntries(
  Object.entries(ICONS).map(([name, body]) => [name, body.replaceAll('"#000"', '"currentColor"')])
) as Record<IconName, string>;

export interface IconProps {
  name: IconName;
  /**
   * An accessible name, for an icon that carries meaning by itself. Leave it out when the icon sits beside
   * text that says the same thing: the icon is then hidden from assistive technology.
   */
  label?: string;
  className?: string;
}

export function Icon({ name, label, className }: IconProps) {
  return (
    <svg
      className={cx("stl-icon", className)}
      viewBox="0 0 16 16"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: GLYPHS[name] }}
    />
  );
}
