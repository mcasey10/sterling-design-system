// Loan-pooling example checks, run by "Build example". Failures are logged as warnings starting with
// CHECK_FAILED, and main.ts counts them in the run notification ("example checks: N FAILED").
//   • Data consistency: consistencyProblems() in loanData.ts (totals, views, selections, column widths).
//   • Action triggers: every action in ACTIONS has a visible trigger on a screen or state frame.
//   • Grid layout: in every example grid, right-aligned header labels are flush with their values in every
//     row, and every numeric cell's content fits its column.
// Neither check reads descriptions or documentation text; those are for people only.

import { consistencyProblems } from "./loanData";
import { gridLayoutProblems, Dataset } from "../../library/components/grid";
import { warn } from "../../core/log";

/** Prefix for example check failures; main.ts counts them in the run notification. */
export const CHECK_FAILED = "Loan example check failed";

/**
 * Every action the example offers, with the label that triggers it. `trigger` matches the visible label;
 * `within` (a layer-name ancestor) narrows where it counts — e.g. Sign off must be in a bulk action bar,
 * not only in the dialog. Add any new action here, or the action-trigger check can't see it.
 */
export const ACTIONS: { name: string; trigger: RegExp; within?: string }[] = [
  { name: "Add to pool", trigger: /^Add to pool$/, within: "Bulk action bar" },
  { name: "Remove from pool", trigger: /^Remove from pool$/, within: "Bulk action bar" },
  { name: "Sign off", trigger: /^Sign off( \d+ exceptions?)?$/, within: "Bulk action bar" },
  { name: "Select all", trigger: /^Select all \d+/, within: "Bulk action bar" },
  { name: "Clear selection", trigger: /^Clear selection$/, within: "Bulk action bar" },
  { name: "Export", trigger: /^Export$/, within: "Bulk action bar" },
  { name: "Save draft", trigger: /^Save draft$/ },
  { name: "Submit pool", trigger: /^Submit pool$/ },
  { name: "Save view", trigger: /^Save view$/ },
  { name: "Add filter", trigger: /^Add filter$/ },
  { name: "Apply", trigger: /^Apply$/ },
  { name: "Reset", trigger: /^Reset$/ },
  { name: "Edit criteria", trigger: /^Edit criteria$/ },
  { name: "Cancel", trigger: /^Cancel$/ },
  { name: "Remove N loans", trigger: /^Remove \d+ loans?$/ },
];

/** Data consistency: logs each problem in loanData.ts as a failure. */
export function checkData() {
  for (const p of consistencyProblems()) warn(`${CHECK_FAILED} — data: ${p}`);
}

/** Grid layout: flush right-aligned headers and numeric content that fits its column, in every example grid. */
export function checkGridLayout(grids: [ComponentNode, Dataset][]) {
  for (const [grid, data] of grids) for (const p of gridLayoutProblems(grid, data)) warn(`${CHECK_FAILED} — layout: ${p}`);
}

/**
 * Action-trigger check: every action in ACTIONS must have a visible trigger on a screen or state frame.
 * Missing triggers are failures. Logs which actions were checked, so runs can be compared.
 */
export function checkActionTriggers(frames: FrameNode[]) {
  const visible = (n: BaseNode): boolean => {
    for (let x: BaseNode | null = n; x && x.type !== "PAGE"; x = x.parent) {
      if ("visible" in x && !(x as SceneNode).visible) return false;
    }
    return true;
  };
  const hasAncestor = (n: BaseNode, name: string) => {
    for (let x = n.parent; x && x.type !== "PAGE"; x = x.parent) if (x.name === name) return true;
    return false;
  };
  const labels: TextNode[] = [];
  for (const f of frames) labels.push(...(f.findAll((n) => n.type === "TEXT") as TextNode[]));
  for (const a of ACTIONS) {
    const found = labels.some((t) => a.trigger.test(t.characters) && visible(t) && (!a.within || hasAncestor(t, a.within)));
    if (!found) warn(`${CHECK_FAILED} — action: "${a.name}" has no visible trigger${a.within ? ` in a ${a.within}` : ""}`);
  }
  console.log(`[sterling] Action-trigger check — ${ACTIONS.length} actions checked: ${ACTIONS.map((a) => a.name).join(", ")}`);
}
