// Building blocks for documentation frames (Read me page, "About this example"):
// wrapping paragraphs, titled sections, definition lists, numbered steps, and a stage diagram.
// Everything is bound to tokens like the rest of Sterling.

import { Kit, color, space, frame, append, text, recolor } from "./helpers";

/** Paragraph that wraps to its parent's width. */
export async function para(kit: Kit, parent: FrameNode, chars: string, style = "Body", colorName = "text/secondary") {
  const t = await text(kit, chars, style, colorName);
  parent.appendChild(t);
  t.layoutSizingHorizontal = "FILL";
  return t;
}

/** Panel with a Title, stretched to its parent's width. */
export async function docSection(kit: Kit, root: FrameNode, title: string): Promise<FrameNode> {
  const s = frame(title, {
    gap: space(kit, "space/12"),
    padding: space(kit, "space/24"),
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  root.appendChild(s);
  s.layoutSizingHorizontal = "FILL";
  s.appendChild(await text(kit, title, "Title"));
  return s;
}

/** Two-column list: bold term + wrapping description. */
export async function definitions(kit: Kit, parent: FrameNode, rows: [string, string][], termWidth = 200) {
  for (const [term, desc] of rows) {
    const row = frame(`Row/${term}`, { direction: "HORIZONTAL", gap: space(kit, "space/16") });
    parent.appendChild(row);
    row.layoutSizingHorizontal = "FILL";
    const label = frame("Term", { width: termWidth });
    row.appendChild(label);
    const termText = await text(kit, term, "Body-strong");
    label.appendChild(termText);
    termText.layoutSizingHorizontal = "FILL"; // long terms wrap inside the column instead of overflowing
    const body = frame("Description", {});
    row.appendChild(body);
    body.layoutGrow = 1;
    await para(kit, body, desc);
  }
}

/** Numbered steps. */
export async function steps(kit: Kit, parent: FrameNode, items: string[]) {
  for (const [i, item] of items.entries()) {
    const row = frame(`Step ${i + 1}`, { direction: "HORIZONTAL", gap: space(kit, "space/12") });
    parent.appendChild(row);
    row.layoutSizingHorizontal = "FILL";
    const n = frame("Number", { width: 24 });
    n.appendChild(await text(kit, `${i + 1}.`, "Body-strong", "accent/default"));
    row.appendChild(n);
    const body = frame("Text", {});
    row.appendChild(body);
    body.layoutGrow = 1;
    await para(kit, body, item, "Body", "text/primary");
  }
}

/** Stage diagram: tinted boxes (status tones) joined by arrows, each with a title and subtitle. */
export async function stageDiagram(kit: Kit, parent: FrameNode, stages: [string, string, string][]) {
  const row = frame("Stage diagram", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8"), wrap: true });
  parent.appendChild(row);
  row.layoutSizingHorizontal = "FILL";
  for (const [i, [title, sub, tone]] of stages.entries()) {
    const box = frame(`Stage/${title}`, {
      gap: space(kit, "space/2"),
      padding: { x: space(kit, "space/12"), y: space(kit, "space/8") },
      fill: color(kit, `status/${tone}-subtle`),
      radius: space(kit, "radius/sm"),
    });
    append(
      box,
      await text(kit, title, "Body-strong", `status/${tone}-strong`),
      await text(kit, sub, "Caption", `status/${tone}-strong`)
    );
    row.appendChild(box);
    if (i < stages.length - 1) row.appendChild(await text(kit, "→", "Heading", "text/secondary"));
  }
  return row;
}

/**
 * Text table that wraps (unlike Sterling's grid cells, which truncate). Fixed widths per column except the
 * last, which fills. An empty first cell continues the group above it (the group label appears once).
 */
export async function docTable(kit: Kit, parent: FrameNode, name: string, headers: string[], rows: string[][], widths: number[]) {
  const table = frame(name, { stroke: color(kit, "border/default"), radius: space(kit, "radius/sm"), clip: true });
  parent.appendChild(table);
  table.layoutSizingHorizontal = "FILL";
  const addRow = async (cells: string[], header: boolean, groupStart: boolean, i: number) => {
    const row = frame(header ? "Header" : `Row ${i + 1}`, {
      direction: "HORIZONTAL",
      fill: color(kit, header ? "surface/hover" : "surface/panel"),
      stroke: color(kit, "border/default"),
      // A full separator starts each group; rows inside a group only separate the Good / Bad columns.
      strokeSides: { top: header || i === 0 ? 0 : groupStart ? 1 : 0 },
    });
    table.appendChild(row);
    row.layoutSizingHorizontal = "FILL";
    for (const [c, chars] of cells.entries()) {
      const last = c === cells.length - 1;
      const cell = frame(headers[c] || `Column ${c + 1}`, {
        padding: { x: space(kit, "space/12"), y: space(kit, "space/8") },
        width: last ? undefined : widths[c],
        stroke: !header && !groupStart && c > 0 ? color(kit, "border/default") : undefined,
        strokeSides: { top: 1 },
      });
      row.appendChild(cell);
      if (last) cell.layoutGrow = 1;
      if (cell.layoutAlign !== "STRETCH") cell.layoutAlign = "STRETCH";
      if (chars) await para(kit, cell, chars, header || c === 0 ? "Body-strong" : "Body", "text/primary");
    }
  };
  await addRow(headers, true, true, -1);
  for (const [i, r] of rows.entries()) await addRow(r, false, !!r[0], i);
  return table;
}

/** A labeled Do / Don't pair: each side has an icon plus the word, so it never relies on color alone. */
export async function doDont(
  kit: Kit,
  parent: FrameNode,
  icons: Map<string, ComponentNode>,
  rule: string,
  good: { node: SceneNode; note: string },
  bad: { node: SceneNode; note: string }
) {
  const pair = frame(`Do and don't/${rule}`, { gap: space(kit, "space/8") });
  parent.appendChild(pair);
  pair.layoutSizingHorizontal = "FILL";
  pair.appendChild(await text(kit, rule, "Body-strong"));
  const sides = frame("Sides", { direction: "HORIZONTAL", gap: space(kit, "space/16") });
  pair.appendChild(sides);
  sides.layoutSizingHorizontal = "FILL";
  for (const [label, tone, icon, side] of [
    ["Do", "positive", "circle-check", good],
    ["Don't", "critical", "circle-x", bad],
  ] as const) {
    const col = frame(label, {
      gap: space(kit, "space/8"),
      padding: space(kit, "space/12"),
      fill: color(kit, "surface/background"),
      stroke: color(kit, `status/${tone}`),
      strokeSides: { top: 2 },
      radius: space(kit, "radius/sm"),
    });
    sides.appendChild(col);
    col.layoutGrow = 1;
    const head = frame("Verdict", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/4") });
    col.appendChild(head);
    const glyph = icons.get(icon)!.createInstance();
    head.appendChild(glyph);
    for (const g of glyph.findAll((n) => n.name === "Glyph")) recolor(g as VectorNode, color(kit, `status/${tone}-strong`));
    head.appendChild(await text(kit, label, "Body-strong", `status/${tone}-strong`));
    col.appendChild(side.node);
    await para(kit, col, side.note, "Caption");
  }
  return pair;
}

/** Small numbered circle (accent on accent/subtle), shared by flow diagrams and their step lists. */
async function badge(kit: Kit, n: string): Promise<FrameNode> {
  const b = frame(`Badge ${n}`, {
    direction: "HORIZONTAL",
    align: "CENTER",
    justify: "CENTER",
    width: 18,
    height: 18,
    radius: space(kit, "radius/pill"),
    fill: color(kit, "accent/subtle"),
  });
  b.appendChild(await text(kit, n, "Caption", "accent/default"));
  return b;
}

export interface FlowNode {
  title: string;
  subtitle?: string;
  /** Highlighted node: accent outline, plus this label (e.g. a chip) placed above it. */
  highlight?: SceneNode;
}

/**
 * Left-to-right flow of boxes joined by arrows, with an optional number badge on each arrow (edges[i]
 * sits between nodes i and i+1; "" for none). `muted` draws a lighter row (no fill, secondary text) for
 * secondary flows such as payments going back. Boxes are a fixed width so a 7-node row fits 934px.
 */
export async function flowDiagram(
  kit: Kit, parent: FrameNode, name: string, nodes: FlowNode[], edges: string[], opts: { muted?: boolean; nodeWidth?: number } = {}
) {
  const nodeWidth = opts.nodeWidth ?? 104;
  const hasHighlight = nodes.some((n) => n.highlight);
  // Top padding leaves room for the highlight label, which sits above its box without shifting the row.
  const row = frame(name, {
    direction: "HORIZONTAL",
    align: "CENTER",
    gap: space(kit, "space/6"),
    padding: hasHighlight ? { y: space(kit, "space/24") } : undefined,
  });
  parent.appendChild(row);
  for (const [i, n] of nodes.entries()) {
    const box = frame(`Node/${n.title}`, {
      align: "CENTER",
      gap: space(kit, "space/2"),
      padding: { x: space(kit, "space/8"), y: space(kit, "space/6") },
      width: nodeWidth,
      fill: opts.muted ? undefined : color(kit, "surface/panel"),
      stroke: color(kit, n.highlight ? "accent/default" : "border/default"),
      strokeSides: { top: n.highlight ? 2 : 1, right: n.highlight ? 2 : 1, bottom: n.highlight ? 2 : 1, left: n.highlight ? 2 : 1 },
      radius: space(kit, "radius/sm"),
    });
    row.appendChild(box);
    const title = await text(kit, n.title, opts.muted ? "Body" : "Body-strong", opts.muted ? "text/secondary" : "text/primary");
    box.appendChild(title);
    title.layoutSizingHorizontal = "FILL";
    title.textAlignHorizontal = "CENTER";
    if (n.subtitle) {
      const sub = await text(kit, n.subtitle, "Caption", "text/secondary");
      box.appendChild(sub);
      sub.layoutSizingHorizontal = "FILL";
      sub.textAlignHorizontal = "CENTER";
    }
    if (n.highlight) {
      box.appendChild(n.highlight);
      if ("layoutPositioning" in n.highlight) (n.highlight as FrameNode).layoutPositioning = "ABSOLUTE";
      n.highlight.x = (nodeWidth - n.highlight.width) / 2;
      n.highlight.y = -n.highlight.height - 4;
    }
    if (i < nodes.length - 1) {
      const arrow = frame(`Arrow ${i + 1}`, { align: "CENTER", gap: space(kit, "space/2") });
      row.appendChild(arrow);
      if (edges[i]) arrow.appendChild(await badge(kit, edges[i]));
      arrow.appendChild(await text(kit, "→", "Heading", "text/secondary"));
    }
  }
  return row;
}

/** Steps numbered with the same badges as a flow diagram, so step n matches badge n. */
export async function badgeSteps(kit: Kit, parent: FrameNode, items: [string, string][]) {
  for (const [n, item] of items) {
    const row = frame(`Step ${n}`, { direction: "HORIZONTAL", gap: space(kit, "space/8") });
    parent.appendChild(row);
    row.layoutSizingHorizontal = "FILL";
    row.appendChild(await badge(kit, n));
    const body = frame("Text", {});
    row.appendChild(body);
    body.layoutGrow = 1;
    await para(kit, body, item, "Body", "text/primary");
  }
}
