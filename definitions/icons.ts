// Icon glyphs: Sterling's 20 outline icons as SVG path data on a 16 × 16 grid. Plain data, shared by the
// Figma plugin (which draws each one as an Icon/<name> component) and the coded layer (which renders them
// inline). Strokes and fills are black here; whatever uses an icon sets its color.

const STROKE = 'stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const FILL = 'fill="#000"';
const ring = `<circle cx="8" cy="8" r="6.25" ${STROKE}/>`;
const path = (d: string, attrs = STROKE) => `<path d="${d}" ${attrs}/>`;

export const ICONS = {
  check: path("M3.5 8.5 L6.5 11.5 L12.5 4.5"),
  minus: path("M4 8 L12 8"),
  plus: path("M8 3.5 L8 12.5 M3.5 8 L12.5 8"),
  x: path("M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5"),
  "chevron-down": path("M4 6 L8 10 L12 6"),
  "arrow-up": path("M8 12.5 L8 3.5 M4.5 7 L8 3.5 L11.5 7"),
  "arrow-down": path("M8 3.5 L8 12.5 M4.5 9 L8 12.5 L11.5 9"),
  sort: path("M5 6.5 L8 3.5 L11 6.5 M5 9.5 L8 12.5 L11 9.5"),
  "caret-up": path("M8 4 L13 11 L3 11 Z", FILL),
  "caret-down": path("M3 5 L13 5 L8 12 Z", FILL),
  "circle-check": ring + path("M5.5 8.25 L7.25 10 L10.5 6.25"),
  "alert-triangle": path("M8 2.25 L14.25 13.25 L1.75 13.25 Z") + path("M8 6.5 L8 9.25 M8 11.25 L8 11.3"),
  "circle-x": ring + path("M6 6 L10 10 M10 6 L6 10"),
  info: ring + path("M8 7.5 L8 11 M8 5.1 L8 5.15"),
  "circle-dot": ring + `<circle cx="8" cy="8" r="2" ${FILL}/>`,
  search: `<circle cx="7" cy="7" r="4.5" ${STROKE}/>` + path("M10.5 10.5 L13.5 13.5"),
  filter: path("M2.5 3.5 L13.5 3.5 L9.5 8.5 L9.5 12.5 L6.5 13.5 L6.5 8.5 Z"),
  "chevron-up": path("M4 10 L8 6 L12 10"),
  more: [3.5, 8, 12.5].map((x) => `<circle cx="${x}" cy="8" r="1.25" ${FILL}/>`).join(""),
  refresh: path("M13 8 A5 5 0 1 1 11.54 4.46") + path("M11.75 1.75 L11.75 4.75 L8.75 4.75"),
} satisfies Record<string, string>;

/** The name of an icon, e.g. "plus". */
export type IconName = keyof typeof ICONS;

/**
 * The icon for each status tone (Chip/Status, and the error and warning helper icons of input fields), so
 * status is never shown by color alone.
 */
export const TONE_ICONS = {
  positive: "circle-check",
  warning: "alert-triangle",
  critical: "circle-x",
  info: "info",
  neutral: "circle-dot",
} satisfies Record<string, IconName>;

/** A complete 16 × 16 SVG document for a glyph body from ICONS. */
export function svgFor(body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${body}</svg>`;
}
