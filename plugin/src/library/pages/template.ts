// Template page: a blank, reusable 1440px desktop skeleton on a 12-column grid — app bar plus
// empty slots for filters (2 cols) | main content (8 cols) | summary (2 cols). No sample data:
// start a new screen by duplicating it and dropping Sterling components into the slots.
//
// Updated in place and never pruned, so layers you add inside it survive a rerun. The original
// frame is tracked by node ID, so duplicates are never touched.

import { Kit, size, color, space, configureFrame, pinMode, PLUGIN_KEY } from "../../core/helpers";
import { ensureFrame, ensureInstance, ensureText, setProps, variantOf } from "../../core/ensure";
import { COLLECTIONS } from "../../core/variables";
import { tokens } from "../../core/tokens";
import type { Library } from "./componentsPage";
import { kitLayoutGrid, hasKitGrid, columnSpan, SCREEN_WIDTH, SCREEN_HEIGHT } from "../../core/layout";
import { created, updated } from "../../core/log";

const ROOT_ID_KEY = "skeletonRootId";
const NAME = "Template/Desktop 1440";

async function findRoot(page: PageNode): Promise<FrameNode | null> {
  const id = page.getPluginData(ROOT_ID_KEY);
  if (!id) return null;
  const node = await figma.getNodeByIdAsync(id);
  return node && node.type === "FRAME" && node.parent === page ? node : null;
}

/** Dashed placeholder region with a centered label and hint. */
async function slot(kit: Kit, body: FrameNode, name: string, hint: string, index: number, width?: number) {
  const s = ensureFrame(
    body, `Slot/${name}`,
    {
      gap: space(kit, "space/4"),
      align: "CENTER",
      justify: "CENTER",
      padding: space(kit, "space/16"),
      width,
      stroke: color(kit, "border/strong"),
      radius: space(kit, "radius/md"),
    },
    index
  );
  if (s.dashPattern.join() !== "6,4") s.dashPattern = [6, 4];
  if (s.layoutSizingVertical !== "FILL") s.layoutSizingVertical = "FILL";
  if (width === undefined && s.layoutGrow !== 1) s.layoutGrow = 1;
  const title = await ensureText(kit, s, "Name", name, "Heading", "text/secondary", 0);
  const sub = await ensureText(kit, s, "Hint", hint, "Caption", "text/secondary", 1);
  for (const t of [title, sub]) if (t.textAlignHorizontal !== "CENTER") t.textAlignHorizontal = "CENTER";
  return s;
}

export async function buildTemplate(kit: Kit, page: PageNode, lib: Library): Promise<FrameNode> {
  let root = await findRoot(page);
  if (!root) {
    root = figma.createFrame();
    root.name = NAME;
    page.appendChild(root);
    page.setPluginData(ROOT_ID_KEY, root.id);
    created(NAME);
  } else {
    updated(NAME);
  }
  configureFrame(root, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: color(kit, "surface/background"), clip: true });
  if (root.getPluginData(PLUGIN_KEY) !== "template") root.setPluginData(PLUGIN_KEY, "template");
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");
  if (!hasKitGrid(kit, root)) root.layoutGrids = [kitLayoutGrid(kit)];

  // App bar with placeholder title and actions.
  const bar = ensureFrame(
    root, "App bar",
    {
      direction: "HORIZONTAL",
      align: "CENTER",
      justify: "SPACE_BETWEEN",
      height: size(kit, "size/56"),
      padding: { x: space(kit, "space/16") },
      fill: color(kit, "surface/panel"),
      stroke: color(kit, "border/default"),
      strokeSides: { bottom: 1 },
      fillWidth: true,
    },
    0
  );
  const title = ensureFrame(bar, "Title", { gap: space(kit, "space/2") }, 0);
  await ensureText(kit, title, "Name", "Screen title", "Heading", "text/primary", 0);
  await ensureText(kit, title, "Breadcrumb", "Section / Subsection", "Caption", "text/secondary", 1);
  const actions = ensureFrame(bar, "Actions", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/12") }, 1);
  const secondary = await ensureInstance(actions, "Secondary", variantOf(lib.button, { Kind: "secondary", Size: "md", State: "default" }), 0);
  setProps(secondary, { Label: "Secondary" });
  const primary = await ensureInstance(actions, "Primary", variantOf(lib.button, { Kind: "primary", Size: "md", State: "default" }), 1);
  setProps(primary, { Label: "Primary action" });

  // Workspace slots aligned to the 12-column grid.
  const body = ensureFrame(
    root, "Workspace",
    { direction: "HORIZONTAL", gap: space(kit, "space/16"), padding: space(kit, "space/16"), fillWidth: true },
    1
  );
  if (body.layoutSizingVertical !== "FILL") body.layoutSizingVertical = "FILL";
  await slot(kit, body, "Filters", "2 columns · inputs, selects, filter chips", 0, columnSpan(2));
  await slot(kit, body, "Main content", "8 columns · tabs, applied filters, bulk action bar, data grid, pagination", 1);
  await slot(kit, body, "Summary", "2 columns · summary metrics, details", 2, columnSpan(2));
  return root;
}
