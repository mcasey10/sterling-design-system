// "Build library": variables, text styles, and every library page, in order. Safe to rerun:
// variables, styles, and components are matched by name and updated in place; documentation
// frames are rebuilt where they were. Never touches an example's screens or data.

import { buildVariables } from "../core/variables";
import { buildTextStyles } from "../core/textStyles";
import { buildFoundations } from "./pages/foundations";
import { buildComponentsPage } from "./pages/componentsPage";
import { buildTemplate } from "./pages/template";
import { buildReadme } from "./pages/readme";
import { buildComponentArchitecture } from "./pages/componentArchitecture";
import {
  ensurePages, useStrokeScale, Kit, ARCHITECTURE_PAGE, GUIDELINES_PAGE, PATTERNS_PAGE, REDRAWN_PAGES, docLinks,
} from "../core/helpers";
import { buildGuidelines } from "./pages/guidelines";
import { buildPatterns } from "./pages/patterns";
import { report, warn } from "../core/log";
import { snapshotInstances, compareInstances } from "../core/linkCheck";

/**
 * Component descriptions end with "Guidelines: …" / "Patterns: …". When the file key is available,
 * those lines link to the pages (page IDs are stable across runs); otherwise they stay plain text.
 */
function linkDescriptions(pages: Map<string, PageNode>) {
  const key = figma.fileKey;
  if (!key) {
    warn("File key unavailable, so component descriptions name their Guidelines / Patterns sections without links.");
    return;
  }
  const url = (page: PageNode) => `https://www.figma.com/design/${key}/?node-id=${page.id.replace(":", "-")}`;
  docLinks.guidelines = url(pages.get(GUIDELINES_PAGE)!);
  docLinks.patterns = url(pages.get(PATTERNS_PAGE)!);
}

/**
 * Post-build reminder: the plugin API can't turn on tabular figures for a text style, so they're set by hand
 * once per file (see the Read me page). Text nodes do report their OpenType features, so this reads one
 * Numeric text on the Components page and warns until tabular figures (TNUM) are on.
 */
function checkTabularFigures(kit: Kit, page: PageNode) {
  const style = kit.styles.get("Numeric");
  if (!style) return;
  const sample = page.findOne((n) => n.type === "TEXT" && n.textStyleId === style.id) as TextNode | null;
  if (!sample || sample.openTypeFeatures === figma.mixed) return;
  // TNUM is missing from the typings' feature list, but Figma reports it at runtime.
  if (!(sample.openTypeFeatures as Record<string, boolean>).TNUM) {
    warn(
      "Reminder: the Numeric text style doesn't have tabular figures yet. Select the Numeric style, open Type settings → " +
        "Details → Numbers, and set Style to Monospace uppercase/lining. One time per file; builds leave it alone."
    );
  }
}

/**
 * Pages the link check covers: every page whose instances aren't redrawn by this build — the Template,
 * the Component architecture page, and any other page that uses library components (examples, your own pages).
 */
function linkCheckPages(): string[] {
  const names = ["Template", ARCHITECTURE_PAGE];
  for (const p of figma.root.children) if (!REDRAWN_PAGES.includes(p.name) && !names.includes(p.name)) names.push(p.name);
  return names;
}

export async function buildLibrary(): Promise<{ summary: string; extra: string; focus: SceneNode }> {
  // Record which variant every instance outside the redrawn pages uses, to confirm afterwards they're still linked.
  const instancesBefore = await snapshotInstances(linkCheckPages());
  const variables = await buildVariables();
  const styles = await buildTextStyles();
  const kit: Kit = { ...variables, styles };
  useStrokeScale(kit);

  const pages = await ensurePages();
  linkDescriptions(pages);

  await buildFoundations(kit, pages.get("Foundations")!);
  const { lib } = await buildComponentsPage(kit, pages.get("Components")!);
  checkTabularFigures(kit, pages.get("Components")!);
  const template = await buildTemplate(kit, pages.get("Template")!, lib);
  await buildComponentArchitecture(kit, pages.get(ARCHITECTURE_PAGE)!, lib);
  await buildGuidelines(kit, pages.get(GUIDELINES_PAGE)!, lib);
  await buildPatterns(kit, pages.get(PATTERNS_PAGE)!, lib);
  await buildReadme(kit, pages.get("Read me")!);

  const links = await compareInstances(instancesBefore);
  const kept = [...links.values()].reduce((n, c) => n + c.kept, 0);
  const changed = report.warnings.filter((w) => w.startsWith("Link check")).length;

  await figma.setCurrentPageAsync(pages.get("Template")!);
  return {
    summary: `Sterling library: ${variables.vars.size} variables, ${styles.size} text styles, ${pages.size} pages`,
    extra: ` · links: ${kept} kept, ${changed} changed`,
    focus: template,
  };
}
