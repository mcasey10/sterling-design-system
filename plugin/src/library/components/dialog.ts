// Overlay/Dialog — modal container: Title + optional close button, a Body slot for each instance's
// content, and exposed Cancel / Primary buttons. Raised surface with a border (no shadow tokens yet).
// If slots aren't available to the plugin, Body is a plain frame and the run logs a warning.

import { Kit, color, space, configureFrame, frame, text } from "../../core/helpers";
import { ensureComponent, ensureFrame, ensureInstance, ensureText, ensureProp, prune, reference, setProps, variantOf } from "../../core/ensure";
import type { IconIndex } from "../icons";
import { warn } from "../../core/log";
import { describe } from "../docRegistry";

export const DIALOG_WIDTH = 480;

export async function buildDialog(
  kit: Kit,
  page: PageNode,
  parent: FrameNode,
  index: number,
  deps: { button: ComponentSetNode; iconButton: ComponentSetNode; icons: IconIndex }
): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, parent, index, "Overlay/Dialog",
    describe("Overlay/Dialog")
  );
  configureFrame(comp, {
    width: DIALOG_WIDTH,
    fill: color(kit, "surface/raised"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });

  const header = ensureFrame(
    comp, "Header",
    { direction: "HORIZONTAL", align: "CENTER", justify: "SPACE_BETWEEN", padding: { x: space(kit, "space/24"), y: space(kit, "space/16") }, fillWidth: true },
    0
  );
  const title = await ensureText(kit, header, "Title", "Dialog title", "Heading", "text/primary", 0);
  const close = await ensureInstance(header, "Close", variantOf(deps.iconButton, { Kind: "ghost", Size: "sm", State: "default" }), 1);
  setProps(close, { Icon: deps.icons.get("x")!.id, Label: "Close" });
  prune(header, [title, close]);

  // Body: a slot, so each instance places its own content.
  let body = comp.findChild((n) => n.name === "Body") as (FrameNode | SlotNode) | null;
  if (!body) {
    try {
      body = comp.createSlot();
      if (body.parent !== comp) comp.appendChild(body);
    } catch (e) {
      warn(`Overlay/Dialog: slots unavailable (${(e as Error).message}); Body is a plain frame.`);
      body = frame("Body", {});
      comp.appendChild(body);
    }
    body.name = "Body";
  }
  configureFrame(body as unknown as FrameNode, {
    gap: space(kit, "space/12"),
    padding: { x: space(kit, "space/24"), y: space(kit, "space/4") },
    fillWidth: true,
  });
  if (comp.children.indexOf(body) !== 1) comp.insertChild(1, body);
  if (body.children.length === 0) body.appendChild(await text(kit, "Dialog content", "Body", "text/secondary"));

  const footer = ensureFrame(
    comp, "Footer",
    { direction: "HORIZONTAL", align: "CENTER", justify: "MAX", gap: space(kit, "space/8"), padding: space(kit, "space/24"), fillWidth: true },
    2
  );
  const cancel = await ensureInstance(footer, "Cancel", variantOf(deps.button, { Kind: "secondary", Size: "md", State: "default" }), 0);
  setProps(cancel, { Label: "Cancel" });
  const primary = await ensureInstance(footer, "Primary", variantOf(deps.button, { Kind: "primary", Size: "md", State: "default" }), 1);
  setProps(primary, { Label: "Confirm" });
  for (const b of [cancel, primary]) if (!b.isExposedInstance) b.isExposedInstance = true;
  prune(footer, [cancel, primary]);
  prune(comp, [header, body, footer]);

  reference(comp, "Title", "characters", ensureProp(comp, "Title", "TEXT", "Dialog title"));
  reference(comp, "Close", "visible", ensureProp(comp, "Show close", "BOOLEAN", true));
  return comp;
}
