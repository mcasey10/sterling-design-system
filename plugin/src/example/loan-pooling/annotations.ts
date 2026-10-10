// Developer annotations on the Pool loans screen: the one table of what's annotated and what each note says.
// Notes are for engineers (one or two sentences each) and show in Figma with Shift+Y and in Dev Mode.
//   • Pool loans screen only, one note of each kind; Add loans and the state frames repeat the same components.
//   • Each entry names its target as a path of layer names from the screen's root frame.
//   • Counts and names in the text come from loanData.ts, so the notes can't drift from the screen.
// "Build example" applies the table on every run, and the example checks fail if a target is missing.

import { POOL_DATA, POOL_VIEW, SIGN_OFF_HINT, PAGE_SIZE } from "./loanData";
import { warn } from "../../core/log";

/** "Accessibility" is a Figma preset category; "Behavior" is created in the file if it isn't there yet. */
type Category = "Accessibility" | "Behavior";

export interface AnnotationSpec {
  /** Layer names from the screen root down to the annotated layer. */
  target: string[];
  category: Category;
  /** Markdown; starts with a bold title. */
  text: string;
}

// The open exception on the Pool loans page: its row, its flagged column, and the reason shown beside it.
const exceptionIndex = POOL_DATA.rows.findIndex((r) => r.warning?.length);
const exceptionRow = POOL_DATA.rows[exceptionIndex];
const exceptionKey = exceptionRow?.warning?.[0] ?? "";
const exceptionName = (exceptionRow?.values.exception ?? "").replace(" — ", ", exception: ");
const rowLayer = (index: number) => `Row ${String(index + 1).padStart(2, "0")}`;
const chip = POOL_VIEW.filters[0].chip;

const GRID_AREA = ["Workspace", "Grid area"];
const GRID = [...GRID_AREA, "Loan grid"];
const BAR = [...GRID_AREA, "Bulk action bar"];
const TOOLBAR = [...GRID_AREA, "Toolbar", "Filters"];

export const ANNOTATIONS: AnnotationSpec[] = [
  {
    target: [...TOOLBAR, "View"],
    category: "Accessibility",
    text: "**View select.** The visible \"View\" text is this select's label. Associate them in code with `<label for>` or `aria-labelledby`.",
  },
  {
    target: [...BAR, "Actions", "Sign off"],
    category: "Accessibility",
    text:
      `**Sign off (disabled).** Disabled while no Exception loans are selected. Link the reason, "${SIGN_OFF_HINT}", ` +
      "to the button with `aria-describedby` so it's announced.",
  },
  {
    target: [...GRID, rowLayer(exceptionIndex), `Cell/${exceptionKey}`],
    category: "Accessibility",
    text:
      "**Exception cell.** The border and icon mark a value outside the eligibility rule. Include the reason in the cell's " +
      `accessible name, for example "${exceptionName}"; the icon is decorative.`,
  },
  {
    target: [...TOOLBAR, "Filter 1"],
    category: "Accessibility",
    text: `**Filter chip.** The × is a button with the accessible name "Remove filter: ${chip}".`,
  },
  {
    target: [...TOOLBAR, "Filter 1"],
    category: "Behavior",
    text: "**Filter chip.** Removing the chip also clears that field in the filter panel.",
  },
  {
    target: [...GRID, "Header", `Head/${POOL_DATA.sortKey}`],
    category: "Accessibility",
    text:
      "**Sortable headers.** Each sortable header is a button. Only the sorted column shows its arrow; unsorted headers show ⇕ " +
      "on hover and keyboard focus. Set `aria-sort` on the sorted column only (here \"ascending\"); the icon is decorative.",
  },
  {
    target: [...BAR, "Selection", "Select all"],
    category: "Behavior",
    text:
      `**Select all matching.** Selects every loan that matches the current filters, across all pages, not only the ${PAGE_SIZE} ` +
      `rows shown. Announce the new count ("All ${POOL_VIEW.total} matching selected") when it changes.`,
  },
];

/** The layer a target path points to, following layer names from the root; undefined if any step is missing. */
function resolve(root: FrameNode, path: string[]): SceneNode | undefined {
  let node: SceneNode | undefined = root;
  for (const name of path) {
    node = node && "children" in node ? node.children.find((c) => c.name === name) : undefined;
  }
  return node;
}

const key = (path: string[]) => path.join(" › ");

async function categoryIds(): Promise<Partial<Record<Category, string>>> {
  const ids: Partial<Record<Category, string>> = {};
  try {
    const existing = await figma.annotations.getAnnotationCategoriesAsync();
    for (const label of ["Accessibility", "Behavior"] as Category[]) {
      const found = existing.find((c) => c.label === label);
      ids[label] = found ? found.id : (await figma.annotations.addAnnotationCategoryAsync({ label, color: "teal" })).id;
    }
  } catch (e) {
    warn(`Annotation categories unavailable (${(e as Error).message}); annotations are added without a category.`);
  }
  return ids;
}

/**
 * Applies the table to the Pool loans screen. A layer can carry several notes (the filter chip has two). The same
 * target layers on `others` (the Add loans screen) are cleared, so each note appears once.
 */
export async function applyAnnotations(screen: FrameNode, others: FrameNode[]) {
  const ids = await categoryIds();
  const byTarget = new Map<string, AnnotationSpec[]>();
  for (const spec of ANNOTATIONS) byTarget.set(key(spec.target), [...(byTarget.get(key(spec.target)) ?? []), spec]);
  for (const specs of byTarget.values()) {
    const path = specs[0].target;
    try {
      const node = resolve(screen, path);
      if (node && "annotations" in node) {
        node.annotations = specs.map((s) => (ids[s.category] ? { labelMarkdown: s.text, categoryId: ids[s.category] } : { labelMarkdown: s.text }));
      }
      for (const other of others) {
        const twin = resolve(other, path);
        if (twin && "annotations" in twin && twin.annotations.length) twin.annotations = [];
      }
    } catch (e) {
      warn(`Couldn't annotate "${key(path)}": ${(e as Error).message}`);
    }
  }
}

/**
 * One message per annotation whose target is missing, or whose note isn't on it, after the build. Notes are
 * matched by their bold title and counted per layer (Figma may reformat the markdown it stores).
 */
export function annotationProblems(screen: FrameNode): string[] {
  const problems: string[] = [];
  for (const spec of ANNOTATIONS) {
    const node = resolve(screen, spec.target);
    const title = spec.text.slice(2, spec.text.indexOf("**", 2));
    if (!node) {
      problems.push(`annotation "${title}" has no target layer: ${key(spec.target)}`);
      continue;
    }
    const notes = "annotations" in node ? node.annotations : [];
    const expected = ANNOTATIONS.filter((s) => key(s.target) === key(spec.target)).length;
    const titled = notes.filter((a) => (a.labelMarkdown ?? a.label ?? "").includes(title.replace(/\.$/, ""))).length;
    if (titled < expected) problems.push(`annotation "${title}" (${spec.category}) isn't on its target: ${key(spec.target)}`);
  }
  return problems;
}
