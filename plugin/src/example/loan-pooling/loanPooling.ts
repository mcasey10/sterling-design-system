// "Example: Loan pooling" page — an example built with Sterling, for one product brief. Everything
// loan-specific lives here (and in loanData.ts), not on the Components page:
//   • Example components frame: _Example/Pool loan row, _Example/Pool loans grid, _Example/Exceptions
//     grid, _Example/Candidate row, _Example/Candidate grid, _Example/Pool action bar (updated in place;
//     the leading underscore hides them from publishing).
//   • Two 1440px screens, updated in place and tracked by node ID: Pool loans (the pool's own loans)
//     and Add loans (candidates for the pool).
//   • Developer annotations on the Pool loans screen, from the table in annotations.ts.
//   • "Example states": Pool loans — filtered, View menu (open), Sign off dialog. Rebuilt each run.
//   • "About this example": brief, workflows, rules, filter model, steps, assumptions. Rebuilt each run.
// The workflow, rules and counts are defined in loanData.ts; see the header comment there.

import { Kit, size, color, space, configureFrame, pinMode, setSize, takeOver, frame, text, PLUGIN_KEY } from "../../core/helpers";
import {
  ensureFrame, ensureInstance, ensureText, ensureComponentSet, setProps, tintIcon, variantOf, nested, prune,
} from "../../core/ensure";
import { COLLECTIONS } from "../../core/variables";
import { SCREEN_WIDTH, SCREEN_HEIGHT, columnSpan, kitLayoutGrid, hasKitGrid } from "../../core/layout";
import { tokens } from "../../core/tokens";
import { rowSpec, buildGrid, gridWidth } from "../../library/components/grid";
import { buildBulkActionBar, BarSpec } from "../../library/components/bulkActionBar";
import { DESCRIPTION_MENU_WIDTH } from "../../library/components/menu";
import { para, docSection, definitions, steps, stageDiagram, docTable, flowDiagram, badgeSteps } from "../../core/docBlocks";
import type { Library } from "../../library/pages/componentsPage";
import { toolbar, filterPanel, viewMenu, card, linkRow } from "../../library/compositions";
import {
  POOL, COUNTS, RULES, VIEWS, FILTER_MODEL, FILTER_FIELDS, ASSUMPTIONS, POOL_DATA, EXCEPTIONS_DATA, CANDIDATE_DATA,
  SIGN_OFF_LOAN, SELECTED_POOL_LOANS, CONTEXT, BAR_STATE_A, exceptionsIn, viewExceptions, signOffLabel, removeLabel,
  SIGN_OFF_HINT, SUBMITTED_DATA, POOL_STATE_A_DATA, POOL_STATE_B_DATA, POOL_VIEW, EXCEPTIONS_VIEW, CANDIDATE_VIEW, filteredAddable, MAIN_WIDTH, Filter,
  poolTotal, candidateTotal, issueCount, pages, preview, millions, classify, PAGE_SIZE,
} from "./loanData";
import { checkData, checkActionTriggers, checkGridLayout, checkAnnotations } from "./checks";
import { applyAnnotations } from "./annotations";
import { created, updated, warn } from "../../core/log";

const WIDTH = SCREEN_WIDTH;
const HEIGHT = SCREEN_HEIGHT;
const span = columnSpan;
const GAP = 80;

/** The example's page; it follows the library's pages. */
export const EXAMPLE_PAGE = "Example: Loan pooling";
/** Page plugin-data key that tracks the Pool loans screen's root frame. */
const EXAMPLE_ROOT_KEY = "poolLoansRootId";
const HOLDER = "Example components";
const ABOUT = "About this example";
const STATES = "Example states";
const ADD_ROOT_KEY = "addLoansRootId";
const NAMES = {
  poolRow: "_Example/Pool loan row",
  poolGrid: "_Example/Pool loans grid",
  exceptionRow: "_Example/Exception row",
  exceptionsGrid: "_Example/Exceptions grid",
  candidateRow: "_Example/Candidate row",
  candidateGrid: "_Example/Candidate grid",
  stateAGrid: "_Example/Pool loans grid · exception selected",
  stateBGrid: "_Example/Pool loans grid · all selected",
  submittedRow: "_Example/Submitted row",
  submittedGrid: "_Example/Submitted grid",
  bar: "_Example/Pool action bar",
};

export const POOL_BAR: BarSpec = {
  name: NAMES.bar,
  description:
    "Loan-pooling action bar. Pool loans tab: Sign off (acts on the selected Exception loans and shows the count, e.g. " +
    "\"Sign off 1 exception\"; disabled with the hint \"No Exception loans selected\" when there are none) and Remove from " +
    "pool (secondary — reversible, loans return to Available; asks for confirmation only when all matching loans are " +
    "selected). Add loans tab: Add to pool (Eligible or Exception candidates). Show select all hides the link once all " +
    "matching rows are selected.",
  count: "1 selected",
  selectAll: `Select all ${poolTotal()} pool loans`,
  actions: [
    { name: "Clear", label: "Clear selection", variant: "ghost" },
    { name: "Export", label: "Export", variant: "secondary" },
    {
      name: "Sign off", label: "Sign off", variant: "secondary", icon: "check",
      toggle: { prop: "Show sign off", default: false },
    },
    // Secondary, not danger: removal is reversible (loans return to Available).
    { name: "Remove", label: "Remove from pool", variant: "secondary", toggle: { prop: "Show remove", default: true } },
    { name: "Add", label: "Add to pool", variant: "primary", toggle: { prop: "Show add", default: true } },
  ],
  hint: SIGN_OFF_HINT,
};

/**
 * Configures a pool bar instance for a selection: the count text, Select all (or hidden once all are selected),
 * which actions show, and Sign off's label / disabled state / hint from the number of selected exceptions.
 */
function setBar(
  bar: InstanceNode,
  o: { count: string; selectAll?: string; tab: "pool" | "add"; exceptions?: number }
) {
  setProps(bar, {
    Count: o.count,
    "Show select all": !!o.selectAll,
    ...(o.selectAll ? { "Select all": o.selectAll } : {}),
    "Show add": o.tab === "add",
    "Show remove": o.tab === "pool",
    "Show sign off": o.tab === "pool",
    "Show hint": o.tab === "pool" && !o.exceptions,
  });
  const signOff = nested(bar, "Sign off");
  if (signOff && o.tab === "pool") {
    setProps(signOff, { Label: signOffLabel(o.exceptions ?? 0), State: o.exceptions ? "default" : "disabled" });
  }
}

// ------------------------------------------------------------ Shared helpers

async function setText(inst: InstanceNode, layer: string, chars: string) {
  const t = inst.findOne((n) => n.type === "TEXT" && n.name === layer) as TextNode | null;
  if (!t || t.characters === chars) return;
  await figma.loadFontAsync(t.fontName as FontName);
  t.characters = chars;
}

function fillWidth(node: SceneNode & LayoutMixin) {
  if (node.layoutSizingHorizontal !== "FILL") node.layoutSizingHorizontal = "FILL";
}

function ensureHolder(kit: Kit, page: PageNode): FrameNode {
  let holder = page.children.find((n) => n.name === HOLDER && n.type === "FRAME") as FrameNode | undefined;
  if (!holder) {
    holder = figma.createFrame();
    holder.name = HOLDER;
    page.appendChild(holder);
    holder.x = 0;
    holder.y = HEIGHT + 160;
    created(`${HOLDER} frame`);
  }
  configureFrame(holder, {
    gap: space(kit, "space/24"),
    padding: space(kit, "space/48"),
    fill: color(kit, "surface/background"),
  });
  pinMode(kit, holder, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, holder, COLLECTIONS.density, "Default");
  return holder;
}

// ------------------------------------------------------------ Screen parts

type Tab = "pool" | "add";

/** Header: breadcrumb, title + Draft chip, criteria line with Edit criteria; issues, Save draft, Submit pool. */
async function header(kit: Kit, lib: Library, root: FrameNode) {
  const bar = ensureFrame(
    root, "Header",
    {
      direction: "HORIZONTAL",
      align: "CENTER",
      justify: "SPACE_BETWEEN",
      padding: { x: space(kit, "space/16"), y: space(kit, "space/12") },
      fill: color(kit, "surface/panel"),
      stroke: color(kit, "border/default"),
      strokeSides: { bottom: 1 },
      fillWidth: true,
    },
    0
  );
  const title = ensureFrame(bar, "Title", { gap: space(kit, "space/4") }, 0);
  // Breadcrumb and title share one line ("Pools / Pool 2026-07"), so the pool's name appears once.
  const titleRow = ensureFrame(title, "Title row", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") }, 0);
  const crumb = await ensureInstance(titleRow, "Breadcrumb", variantOf(lib.link, { Size: "md", State: "default" }), 0);
  setProps(crumb, { Label: POOL.breadcrumb });
  const slash = await ensureText(kit, titleRow, "Separator", "/", "Body", "text/secondary", 1);
  const name = await ensureText(kit, titleRow, "Name", POOL.name, "Title", "text/primary", 2);
  const chip = await ensureInstance(titleRow, "Pool state", variantOf(lib.chip, { Tone: "neutral" }), 3);
  setProps(chip, { Label: POOL.state });
  prune(titleRow, [crumb, slash, name, chip]);
  const criteria = ensureFrame(title, "Criteria", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/6") }, 1);
  const criteriaText = await ensureText(
    kit, criteria, "Text", `Criteria: ${POOL.criteria} · target ${millions(POOL.targetM)} ·`, "Caption", "text/secondary", 0
  );
  const edit = await ensureInstance(criteria, "Edit criteria", variantOf(lib.link, { Size: "sm", State: "default" }), 1);
  setProps(edit, { Label: "Edit criteria" });
  prune(criteria, [criteriaText, edit]);
  prune(title, [titleRow, criteria]);

  const actions = ensureFrame(bar, "Actions", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/12") }, 1);
  // Submit pool stays disabled until the pool has 0 issues; the count says why.
  const blockers = ensureFrame(actions, "Blockers", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/4") }, 0);
  const warnIcon = await ensureInstance(blockers, "Icon", lib.icons.get("alert-triangle")!, 0);
  setSize(warnIcon, size(kit, "size/16"), size(kit, "size/16"));
  tintIcon(warnIcon, color(kit, "status/warning-strong"));
  await ensureText(kit, blockers, "Text", `${issueCount()} pool issues`, "Label", "status/warning-strong", 1);
  const save = await ensureInstance(actions, "Save draft", variantOf(lib.button, { Kind: "secondary", Size: "md", State: "default" }), 1);
  setProps(save, { Label: "Save draft" });
  const submit = await ensureInstance(actions, "Submit", variantOf(lib.button, { Kind: "primary", Size: "md", State: "disabled" }), 2);
  setProps(submit, { Label: "Submit pool" });
}

async function tabs(kit: Kit, lib: Library, parent: FrameNode, index: number, active: Tab) {
  const row = ensureFrame(
    parent, "Tabs",
    { direction: "HORIZONTAL", stroke: color(kit, "border/default"), strokeSides: { bottom: 1 }, fillWidth: true },
    index
  );
  const items: [string, string, string, Tab][] = [
    ["Pool loans", "Pool loans", String(poolTotal()), "pool"],
    ["Add loans", "Add loans", `${candidateTotal()} candidates`, "add"],
  ];
  const keep: SceneNode[] = [];
  for (const [i, [layer, label, count, tab]] of items.entries()) {
    const t = await ensureInstance(row, layer, variantOf(lib.tab, { State: tab === active ? "selected" : "default" }), i);
    setProps(t, { Label: label, Count: count, "Show count": true });
    keep.push(t);
  }
  prune(row, keep);
}

/** Panel field values for a view's filters (e.g. { Lender: "Harbor Point" }), so panel and chips match. */
function panelValues(filters: Pick<Filter<never>, "field" | "panel">[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const f of filters) values[f.field] = f.panel;
  return values;
}

/** "· N filter(s)" for footers. */
const filterCount = (n: number) => (n ? ` · ${n} filter${n === 1 ? "" : "s"}` : "");

const FILTER_TITLES: Record<Tab, string> = { pool: "Filter pool loans", add: "Filter candidates" };

/**
 * This tab's filter panel (2 of 12 columns): the shared filter panel with the tab's title and fields. It
 * filters the grid only — pool criteria stay in the header. `values` fills fields (e.g. a chosen view).
 */
const loanFilterPanel = (kit: Kit, lib: Library, parent: FrameNode, index: number, tab: Tab, values: Record<string, string> = {}) =>
  filterPanel(kit, lib, parent, index, FILTER_TITLES[tab], FILTER_FIELDS[tab], values, span(2));

/** Warns if a grid doesn't exactly fill the grid area (Lender is the flexible column). */
function checkFill(area: FrameNode, grid: InstanceNode) {
  if (Math.abs(grid.width - area.width) > 0.5) {
    warn(`Loan example layout: "${grid.name}" is ${grid.width.toFixed(1)}px but the grid area is ${area.width.toFixed(1)}px.`);
  }
}

async function upbMetric(kit: Kit, lib: Library, parent: FrameNode, name: string, index: number, label: string, upbM: number, detail: string) {
  const inst = await ensureInstance(parent, name, variantOf(lib.summaryMetric, { Status: "normal", State: "default" }), index);
  fillWidth(inst);
  setProps(inst, { Label: label, "Show progress": true });
  await setText(inst, "Value", millions(upbM));
  await setText(inst, "Detail", detail);
  // Bar length = share of target (the component's description says to resize the Bar layer).
  const track = inst.findOne((n) => n.name === "Progress") as FrameNode | null;
  const bar = inst.findOne((n) => n.name === "Bar") as RectangleNode | null;
  if (track && bar) {
    const w = Math.round(track.width * Math.min(upbM / POOL.targetM, 1));
    if (Math.abs(bar.width - w) > 0.5) bar.resize(w, bar.height);
  }
  return inst;
}

// ------------------------------------------------------------ Pool loans tab

async function poolPanel(kit: Kit, lib: Library, body: FrameNode) {
  const panel = ensureFrame(body, "Summary panel", { gap: space(kit, "space/12"), width: span(2) }, 2);
  const title = await ensureText(kit, panel, "Title", "Pool summary", "Heading", "text/primary", 0);
  const metric = await upbMetric(kit, lib, panel, "Committed UPB", 1, "Pool UPB", POOL.upbM,
    `${Math.round((POOL.upbM / POOL.targetM) * 100)}% of ${millions(POOL.targetM)} target`);

  const byStatus = card(kit, panel, "Loans by status", 2);
  const sTitle = await ensureText(kit, byStatus, "Title", "Loans by status", "Label", "text/secondary", 0);
  const links = await linkRow(kit, lib, byStatus, "Links",
    (Object.entries(COUNTS.pool) as [string, number][]).map(([s, n]) => `${n} ${s}`), 1);
  const sNote = await ensureText(kit, byStatus, "Note", "Each adds a Status filter.", "Caption", "text/secondary", 2);
  prune(byStatus, [sTitle, links, sNote]);

  const issues = card(kit, panel, "Issues", 3);
  const head = ensureFrame(issues, "Heading", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/4") }, 0);
  const icon = await ensureInstance(head, "Icon", lib.icons.get("alert-triangle")!, 0);
  setSize(icon, size(kit, "size/16"), size(kit, "size/16"));
  tintIcon(icon, color(kit, "status/warning-strong"));
  const hText = await ensureText(kit, head, "Text", `Issues blocking submit (${issueCount()})`, "Body-strong", "status/warning-strong", 1);
  prune(head, [icon, hText]);
  const limit = COUNTS.limitBreaches[0];
  const groups: [string, string, string][] = [
    ["Exceptions", `Exceptions needing sign-off (${COUNTS.pool.Exception})`, "Filter: Status is Exception"],
    ["Limits", `Limits (${COUNTS.limitBreaches.length}): ${limit.lender} at ${limit.share}% (cap ${limit.cap}%)`, `Filter: Lender is ${limit.lender}`],
  ];
  const keep: SceneNode[] = [head];
  for (const [i, [layer, label, linkLabel]] of groups.entries()) {
    const g = ensureFrame(issues, layer, { gap: space(kit, "space/2"), fillWidth: true }, i + 1);
    const t = await ensureText(kit, g, "Text", label, "Body", "text/primary", 0);
    t.layoutSizingHorizontal = "FILL";
    const l = await ensureInstance(g, "Link", variantOf(lib.link, { Size: "sm", State: "default" }), 1);
    setProps(l, { Label: linkLabel });
    prune(g, [t, l]);
    keep.push(g);
  }
  prune(issues, keep);
  prune(panel, [title, metric, byStatus, issues]);
}

async function poolTab(kit: Kit, lib: Library, body: FrameNode, poolGrid: ComponentNode, poolBar: ComponentNode) {
  await loanFilterPanel(kit, lib, body, 0, "pool", panelValues(POOL_VIEW.filters));
  const area = ensureFrame(body, "Grid area", { gap: space(kit, "space/12") }, 1);
  if (area.layoutGrow !== 1) area.layoutGrow = 1;
  await tabs(kit, lib, area, 0, "pool");
  await toolbar(kit, lib, area, 1, POOL_VIEW.name, POOL_VIEW.filters.map((f) => f.chip), POOL_VIEW.edited);
  const w = MAIN_WIDTH;
  // Three Ready loans selected → Remove from pool; Sign off is disabled (it applies only to Exception loans).
  const bulk = await ensureInstance(area, "Bulk action bar", poolBar, 2);
  setSize(bulk, w, bulk.height);
  // No exceptions in the selection → Sign off shows disabled, with the hint.
  setBar(bulk, {
    count: `${SELECTED_POOL_LOANS.length} selected`, selectAll: `Select all ${POOL_VIEW.total} matching`, tab: "pool",
    exceptions: exceptionsIn(SELECTED_POOL_LOANS.map((l) => l.id)),
  });
  const grid = await ensureInstance(area, "Loan grid", poolGrid, 3);
  const pager = await ensureInstance(area, "Pagination", lib.pagination, 4);
  setSize(pager, w, pager.height);
  setProps(pager, {
    Range: `Showing 1–${PAGE_SIZE} of ${POOL_VIEW.total} pool loans${filterCount(POOL_VIEW.filters.length)}`,
    Page: `Page 1 of ${pages(POOL_VIEW.total)}`,
  });
  // Check the grid fills its area only once the side panel exists; until then the area spans the panel's columns too.
  await poolPanel(kit, lib, body);
  checkFill(area, grid);
}

// ------------------------------------------------------------ Add loans tab

async function addPanel(kit: Kit, lib: Library, body: FrameNode) {
  const panel = ensureFrame(body, "Summary panel", { gap: space(kit, "space/12"), width: span(2) }, 2);
  const title = await ensureText(kit, panel, "Title", "Candidates", "Heading", "text/primary", 0);

  const byElig = card(kit, panel, "Candidates by eligibility", 1);
  const eTitle = await ensureText(kit, byElig, "Title", "Candidates by eligibility", "Label", "text/secondary", 0);
  const links = await linkRow(kit, lib, byElig, "Links",
    (Object.entries(COUNTS.candidates) as [string, number][]).map(([s, n]) => `${n} ${s}`), 1);
  const eNote = await ensureText(kit, byElig, "Note", "Each adds an Eligibility filter. Ineligible loans can't be added.", "Caption", "text/secondary", 2);
  eNote.layoutSizingHorizontal = "FILL";
  prune(byElig, [eTitle, links, eNote]);

  const p = preview();
  // The metric is already a card, so the preview group itself has no border.
  const previewCard = ensureFrame(panel, "Preview", { gap: space(kit, "space/8"), fillWidth: true }, 2);
  const pTitle = await ensureText(kit, previewCard, "Title", `If you add the ${p.count} selected`, "Label", "text/secondary", 0);
  const metric = await upbMetric(kit, lib, previewCard, "UPB after", 1, "Pool UPB", p.upbM,
    `+${millions(p.addM)} · ${p.pct}% of ${millions(POOL.targetM)} target`);
  const exc = await ensureText(kit, previewCard, "Exceptions", `Exceptions in pool ${p.exceptionsBefore} → ${p.exceptionsAfter}`, "Body", "text/primary", 2);
  const pNote = await ensureText(kit, previewCard, "Note", "Preview only — nothing changes until Add to pool.", "Caption", "text/secondary", 3);
  pNote.layoutSizingHorizontal = "FILL";
  prune(previewCard, [pTitle, metric, exc, pNote]);
  prune(panel, [title, byElig, previewCard]);
}

async function addTab(kit: Kit, lib: Library, body: FrameNode, candidateGrid: ComponentNode, poolBar: ComponentNode) {
  await loanFilterPanel(kit, lib, body, 0, "add", panelValues(CANDIDATE_VIEW.filters));
  const area = ensureFrame(body, "Grid area", { gap: space(kit, "space/12") }, 1);
  if (area.layoutGrow !== 1) area.layoutGrow = 1;
  await tabs(kit, lib, area, 0, "add");
  await toolbar(kit, lib, area, 1, `${CANDIDATE_VIEW.name}${CANDIDATE_VIEW.edited ? " · edited" : ""}`,
    CANDIDATE_VIEW.filters.map((f) => f.chip), CANDIDATE_VIEW.edited);
  const w = MAIN_WIDTH;
  // 1 Eligible + 1 Exception selected → Add to pool. Ineligible loans can't be selected.
  const bulk = await ensureInstance(area, "Bulk action bar", poolBar, 2);
  setSize(bulk, w, bulk.height);
  setBar(bulk, { count: `${preview().count} selected`, selectAll: `Select all ${filteredAddable()} addable`, tab: "add" });
  const grid = await ensureInstance(area, "Candidate grid", candidateGrid, 3);
  const pager = await ensureInstance(area, "Pagination", lib.pagination, 4);
  setSize(pager, w, pager.height);
  setProps(pager, {
    Range: `Showing 1–${PAGE_SIZE} of ${CANDIDATE_VIEW.total} candidates${filterCount(CANDIDATE_VIEW.filters.length)}`,
    Page: `Page 1 of ${pages(CANDIDATE_VIEW.total)}`,
  });
  // Check the grid fills its area only once the side panel exists; until then the area spans the panel's columns too.
  await addPanel(kit, lib, body);
  checkFill(area, grid);
}

// ------------------------------------------------------------ Screens

async function findRoot(page: PageNode, key: string): Promise<FrameNode | null> {
  const id = page.getPluginData(key);
  if (!id) return null;
  const node = await figma.getNodeByIdAsync(id);
  return node && node.type === "FRAME" && node.parent === page ? node : null;
}

async function buildScreen(
  kit: Kit, page: PageNode, lib: Library, tab: Tab,
  parts: { poolGrid: ComponentNode; candidateGrid: ComponentNode; poolBar: ComponentNode },
  placeAfter?: FrameNode
): Promise<{ root: FrameNode; isNew: boolean }> {
  const key = tab === "pool" ? EXAMPLE_ROOT_KEY : ADD_ROOT_KEY;
  const name = tab === "pool" ? "Example/Loan pooling 1440" : "Example/Add loans 1440";
  let root = await findRoot(page, key);
  const isNew = !root;
  if (!root) {
    root = figma.createFrame();
    root.name = name;
    page.appendChild(root);
    if (placeAfter) {
      root.x = placeAfter.x + placeAfter.width + GAP;
      root.y = placeAfter.y;
    }
    page.setPluginData(key, root.id);
    created(name);
  } else {
    updated(name);
  }
  configureFrame(root, { width: WIDTH, height: HEIGHT, fill: color(kit, "surface/background"), clip: true });
  if (root.getPluginData(PLUGIN_KEY) !== "template") root.setPluginData(PLUGIN_KEY, "template");
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");
  if (!hasKitGrid(kit, root)) root.layoutGrids = [kitLayoutGrid(kit)];

  await header(kit, lib, root);
  // Workspace: filter panel (2 cols) | grid area (8 cols) | summary panel (2 cols).
  const body = ensureFrame(
    root, "Workspace",
    { direction: "HORIZONTAL", gap: space(kit, "space/16"), padding: space(kit, "space/16"), fillWidth: true },
    1
  );
  if (body.layoutSizingVertical !== "FILL") body.layoutSizingVertical = "FILL";
  if (tab === "pool") await poolTab(kit, lib, body, parts.poolGrid, parts.poolBar);
  else await addTab(kit, lib, body, parts.candidateGrid, parts.poolBar);
  return { root, isNew };
}

// ------------------------------------------------------------ Example states (rebuilt each run)

async function stateFrame(kit: Kit, parent: FrameNode, title: string, caption: string): Promise<FrameNode> {
  const f = frame(title, {
    gap: space(kit, "space/12"),
    padding: space(kit, "space/24"),
    fill: color(kit, "surface/background"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  parent.appendChild(f);
  f.appendChild(await text(kit, title, "Title"));
  const c = await text(kit, caption, "Caption", "text/secondary");
  f.appendChild(c);
  return f;
}

async function buildStates(
  kit: Kit, page: PageNode, lib: Library,
  parts: {
    exceptionsGrid: ComponentNode; stateAGrid: ComponentNode; stateBGrid: ComponentNode; poolBar: ComponentNode; submittedGrid: ComponentNode;
  },
  at: { x: number; y: number }, keepPosition: boolean
): Promise<FrameNode> {
  const { exceptionsGrid } = parts;
  const pos = takeOver(page, STATES);
  const root = frame(STATES, { gap: space(kit, "space/48"), padding: space(kit, "space/48"), fill: color(kit, "surface/background") });
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");
  page.appendChild(root);
  root.x = pos && keepPosition ? pos.x : at.x;
  root.y = pos && keepPosition ? pos.y : at.y;
  root.appendChild(await text(kit, STATES, "Display"));

  // 1. Pool loans — filtered: filter panel + grid area, in sync with the chosen view.
  const view = EXCEPTIONS_VIEW;
  const chip = view.filters[0].chip;
  const filtered = await stateFrame(kit, root, "Pool loans — filtered",
    `Choosing the view "${view.name}" filled both the panel (Status = Exception) and the chip "${chip}". ` +
      "Removing the chip clears the Status field. The view also adds the Sign-off note column.");
  const layout = frame("Layout", { direction: "HORIZONTAL", gap: space(kit, "space/16"), align: "MIN" });
  filtered.appendChild(layout);
  await loanFilterPanel(kit, lib, layout, 0, "pool", panelValues(view.filters));
  const area = frame("Grid area", { gap: space(kit, "space/12"), width: MAIN_WIDTH });
  layout.appendChild(area);
  await toolbar(kit, lib, area, 0, view.name, [chip], view.edited);
  const exGrid = exceptionsGrid.createInstance();
  area.appendChild(exGrid);
  const pager = lib.pagination.createInstance();
  area.appendChild(pager);
  setSize(pager, MAIN_WIDTH, pager.height);
  setProps(pager, { Range: `Showing ${view.total} of ${poolTotal()} pool loans${filterCount(view.filters.length)}`, Page: "Page 1 of 1" });
  const next = nested(pager, "Next");
  if (next) setProps(next, { State: "disabled" });
  checkFill(area, exGrid);

  // States read top to bottom as a flow: filtered → View menu → a → Sign off dialog → b → b2 → c → d.
  const row = root;

  // 2. View menu (open): trigger + grouped menu with each view's filter.
  const menuFrame = await stateFrame(kit, row, "View menu (open)", "Predefined and saved views; each shows its filter set in muted text.");
  const triggerRow = frame("Trigger", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") });
  menuFrame.appendChild(triggerRow);
  triggerRow.appendChild(await text(kit, "View", "Label", "text/secondary"));
  const trigger = variantOf(lib.select, { State: "focus", Content: "value" }).createInstance();
  triggerRow.appendChild(trigger);
  setSize(trigger, 200, trigger.height);
  setProps(trigger, { Label: "View", Value: POOL_VIEW.name, "Show label": false, "Show helper": false });
  // Wider than the components' 280px default so the descriptions (filter + extra column) don't truncate.
  viewMenu(
    kit, lib, menuFrame,
    [{ heading: "Predefined", views: VIEWS.pool }, { heading: "Saved by me", views: VIEWS.saved }],
    DESCRIPTION_MENU_WIDTH + 80
  );

  // a. One exception selected → Sign off enabled with the count.
  const a = await stateFrame(kit, root, "Bulk action bar — a. Exception selected",
    `${BAR_STATE_A.join(" and ")} selected (1 Exception, 1 Ready). Sign off acts only on the exception and shows the count; ` +
      "it opens the Sign off dialog below.");
  const barA = parts.poolBar.createInstance();
  barA.name = "Bulk action bar";
  a.appendChild(barA);
  setSize(barA, MAIN_WIDTH, barA.height);
  setBar(barA, {
    count: `${BAR_STATE_A.length} selected`, selectAll: `Select all ${POOL_VIEW.total} matching`, tab: "pool",
    exceptions: exceptionsIn(BAR_STATE_A),
  });
  a.appendChild(parts.stateAGrid.createInstance());

  // 3. Sign off dialog (opened from state a).
  const dialogFrame = await stateFrame(kit, root, "Sign off dialog",
    `Opened from the bulk action bar's "${signOffLabel(exceptionsIn(BAR_STATE_A))}" (state a). The note is required.`);
  const dialog = lib.dialog.createInstance();
  dialogFrame.appendChild(dialog);
  setProps(dialog, { Title: signOffLabel(exceptionsIn(BAR_STATE_A)), "Show close": true });
  const primary = nested(dialog, "Primary");
  if (primary) setProps(primary, { Label: "Sign off", State: "disabled" });
  const cancel = nested(dialog, "Cancel");
  if (cancel) setProps(cancel, { Label: "Cancel" });
  const loan = SIGN_OFF_LOAN;
  const reason = classify(loan.fico, loan.ltv).failing.map((f) => f.text).join("; ");
  try {
    const body = dialog.findOne((n) => n.name === "Body") as FrameNode | null;
    if (!body) throw new Error("no Body");
    for (const c of [...body.children]) c.remove();
    const line = await text(kit, `${loan.id} · ${loan.lender} · ${reason}`, "Body", "text/primary");
    body.appendChild(line);
    const field = variantOf(lib.textInput, { State: "focus", Content: "placeholder" }).createInstance();
    body.appendChild(field);
    fillWidth(field);
    setProps(field, {
      Label: "Sign-off note (required)",
      Placeholder: "Why this exception is acceptable (e.g., compensating factor)",
      Helper: "Saved with your name and the date.",
      "Show helper": true,
    });
  } catch (e) {
    warn(`Sign off dialog: couldn't fill the Body slot (${(e as Error).message}).`);
  }

  // b. All matching selected: the count says so and Select all is hidden.
  const b = await stateFrame(kit, root, `Bulk action bar — b. All ${POOL_VIEW.total} matching selected`,
    `After Select all ${POOL_VIEW.total} matching. ${viewExceptions()} of them is an Exception, so Sign off shows the count. ` +
      "Remove from pool asks for confirmation (b2) because the selection goes beyond this page.");
  const barB = parts.poolBar.createInstance();
  barB.name = "Bulk action bar";
  b.appendChild(barB);
  setSize(barB, MAIN_WIDTH, barB.height);
  setBar(barB, { count: `All ${POOL_VIEW.total} matching selected`, tab: "pool", exceptions: viewExceptions() });
  b.appendChild(parts.stateBGrid.createInstance());

  // b2. Confirmation, only when all matching loans are selected.
  const b2 = await stateFrame(kit, root, "Bulk action bar — b2. Confirm removing all matching",
    "Removal is reversible, so Remove from pool doesn't ask for confirmation, except when all matching loans are selected.");
  const confirm = lib.dialog.createInstance();
  b2.appendChild(confirm);
  setProps(confirm, { Title: `Remove ${POOL_VIEW.total} loans from ${POOL.name}?`, "Show close": true });
  const confirmPrimary = nested(confirm, "Primary");
  if (confirmPrimary) setProps(confirmPrimary, { Label: removeLabel(POOL_VIEW.total), State: "default" });
  const confirmCancel = nested(confirm, "Cancel");
  if (confirmCancel) setProps(confirmCancel, { Label: "Cancel" });
  try {
    const body = confirm.findOne((n) => n.name === "Body") as FrameNode | null;
    if (!body) throw new Error("no Body");
    for (const c of [...body.children]) c.remove();
    body.appendChild(await text(kit, "They return to Available.", "Body", "text/primary"));
  } catch (e) {
    warn(`Remove confirmation: couldn't fill the Body slot (${(e as Error).message}).`);
  }

  // c. Add loans bar.
  const c = await stateFrame(kit, root, "Bulk action bar — c. Add loans",
    "Candidates selected on Add loans. Ineligible loans can't be selected, so Select all counts only addable loans.");
  const barC = parts.poolBar.createInstance();
  barC.name = "Bulk action bar";
  c.appendChild(barC);
  setSize(barC, MAIN_WIDTH, barC.height);
  setBar(barC, { count: `${preview().count} selected`, selectAll: `Select all ${filteredAddable()} addable`, tab: "add" });

  // d. Submitted pool: read-only — no checkboxes, no bar, no Save draft / Submit pool.
  const d = await stateFrame(kit, root, "Submitted pool (read-only)",
    "After Submit pool (with 0 issues). The pool is read-only: no checkboxes, no bulk action bar. Illustrative rows.");
  const head = frame("Header", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") });
  d.appendChild(head);
  head.appendChild(await text(kit, POOL.name, "Title", "text/primary"));
  const submittedChip = variantOf(lib.chip, { Tone: "positive" }).createInstance();
  head.appendChild(submittedChip);
  setProps(submittedChip, { Label: "Submitted" });
  head.appendChild(await text(kit, "Submitted · read-only", "Caption", "text/secondary"));
  d.appendChild(parts.submittedGrid.createInstance());
  return root;
}

// ------------------------------------------------------------ About this example

const RULE_ROWS: string[][] = [
  ["Eligible", RULES.eligible, "Meets credit standards.",
    "Status Ready (positive chip); cells normal; Exception and Sign-off note show \"—\".",
    "Eligibility Eligible (positive chip); selectable."],
  ["Exception", RULES.exception, "Close to a standard; acceptable with a recorded decision.",
    "Status Exception (warning chip); the failing cell uses the warning state (⚠); Exception states the threshold " +
      "(\"FICO 672 — below 680\"); note \"Needs sign-off\". After Sign off: Status Signed off (info chip), cells normal, " +
      "Exception text muted (kept for audit), note \"<note> · <name> · <date>\".",
    "Eligibility Exception (warning chip); failing cell warning (⚠); selectable — joins the pool as Exception."],
  ["Ineligible", RULES.ineligible, "Outside risk tolerance; can't be added.",
    "Never in a pool (can't be added).",
    "Eligibility Ineligible (critical chip); failing cells use the error state (⊗); checkbox disabled; row muted."],
  ["Lender limit", RULES.limit, "Avoids depending on one lender.",
    `A breach is one issue: Pool summary → Issues → Limits, with a link that filters to the lender.`,
    "The preview shows the pool after adding, before anything changes."],
];

const SCREEN_STEPS = [
  `Switch tabs: Pool loans (${poolTotal()}) shows the pool's own loans; Add loans (${candidateTotal()} candidates) shows ` +
    "purchased loans not yet in any pool that meet the criteria. [Pool loans, Add loans]",
  "Filter the grid: choose a view from the View menu, or set fields in the filter panel (+ Add filter for any other " +
    "column) and Apply. Applied filters show as chips; removing a chip clears its field. Pool loans opens the saved view " +
    `"${POOL_VIEW.name}" (${POOL_VIEW.filters[0].chip}: ${POOL_VIEW.total} of ${poolTotal()} loans). On Add loans, the ` +
    `view "${CANDIDATE_VIEW.name}" was edited with two filters, so it reads "· edited" and Save view is enabled ` +
    `(${CANDIDATE_VIEW.total} of ${candidateTotal()} candidates). [Pool loans, Add loans, View menu (open), Pool loans — filtered]`,
  "Add candidates: on Add loans, select Eligible or Exception loans and choose Add to pool. The side panel previews the " +
    "result first; Ineligible loans can't be selected. [Add loans]",
  "Resolve exceptions: choose the view Exceptions to sign off (it adds the Sign-off note column), select Exception " +
    "loans and choose Sign off N exceptions in the bulk action bar (disabled, with \"No Exception loans selected\", when " +
    "none are selected), add the required note, and confirm; or Remove from pool (returns them to Available). " +
    "[Pool loans — filtered, Bulk action bar — a, Sign off dialog]",
  `Use the bulk action bar: select rows, or Select all ${POOL_VIEW.total} matching to act on every matching loan ` +
    `("All ${POOL_VIEW.total} matching selected"). Pool loans: Sign off, Remove from pool (no confirmation, except when ` +
    `all matching are selected: "${removeLabel(POOL_VIEW.total)}"), Export, Clear selection. Add loans: Add to pool, ` +
    `Export, Clear selection, with Select all ${filteredAddable()} addable. [Pool loans, Add loans, Bulk action bar — a, b, b2, c]`,
  `Check limits: Pool summary lists limit breaches (${COUNTS.limitBreaches[0].lender} at ${COUNTS.limitBreaches[0].share}%, cap ` +
    `${COUNTS.limitBreaches[0].cap}%); its link applies ${POOL_VIEW.filters[0].chip}, the same filter as the saved view ` +
    `"${POOL_VIEW.name}". Select loans there and Remove from pool to bring the share under the cap. [Pool loans]`,
  `Submit pool when there are 0 issues. Until then it's disabled and "⚠ ${issueCount()} pool issues" says why. Submitted ` +
    "pools are read-only: no checkboxes and no bulk action bar. [Pool loans, Submitted pool (read-only)]",
];

/**
 * Section 1, Business context: who's involved, how the money flows (diagram + numbered steps), why pools have
 * rules, where this screen fits, a glossary, and the source note — the only place real company names appear.
 */
async function businessContext(kit: Kit, root: FrameNode, lib: Library) {
  const s = await docSection(kit, root, "1. Business context");
  await para(kit, s, CONTEXT.intro, "Body", "text/primary");

  s.appendChild(await text(kit, "Who's involved", "Body-strong"));
  await docTable(kit, s, "Parties", ["Party", "Role"], CONTEXT.parties, [240]);

  s.appendChild(await text(kit, "How the money flows", "Body-strong"));
  const chip = variantOf(lib.chip, { Tone: "info" }).createInstance();
  setProps(chip, { Label: "This screen" });
  await flowDiagram(
    kit, s, "Money flow",
    CONTEXT.flow.nodes.map((n) => ({ ...n, highlight: n.title === CONTEXT.flow.highlight ? chip : undefined })),
    CONTEXT.flow.edges
  );
  const back = frame("Return path", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/12") });
  s.appendChild(back);
  back.appendChild(await text(kit, CONTEXT.payments.label, "Label", "text/secondary"));
  await flowDiagram(kit, back, "Payments", CONTEXT.payments.nodes, CONTEXT.payments.edges, { muted: true });
  back.appendChild(await text(kit, CONTEXT.payments.note, "Caption", "text/secondary"));
  await badgeSteps(kit, s, CONTEXT.steps);

  s.appendChild(await text(kit, "Why pools have rules", "Body-strong"));
  await definitions(kit, s, CONTEXT.whyRules, 140);

  s.appendChild(await text(kit, "Where this screen fits", "Body-strong"));
  await para(kit, s, CONTEXT.fits, "Body", "text/primary");

  s.appendChild(await text(kit, "Glossary", "Body-strong"));
  await definitions(kit, s, CONTEXT.glossary, 240);

  await para(kit, s, CONTEXT.sourceNote, "Caption", "text/secondary");
}

async function buildAbout(kit: Kit, page: PageNode, lib: Library, at: { x: number; y: number }, keepPosition: boolean) {
  const pos = takeOver(page, ABOUT);
  const root = frame(ABOUT, {
    gap: space(kit, "space/24"),
    padding: space(kit, "space/48"),
    width: 1080,
    fill: color(kit, "surface/background"),
  });
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");
  page.appendChild(root);
  root.x = pos && keepPosition ? pos.x : at.x;
  root.y = pos && keepPosition ? pos.y : at.y;

  const head = frame("Header", { gap: space(kit, "space/8") });
  root.appendChild(head);
  head.layoutSizingHorizontal = "FILL";
  head.appendChild(await text(kit, ABOUT, "Display"));
  await para(
    kit, head,
    "A loan pooling screen for a mortgage guarantor's trading desk, with business context, workflows, and eligibility " +
      "rules documented on the page. An example built with Sterling; start your own work from the blank Template page. " +
      "Planning diagrams live in the repo at docs/examples/loan-pooling/."
  );
  await para(kit, head, "Developer annotations: press Shift+Y to show or hide.", "Caption");

  await businessContext(kit, root, lib);

  const brief = await docSection(kit, root, "2. Brief");
  await para(
    kit, brief,
    `You're a pooling trader. Build ${POOL.name} toward a ${millions(POOL.targetM)} target from loans the guarantor has ` +
      "already purchased: add eligible loans, sign off or remove exceptions, keep every lender at or under " +
      `${COUNTS.limitBreaches[0].cap}% of the pool, then submit. Creating the pool (its name, criteria, and target) ` +
      "happens before this screen.",
    "Body", "text/primary"
  );

  const flows = await docSection(kit, root, "3. Workflows");
  flows.appendChild(await text(kit, "Pool workflow", "Body-strong"));
  await stageDiagram(kit, flows, [
    ["Draft", "Being built", "neutral"],
    ["Submit pool", "Enabled only with 0 issues", "info"],
    ["Submitted", "Read-only", "positive"],
  ]);
  flows.appendChild(await text(kit, "Loan workflow (inside a Draft pool)", "Body-strong"));
  await stageDiagram(kit, flows, [
    ["Available", "Candidate", "neutral"],
    ["Add to pool", "Eligible loan", "info"],
    ["Ready", "Eligible", "positive"],
  ]);
  await stageDiagram(kit, flows, [
    ["Available", "Candidate", "neutral"],
    ["Add to pool", "Exception loan", "info"],
    ["Exception", "Needs sign-off", "warning"],
    ["Sign off", "Note required", "info"],
    ["Signed off", "Counts as resolved", "info"],
  ]);
  await para(
    kit, flows,
    "Remove from pool returns any loan to Available. Ineligible loans can't be added. Loans have no submitted state of " +
      `their own; they lock with the pool. Issues block Submit pool: each Exception loan is one issue, and each limit ` +
      `breach is one issue (now ${COUNTS.pool.Exception} + ${COUNTS.limitBreaches.length} = ${issueCount()}).`,
    "Caption"
  );

  const rules = await docSection(kit, root, "4. Eligibility rules → how they appear");
  await docTable(
    kit, rules, "Rules table", ["Rule", "Condition", "Why", "Pool loans tab", "Add loans tab"], RULE_ROWS, [96, 160, 180, 260]
  );

  const filters = await docSection(kit, root, "5. Filters, views, and status");
  await definitions(kit, filters, FILTER_MODEL, 120);

  const howTo = await docSection(kit, root, "6. What you can do on this screen");
  await steps(kit, howTo, SCREEN_STEPS);

  const assumptions = await docSection(kit, root, "7. Assumptions");
  await para(kit, assumptions, ASSUMPTIONS, "Body", "text/primary");

  if (pos) updated(ABOUT);
  else created(ABOUT);
  return root;
}

// ------------------------------------------------------------ Page

export async function buildLoanExample(kit: Kit, page: PageNode, lib: Library): Promise<FrameNode> {
  checkData();

  const holder = ensureHolder(kit, page);
  await ensureText(kit, holder, "Title", HOLDER, "Title", "text/primary", 0);
  const poolRow = await ensureComponentSet(kit, page, holder, 1, rowSpec(kit, lib.bodyCell, {
    name: NAMES.poolRow,
    description:
      "State (default / hover / selected / selected-hover). A checkbox cell plus the pool-loan columns (Status = Ready / " +
      "Exception / Signed off), built from Grid/BodyCell instances.",
    data: POOL_DATA,
  }));
  const gridSets = (row: ComponentSetNode) => ({ header: lib.headerCell, row, checkbox: lib.checkbox });
  const poolGrid = await buildGrid(kit, page, holder, 2, gridSets(poolRow), {
    name: NAMES.poolGrid,
    description:
      `Page 1 of the saved view "${POOL_VIEW.name}" (${POOL_DATA.rows.length} of ${POOL_VIEW.total} matching): Ready, Exception and Signed off. Open exceptions ` +
      "flag the failing cell (warning) and say \"Needs sign-off\"; signed-off loans keep the exception text, muted, for audit.",
    data: POOL_DATA,
  });
  // The "Exceptions to sign off" view has its own columns (adds Sign-off note), so its own row set.
  const exceptionRow = await ensureComponentSet(kit, page, holder, 3, rowSpec(kit, lib.bodyCell, {
    name: NAMES.exceptionRow,
    description: "State (default / hover / selected / selected-hover). The pool-loan columns plus Sign-off note, for the Exceptions to sign off view.",
    data: EXCEPTIONS_DATA,
  }));
  const exceptionsGrid = await buildGrid(kit, page, holder, 4, gridSets(exceptionRow), {
    name: NAMES.exceptionsGrid,
    description: "The Exceptions to sign off view: Status is Exception, plus the Sign-off note column. Every open exception, none selected.",
    data: EXCEPTIONS_DATA,
  });
  const candidateRow = await ensureComponentSet(kit, page, holder, 5, rowSpec(kit, lib.bodyCell, {
    name: NAMES.candidateRow,
    description:
      "State (default / hover / selected / selected-hover). A checkbox cell plus the candidate columns (Eligibility = " +
      "Eligible / Exception / Ineligible), built from Grid/BodyCell instances.",
    data: CANDIDATE_DATA,
  }));
  const candidateGrid = await buildGrid(kit, page, holder, 6, gridSets(candidateRow), {
    name: NAMES.candidateGrid,
    description:
      `Page 1 of the edited candidate view (${CANDIDATE_DATA.rows.length} of ${CANDIDATE_VIEW.total} matching): purchased loans not yet in any pool that meet the criteria. ` +
      "Exceptions flag the failing cell (warning) and stay selectable; Ineligible loans use error cells, a disabled checkbox, " +
      "and muted text.",
    data: CANDIDATE_DATA,
  });
  const poolBar = await buildBulkActionBar(
    kit, page, holder, 7, { button: lib.button, icons: lib.icons }, gridWidth(POOL_DATA), POOL_BAR
  );
  // Bar states a and b need different selections; selecting through instance overrides drops the rows' other
  // overrides, so each is its own grid built from data that already has the selection.
  const stateAGrid = await buildGrid(kit, page, holder, 8, gridSets(poolRow), {
    name: NAMES.stateAGrid,
    description: "Bar state a: the Harbor Point view with one Exception and one Ready loan selected.",
    data: POOL_STATE_A_DATA,
  });
  const stateBGrid = await buildGrid(kit, page, holder, 9, gridSets(poolRow), {
    name: NAMES.stateBGrid,
    description: "Bar state b: the Harbor Point view after Select all matching — every row selected.",
    data: POOL_STATE_B_DATA,
  });
  const submittedRow = await ensureComponentSet(kit, page, holder, 10, rowSpec(kit, lib.bodyCell, {
    name: NAMES.submittedRow,
    description: "State (default / hover / selected / selected-hover). The pool-loan columns without the checkbox, for a submitted (read-only) pool.",
    data: SUBMITTED_DATA,
  }));
  const submittedGrid = await buildGrid(kit, page, holder, 11, gridSets(submittedRow), {
    name: NAMES.submittedGrid,
    description: "A submitted pool, read-only: no checkbox column, Ready and Signed off loans only. Illustrative rows.",
    data: SUBMITTED_DATA,
  });

  const parts = { poolGrid, candidateGrid, poolBar };
  const pool = await buildScreen(kit, page, lib, "pool", parts);
  const add = await buildScreen(kit, page, lib, "add", parts, pool.root);
  // Layout: Pool loans · Add loans · Example states · About. Documentation frames keep the position
  // you gave them, except on the run that first creates the Add loans screen (which takes their spot).
  const keep = !add.isNew;
  const states = await buildStates(
    kit, page, lib, { exceptionsGrid, stateAGrid, stateBGrid, poolBar, submittedGrid }, { x: add.root.x + WIDTH + GAP, y: add.root.y }, keep
  );
  await buildAbout(kit, page, lib, { x: states.x + states.width + GAP, y: states.y }, keep);

  // Developer annotations live on the Pool loans screen only (annotations.ts).
  await applyAnnotations(pool.root, [add.root]);
  checkAnnotations(pool.root);

  // Action-trigger check: every action the example offers has a visible trigger on a screen or state.
  checkActionTriggers([pool.root, add.root, states]);
  checkGridLayout([
    [poolGrid, POOL_DATA], [exceptionsGrid, EXCEPTIONS_DATA], [candidateGrid, CANDIDATE_DATA],
    [stateAGrid, POOL_STATE_A_DATA], [stateBGrid, POOL_STATE_B_DATA], [submittedGrid, SUBMITTED_DATA],
  ]);
  return pool.root;
}
