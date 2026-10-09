// Icon components ("Icon/<name>"), drawn on a 16px grid as original, simple outline glyphs.
// Every drawn layer is named "Glyph" so parent components can recolor it (tintIcon) and
// overrides carry over when an icon is swapped. Glyph layers scale with the instance.
// Glyphs are only redrawn when their SVG source changes, keeping node IDs stable.

import { Kit, color, space, recolor, PLUGIN_KEY, setDescription } from "../core/helpers";
import { ensureFrame, ensureText, findComponent } from "../core/ensure";
import { created, updated } from "../core/log";
import { describe } from "./docRegistry";

const STROKE = 'stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const FILL = 'fill="#000"';
const ring = `<circle cx="8" cy="8" r="6.25" ${STROKE}/>`;
const path = (d: string, attrs = STROKE) => `<path d="${d}" ${attrs}/>`;

export const ICONS: Record<string, string> = {
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
};

export type IconIndex = Map<string, ComponentNode>;

function svgFor(body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${body}</svg>`;
}

function drawGlyph(comp: ComponentNode, svg: string) {
  for (const c of [...comp.children]) c.remove();
  const f = figma.createNodeFromSvg(svg);
  comp.appendChild(f);
  f.x = 0;
  f.y = 0;
  for (const shape of [...f.children]) {
    comp.appendChild(shape); // keeps its position: f sits at the component's origin
    shape.name = "Glyph";
    if ("constraints" in shape) shape.constraints = { horizontal: "SCALE", vertical: "SCALE" };
  }
  f.remove();
  comp.setPluginData("svg", svg);
}

export async function buildIcons(kit: Kit, page: PageNode, grid: FrameNode): Promise<IconIndex> {
  const index: IconIndex = new Map();
  const ink = color(kit, "text/primary");
  let i = 0;
  for (const [name, body] of Object.entries(ICONS)) {
    const svg = svgFor(body);
    const cell = ensureFrame(grid, `Cell/${name}`, { gap: space(kit, "space/8"), align: "CENTER" }, i++);
    let comp = findComponent(page, `Icon/${name}`);
    if (!comp) {
      comp = figma.createComponent();
      comp.name = `Icon/${name}`;
      cell.insertChild(0, comp);
      created(`Component Icon/${name}`);
    } else {
      updated(`Component Icon/${name}`);
    }
    const description = describe(`Icon/${name}`);
    if (comp.getPluginData(PLUGIN_KEY) !== "generated") comp.setPluginData(PLUGIN_KEY, "generated");
    if (comp.width !== 16 || comp.height !== 16) comp.resizeWithoutConstraints(16, 16);
    if (!Array.isArray(comp.fills) || comp.fills.length) comp.fills = [];
    if (comp.clipsContent) comp.clipsContent = false;
    setDescription(comp, description);
    if (comp.getPluginData("svg") !== svg || !comp.findOne((n) => n.name === "Glyph")) drawGlyph(comp, svg);

    for (const g of comp.findAll((n) => n.name === "Glyph")) recolor(g as VectorNode, ink);
    if (comp.parent === cell) {
      await ensureText(kit, cell, "Name", name, "Caption", "text/secondary", 1);
    }
    index.set(name, comp);
  }
  return index;
}
