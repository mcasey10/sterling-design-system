// Foundations page: color swatches (every Color mode side by side), primitive ramps,
// type specimens, spacing/radius scales, and density modes. Every swatch, bar, and
// sample is bound to the variable it documents, so the page updates with the tokens.
// The page is documentation only, so it is rebuilt on each run (at the same position).

import { tokens, entries, resolveColor, aliasTarget, ModeValues, TextStyleToken } from "../../core/tokens";
import { COLLECTIONS } from "../../core/variables";
import {
  Kit, v, color, space, density, size, frame, append, text, rect, bindFill, bindStroke, bindRadius, setNum, pinMode, takeOver,
} from "../../core/helpers";
import { created, updated } from "../../core/log";

const ROOT = "Foundations";

async function section(kit: Kit, title: string, description?: string): Promise<FrameNode> {
  const s = frame(title, { gap: space(kit, "space/24") });
  const head = frame(`${title}/Header`, { gap: space(kit, "space/4") });
  head.appendChild(await text(kit, title, "Title"));
  if (description) head.appendChild(await text(kit, description, "Body", "text/secondary"));
  s.appendChild(head);
  return s;
}

function panel(kit: Kit, name: string, opts: { fill?: string } = {}): FrameNode {
  return frame(name, {
    gap: space(kit, "space/24"),
    padding: space(kit, "space/24"),
    fill: color(kit, opts.fill ?? "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
}

// ---------------------------------------------------------------- Color

const COLOR_GROUPS: [string, string[]][] = [
  ["Surface", ["surface/"]],
  ["Border", ["border/"]],
  ["Text", ["text/"]],
  ["Accent, focus, selection", ["accent/", "focus/", "selection/"]],
  ["Status", ["status/"]],
  ["Finance", ["finance/"]],
];
const SWATCH_W = 148;
const SWATCH_GAP = 12;
const SWATCHES_PER_ROW = 6;

async function colorSwatch(kit: Kit, name: string, mode: string): Promise<FrameNode> {
  const { hex, alias } = resolveColor(name, mode);
  const s = frame(name, { gap: space(kit, "space/4"), width: SWATCH_W });
  const chip = rect("Swatch", SWATCH_W, 48);
  bindFill(chip, color(kit, name));
  bindStroke(chip, color(kit, "border/default"));
  bindRadius(chip, space(kit, "radius/sm"));
  append(
    s,
    chip,
    await text(kit, name, "Label"),
    await text(kit, alias ? `${hex} · ${alias}` : hex, "Caption", "text/secondary")
  );
  // Labels wrap inside the swatch width instead of overflowing.
  for (const child of s.children) if (child.type === "TEXT") child.layoutSizingHorizontal = "FILL";
  return s;
}

async function colorModePanel(kit: Kit, mode: string): Promise<FrameNode> {
  const p = panel(kit, `Color/${mode}`, { fill: "surface/background" });
  pinMode(kit, p, COLLECTIONS.color, mode);
  p.appendChild(await text(kit, mode, "Heading"));
  const names = entries<ModeValues<string>>(tokens.color).map(([n]) => n);
  for (const [label, prefixes] of COLOR_GROUPS) {
    const group = frame(`Group/${label}`, { gap: space(kit, "space/8") });
    group.appendChild(await text(kit, label, "Label", "text/secondary"));
    const row = frame(`Swatches/${label}`, {
      direction: "HORIZONTAL",
      gap: space(kit, "space/12"),
      wrap: true,
      width: SWATCHES_PER_ROW * SWATCH_W + (SWATCHES_PER_ROW - 1) * SWATCH_GAP,
    });
    for (const n of names.filter((n) => prefixes.some((p) => n.startsWith(p)))) {
      row.appendChild(await colorSwatch(kit, n, mode));
    }
    group.appendChild(row);
    p.appendChild(group);
  }
  return p;
}

async function colorSection(kit: Kit): Promise<FrameNode> {
  const s = await section(
    kit,
    "Color",
    "Semantic tokens, each aliasing a primitive. Buy/Sell (blue/coral) are actions; Gain/Loss (green/crimson) are data. Never rely on color alone."
  );
  const row = frame("Color/Modes", { direction: "HORIZONTAL", gap: space(kit, "space/24") });
  const modes = kit.collections.get(COLLECTIONS.color)!.modeIds;
  for (const mode of modes.keys()) row.appendChild(await colorModePanel(kit, mode));
  s.appendChild(row);
  return s;
}

async function primitivesSection(kit: Kit): Promise<FrameNode> {
  const s = await section(kit, "Primitives", "Raw ramps. Hidden from property pickers; use semantic Color tokens in designs.");
  const p = panel(kit, "Primitives/Ramps");
  for (const [ramp, steps] of Object.entries(tokens.primitives)) {
    const row = frame(`Ramp/${ramp}`, { direction: "HORIZONTAL", gap: space(kit, "space/8") });
    const label = frame("Label", { width: 72 });
    label.appendChild(await text(kit, ramp, "Label"));
    row.appendChild(label);
    for (const [step, hex] of Object.entries(steps)) {
      const sw = frame(`${ramp}/${step}`, { gap: space(kit, "space/4"), width: 72 });
      const chip = rect("Swatch", 72, 40);
      bindFill(chip, v(kit, `Primitives/${ramp}/${step}`));
      bindStroke(chip, color(kit, "border/default"));
      bindRadius(chip, space(kit, "radius/xs"));
      append(sw, chip, await text(kit, step, "Label"), await text(kit, hex, "Caption", "text/secondary"));
      row.appendChild(sw);
    }
    p.appendChild(row);
  }
  s.appendChild(p);
  return s;
}

// ---------------------------------------------------------------- Type

const SAMPLES: Record<string, string> = {
  Display: "Portfolio overview",
  Title: "Account summary",
  Heading: "Open items",
  Body: "Item one was updated and moved to review.",
  "Body-strong": "12 items need review before submitting.",
  Label: "Unpaid principal balance",
  Caption: "Updated 09:42 ET · hypothetical data",
  Numeric: "412,500.00   6.125%   742   78.5%",
  Code: '<Button kind="primary" size="md" label="Save" />',
};

async function typeSection(kit: Kit): Promise<FrameNode> {
  const s = await section(kit, "Typography", `${tokens.typography.fontFamily} (Code: Roboto Mono). Line heights tuned for dense tables.`);
  const p = panel(kit, "Typography/Specimens");
  for (const [name, spec] of Object.entries<TextStyleToken>(tokens.typography.styles)) {
    const row = frame(`Type/${name}`, { direction: "HORIZONTAL", gap: space(kit, "space/24"), align: "CENTER" });
    const meta = frame("Meta", { gap: space(kit, "space/2"), width: 200 });
    append(
      meta,
      await text(kit, name, "Label"),
      await text(kit, `${spec.fontSize}/${spec.lineHeight} · ${spec.fontStyle}`, "Caption", "text/secondary")
    );
    row.appendChild(meta);
    row.appendChild(await text(kit, SAMPLES[name] ?? name, name));
    p.appendChild(row);
  }
  p.appendChild(
    await text(
      kit,
      "Numeric: enable tabular figures manually (Type settings → Details → Numbers → Style → Monospace uppercase/lining). The plugin API cannot set OpenType features.",
      "Caption",
      "status/warning-strong"
    )
  );
  s.appendChild(p);
  return s;
}

// ---------------------------------------------------------------- Spacing & radius

async function spacingSection(kit: Kit): Promise<FrameNode> {
  const s = await section(
    kit,
    "Spacing, size, and radius",
    "Spacing (gap and padding, 4px base with 2px half-steps) and Size (fixed widths and heights) are the scales Density aliases. " +
      "Bars, squares, and corners are bound to the variables they show."
  );
  const row = frame("Spacing/Row", { direction: "HORIZONTAL", gap: space(kit, "space/24") });

  const spacing = panel(kit, "Spacing/Scale");
  spacing.appendChild(await text(kit, "Spacing · gap and padding", "Label", "text/secondary"));
  const sizes = panel(kit, "Size/Scale");
  sizes.appendChild(await text(kit, "Size · width and height", "Label", "text/secondary"));
  const radius = panel(kit, "Radius/Scale");
  const radiusRow = frame("Radius/Row", { direction: "HORIZONTAL", gap: space(kit, "space/16") });

  for (const [name, value] of entries<number>(tokens.spacing)) {
    if (name.startsWith("space/")) {
      const line = frame(name, { direction: "HORIZONTAL", gap: space(kit, "space/12"), align: "CENTER" });
      const label = frame("Label", { width: 96 });
      label.appendChild(await text(kit, `${name}`, "Label"));
      const bar = rect("Bar", value, 12);
      bindFill(bar, color(kit, "accent/default"));
      setNum(bar, "height", size(kit, "size/12"));
      if (value > 0) setNum(bar, "width", space(kit, name));
      else bar.visible = false;
      append(line, label, bar, await text(kit, `${value}`, "Caption", "text/secondary"));
      spacing.appendChild(line);
    } else {
      const item = frame(name, { gap: space(kit, "space/8"), align: "CENTER" });
      const box = rect("Sample", 64, 64);
      bindFill(box, color(kit, "accent/subtle"));
      bindStroke(box, color(kit, "accent/default"));
      bindRadius(box, space(kit, name));
      append(item, box, await text(kit, name, "Label"), await text(kit, `${value}`, "Caption", "text/secondary"));
      radiusRow.appendChild(item);
    }
  }
  radius.appendChild(radiusRow);

  const sizeRow = frame("Size/Row", { direction: "HORIZONTAL", gap: space(kit, "space/16"), align: "MAX" });
  for (const [name, value] of entries<number>(tokens.size)) {
    if (name.startsWith("stroke/")) {
      // Stroke widths: a bordered sample using the width it shows.
      const item = frame(name, { gap: space(kit, "space/8"), align: "CENTER" });
      const sample = rect("Sample", 48, 24);
      bindStroke(sample, color(kit, "accent/default"), value);
      bindRadius(sample, space(kit, "radius/sm"));
      append(item, sample, await text(kit, name, "Label"), await text(kit, `${value}`, "Caption", "text/secondary"));
      sizeRow.appendChild(item);
      continue;
    }
    const item = frame(name, { gap: space(kit, "space/8"), align: "CENTER" });
    const box = rect("Sample", value, value);
    bindFill(box, color(kit, "accent/subtle"));
    bindStroke(box, color(kit, "accent/default"));
    setNum(box, "width", size(kit, name));
    setNum(box, "height", size(kit, name));
    append(item, box, await text(kit, name, "Label"), await text(kit, `${value}`, "Caption", "text/secondary"));
    sizeRow.appendChild(item);
  }
  sizes.appendChild(sizeRow);
  append(row, spacing, sizes, radius);
  s.appendChild(row);
  return s;
}

// ---------------------------------------------------------------- Density

const SAMPLE_ROWS = [
  ["ID", "Name", "Amount"],
  ["ID-0001", "Item one", "1,250.00"],
  ["ID-0002", "Item two", "840.00"],
  ["ID-0003", "Item three", "2,100.00"],
];
const COL_WIDTHS = [104, 176, 112];

async function sampleRow(kit: Kit, cells: string[], header: boolean): Promise<FrameNode> {
  const row = frame(header ? "Row/Header" : "Row/Body", {
    direction: "HORIZONTAL",
    fill: color(kit, header ? "surface/background" : "surface/panel"),
    align: "CENTER",
  });
  bindStroke(row, color(kit, "border/default"), { bottom: 1 });
  row.counterAxisSizingMode = "FIXED";
  setNum(row, "height", density(kit, "row/height"));
  for (const [i, value] of cells.entries()) {
    const numeric = i === 2;
    const cell = frame(`Cell/${i}`, {
      direction: "HORIZONTAL",
      width: COL_WIDTHS[i],
      padding: { x: density(kit, "cell/padding-x"), y: density(kit, "cell/padding-y") },
      align: "CENTER",
    });
    cell.primaryAxisAlignItems = numeric ? "MAX" : "MIN";
    cell.appendChild(
      await text(kit, value, header ? "Label" : numeric ? "Numeric" : "Body", header ? "text/secondary" : "text/primary")
    );
    row.appendChild(cell);
    cell.layoutSizingVertical = "FILL";
  }
  return row;
}

async function densityPanel(kit: Kit, mode: string): Promise<FrameNode> {
  const p = panel(kit, `Density/${mode}`);
  pinMode(kit, p, COLLECTIONS.density, mode);
  p.appendChild(await text(kit, mode, "Heading"));

  const values = frame("Values", { gap: space(kit, "space/2") });
  for (const [name, byMode] of entries<ModeValues<string>>(tokens.density)) {
    const target = aliasTarget(byMode[mode]) ?? byMode[mode];
    const px = tokens.size[target] ?? tokens.spacing[target];
    values.appendChild(await text(kit, `${name} → ${target}${px !== undefined ? ` (${px})` : ""}`, "Caption", "text/secondary"));
  }
  p.appendChild(values);

  const grid = frame("Sample grid", { stroke: color(kit, "border/default") });
  for (const [i, cells] of SAMPLE_ROWS.entries()) grid.appendChild(await sampleRow(kit, cells, i === 0));
  p.appendChild(grid);

  const control = frame("Sample control", {
    direction: "HORIZONTAL",
    gap: density(kit, "control/gap"),
    padding: { x: density(kit, "control/padding-x") },
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/strong"),
    radius: space(kit, "radius/sm"),
    align: "CENTER",
  });
  control.counterAxisSizingMode = "FIXED";
  setNum(control, "height", density(kit, "control/height"));
  const icon = rect("Icon", 16, 16);
  bindFill(icon, color(kit, "text/secondary"));
  bindRadius(icon, space(kit, "radius/xs"));
  setNum(icon, "width", density(kit, "icon/size"));
  setNum(icon, "height", density(kit, "icon/size"));
  append(control, icon, await text(kit, "Select option", "Body"));
  p.appendChild(control);
  return p;
}

async function densitySection(kit: Kit): Promise<FrameNode> {
  const s = await section(
    kit,
    "Density",
    "Switch a frame's Density mode (Compact / Default / Comfortable) to resize rows, cells, and controls. Every value aliases the Size or Spacing scale."
  );
  const row = frame("Density/Modes", { direction: "HORIZONTAL", gap: space(kit, "space/24") });
  for (const mode of kit.collections.get(COLLECTIONS.density)!.modeIds.keys()) {
    row.appendChild(await densityPanel(kit, mode));
  }
  s.appendChild(row);
  return s;
}

// ---------------------------------------------------------------- Page

export async function buildFoundations(kit: Kit, page: PageNode): Promise<FrameNode> {
  const pos = takeOver(page, ROOT);
  const root = frame(ROOT, {
    gap: space(kit, "space/48"),
    padding: space(kit, "space/48"),
    fill: color(kit, "surface/background"),
  });
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");
  page.appendChild(root);
  if (pos) {
    root.x = pos.x;
    root.y = pos.y;
  }

  const header = frame("Header", { gap: space(kit, "space/8") });
  append(
    header,
    await text(kit, "Foundations", "Display"),
    await text(
      kit,
      "Generated from tokens/tokens.json. Edit the tokens and rerun the plugin — changes made here by hand are overwritten.",
      "Body",
      "text/secondary"
    )
  );
  append(
    root,
    header,
    await colorSection(kit),
    await primitivesSection(kit),
    await typeSection(kit),
    await spacingSection(kit),
    await densitySection(kit)
  );

  if (pos) updated(`Page Foundations`);
  else created(`Page Foundations content`);
  return root;
}
