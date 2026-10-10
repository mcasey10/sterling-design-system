// Desktop screen layout shared by the Template skeleton and worked examples:
// 1440 × 900, 12 columns, 16px margins and gutters bound to space/16.

import { Kit, space } from "./helpers";

export const SCREEN_WIDTH = 1440;
export const SCREEN_HEIGHT = 900;
const COLUMNS = 12;
const MARGIN = 16; // space/16
const GUTTER = 16; // space/16
const COL = (SCREEN_WIDTH - MARGIN * 2 - GUTTER * (COLUMNS - 1)) / COLUMNS;

/** Width of n grid columns including the gutters between them. */
export const columnSpan = (n: number) => COL * n + GUTTER * (n - 1);

export function kitLayoutGrid(kit: Kit): LayoutGrid {
  let grid: LayoutGrid = {
    pattern: "COLUMNS",
    alignment: "STRETCH",
    count: COLUMNS,
    gutterSize: GUTTER,
    offset: MARGIN,
    visible: true,
    color: { r: 0.9, g: 0.25, b: 0.3, a: 0.08 },
  };
  grid = figma.variables.setBoundVariableForLayoutGrid(grid, "gutterSize", space(kit, "space/16"));
  grid = figma.variables.setBoundVariableForLayoutGrid(grid, "offset", space(kit, "space/16"));
  return grid;
}

/** True if the frame already has exactly Sterling's column grid (so it isn't rewritten). */
export function hasKitGrid(kit: Kit, root: FrameNode): boolean {
  if (root.layoutGrids.length !== 1) return false;
  const g = root.layoutGrids[0];
  return (
    g.pattern === "COLUMNS" &&
    g.alignment === "STRETCH" &&
    g.count === COLUMNS &&
    g.boundVariables?.gutterSize?.id === space(kit, "space/16").id &&
    g.boundVariables?.offset?.id === space(kit, "space/16").id
  );
}
