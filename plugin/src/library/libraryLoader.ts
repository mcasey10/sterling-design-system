// Read-only access to a library that "Build library" has already generated. Used by "Build example"
// so it can build its page without writing to variables, text styles, or any library page.

import { COLLECTIONS, KitVariables, CollectionContext, VariableIndex } from "../core/variables";
import { tokens } from "../core/tokens";
import type { TextStyleIndex } from "../core/textStyles";
import type { Kit } from "../core/helpers";
import type { Library } from "./pages/componentsPage";
import type { IconIndex } from "./icons";
import { findComponent, findComponentSet } from "../core/ensure";
import { warn } from "../core/log";

class MissingKitError extends Error {
  constructor(what: string) {
    super(`${what} not found — run "Build library" first.`);
  }
}

async function loadVariables(): Promise<KitVariables> {
  const collections = new Map<string, CollectionContext>();
  const vars: VariableIndex = new Map();
  const all = await figma.variables.getLocalVariablesAsync();
  for (const name of Object.values(COLLECTIONS)) {
    const collection = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === name);
    if (!collection) throw new MissingKitError(`Variable collection "${name}"`);
    const modeIds = new Map(collection.modes.map((m) => [m.name, m.modeId] as [string, string]));
    const byName = new Map<string, Variable>();
    for (const v of all) {
      if (v.variableCollectionId !== collection.id) continue;
      byName.set(v.name, v);
      vars.set(`${name}/${v.name}`, v);
    }
    collections.set(name, { collection, modeIds, byName });
  }
  return { vars, collections };
}

async function loadTextStyles(): Promise<TextStyleIndex> {
  const index: TextStyleIndex = new Map();
  const local = await figma.getLocalTextStylesAsync();
  for (const name of Object.keys(tokens.typography.styles)) {
    const style = local.find((s) => s.name === name);
    if (!style) {
      warn(`Text style "${name}" not found; text using it falls back to the default font. Run "Build library".`);
      continue;
    }
    try {
      await figma.loadFontAsync(style.fontName);
      index.set(name, style);
    } catch {
      warn(`Font for text style "${name}" is not available; text using it falls back to the default font.`);
    }
  }
  return index;
}

export async function loadKit(): Promise<Kit> {
  const variables = await loadVariables();
  const styles = await loadTextStyles();
  return { ...variables, styles };
}

/** Finds Sterling's components on the Components page without modifying them. */
export function loadLibrary(page: PageNode): Library {
  const set = (name: string) => {
    const node = findComponentSet(page, name);
    if (!node) throw new MissingKitError(`Component set "${name}"`);
    return node;
  };
  const comp = (name: string) => {
    const node = findComponent(page, name);
    if (!node) throw new MissingKitError(`Component "${name}"`);
    return node;
  };
  const icons: IconIndex = new Map();
  for (const node of page.findAll((n) => n.type === "COMPONENT" && n.name.startsWith("Icon/"))) {
    icons.set(node.name.slice("Icon/".length), node as ComponentNode);
  }
  if (!icons.size) throw new MissingKitError("Icon components");
  return {
    icons,
    button: set("Controls/Button"),
    chip: set("Chip/Status"),
    checkbox: set("Controls/Checkbox"),
    headerCell: set("Grid/HeaderCell"),
    bodyCell: set("Grid/BodyCell"),
    row: set("Grid/Row"),
    filterChip: set("Chip/Filter"),
    summaryMetric: set("Summary/Summary metric"),
    textInput: set("Input/Text"),
    select: set("Input/Select"),
    bulkActionBar: comp("Grid/BulkActionBar"),
    exampleGrid: comp("Grid/Data grid"),
    pagination: comp("Grid/Pagination"),
    tab: set("Tabs/Tab"),
    iconButton: set("Controls/Icon button"),
    sideChip: set("Chip/Side"),
    option: set("Input/Option"),
    menu: comp("Input/Menu"),
    skeletonRow: comp("Grid/Skeleton row"),
    emptyState: set("Grid/Empty state"),
    link: set("Controls/Link"),
    optionDescription: set("Input/Option with description"),
    menuHeading: comp("Input/Menu heading"),
    dialog: comp("Overlay/Dialog"),
  };
}
