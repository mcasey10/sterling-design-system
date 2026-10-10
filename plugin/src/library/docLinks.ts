// Documentation links. Turns each published component's registry target (docRegistry.ts) into its Figma
// documentation link, and links the "Full guidance" line of its usage note on the Components page.
// Runs after the Guidelines and Patterns pages are drawn: those pages are redrawn on every build, so their
// frames get new IDs and the links are refreshed each time.

import { COMPONENT_DOCS, ICON_DOC, docFor, isPublished, targetFrameName, targetLabel, DocTarget } from "./docRegistry";
import { GUIDELINES_PAGE, PATTERNS_PAGE } from "../core/helpers";
import { warn } from "../core/log";

/** Published components on a page: component sets and standalone components (not variants), without a "_" or "." prefix. */
export function publishedComponents(page: PageNode): (ComponentNode | ComponentSetNode)[] {
  const nodes = page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] }) as (ComponentNode | ComponentSetNode)[];
  return nodes.filter((n) => (n.type === "COMPONENT_SET" || n.parent?.type !== "COMPONENT_SET") && isPublished(n.name));
}

/** The frame a Guidelines or Patterns target points to, if it exists. */
function targetFrame(target: DocTarget, pages: Map<string, PageNode>): FrameNode | null {
  if ("url" in target) return null;
  const page = pages.get(target.page === "Guidelines" ? GUIDELINES_PAGE : PATTERNS_PAGE);
  const name = targetFrameName(target);
  return (page?.findOne((n) => n.type === "FRAME" && n.name === name) as FrameNode | null) ?? null;
}

/** The documentation URL and the in-file hyperlink for a target, or null if it can't be resolved. */
function resolve(target: DocTarget, pages: Map<string, PageNode>, fileKey: string | undefined) {
  if ("url" in target) return { uri: target.url, hyperlink: { type: "URL", value: target.url } as HyperlinkTarget };
  const node = targetFrame(target, pages);
  if (!node || !fileKey) return null;
  return {
    uri: `https://www.figma.com/design/${fileKey}/?node-id=${node.id.replace(":", "-")}`,
    hyperlink: { type: "NODE", value: node.id } as HyperlinkTarget,
  };
}

export async function applyDocLinks(componentsPage: PageNode, pages: Map<string, PageNode>) {
  const key = figma.fileKey;
  if (!key) warn("File key unavailable, so documentation links to Guidelines and Patterns can't be set.");

  // Each published component's documentation link. Missing entries and targets are reported by the library checks.
  for (const comp of publishedComponents(componentsPage)) {
    const entry = docFor(comp.name);
    const link = entry && resolve(entry.docs, pages, key);
    if (!link) continue;
    if (comp.documentationLinks.length !== 1 || comp.documentationLinks[0].uri !== link.uri) {
      comp.documentationLinks = [{ uri: link.uri }];
    }
  }

  // The "Full guidance" line in each usage note links to the same place.
  for (const note of componentsPage.findAll((n) => n.type === "FRAME" && n.name.startsWith("Usage/")) as FrameNode[]) {
    const entry = docFor(note.name.slice("Usage/".length));
    const link = entry && resolve(entry.docs, pages, key);
    const text = note.findChild((n) => n.type === "TEXT" && n.name === "Guidance link") as TextNode | null;
    if (!link || !text) continue;
    await setHyperlink(text, link.hyperlink);
  }

  // "Related" links in each component's entry under Guidelines › Component usage: text layers named
  // "Related/<target label>". Pattern frames don't exist yet when the Guidelines page is drawn, so they're linked here.
  const related = new Map<string, DocTarget>();
  for (const doc of [...Object.values(COMPONENT_DOCS), ICON_DOC]) for (const t of doc.related) related.set(targetLabel(t), t);
  const guidelinesPage = pages.get(GUIDELINES_PAGE);
  for (const text of (guidelinesPage?.findAll((n) => n.type === "TEXT" && n.name.startsWith("Related/")) ?? []) as TextNode[]) {
    const target = related.get(text.name.slice("Related/".length));
    const link = target && resolve(target, pages, key);
    if (link) await setHyperlink(text, link.hyperlink);
    else warn(`Related link "${text.name.slice("Related/".length)}" has no target frame.`);
  }
}

async function setHyperlink(text: TextNode, target: HyperlinkTarget) {
  if (JSON.stringify(text.hyperlink) === JSON.stringify(target)) return;
  await figma.loadFontAsync(text.fontName as FontName);
  text.hyperlink = target;
}
