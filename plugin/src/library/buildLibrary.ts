// "Build library": variables, text styles, and every library page, in order. Safe to rerun:
// variables, styles, and components are matched by name and updated in place; documentation
// frames are rebuilt where they were. Never touches an example's screens or data.

import { buildVariables } from "../core/variables";
import { buildTextStyles } from "../core/textStyles";
import { buildFoundations } from "./pages/foundations";
import { buildComponentsPage } from "./pages/componentsPage";
import { buildTemplate } from "./pages/template";
import { buildReadme } from "./pages/readme";
import { buildCover } from "./pages/cover";
import { buildComponentArchitecture } from "./pages/componentArchitecture";
import {
  ensurePages, useStrokeScale, Kit, ARCHITECTURE_PAGE, COVER_PAGE, GUIDELINES_PAGE, PATTERNS_PAGE, REDRAWN_PAGES,
  linkInstanceProblems,
} from "../core/helpers";
import { buildGuidelines } from "./pages/guidelines";
import { buildPatterns } from "./pages/patterns";
import { report, warn } from "../core/log";
import { VERSION } from "../core/meta";
import { snapshotInstances, compareInstances } from "../core/linkCheck";
import { applyDocLinks } from "./docLinks";
import { checkLibrary, LIBRARY_CHECK_FAILED } from "./checks";

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
  for (const p of figma.root.children) {
    if (!p.isPageDivider && !REDRAWN_PAGES.includes(p.name) && !names.includes(p.name)) names.push(p.name);
  }
  return names;
}

/** Library pages whose instances can contain links (a Controls/Link, or a bulk action bar's Select all). */
const LINK_PAGES = ["Components", "Template", ARCHITECTURE_PAGE, GUIDELINES_PAGE, PATTERNS_PAGE];

export async function buildLibrary(): Promise<{ summary: string; extra: string; focus: SceneNode }> {
  // Record which variant every instance outside the redrawn pages uses, to confirm afterwards they're still linked.
  const instancesBefore = await snapshotInstances(linkCheckPages());
  const variables = await buildVariables();
  const styles = await buildTextStyles();
  const kit: Kit = { ...variables, styles };
  useStrokeScale(kit);

  const pages = await ensurePages();

  await buildFoundations(kit, pages.get("Foundations")!);
  const { lib } = await buildComponentsPage(kit, pages.get("Components")!);
  checkTabularFigures(kit, pages.get("Components")!);
  const template = await buildTemplate(kit, pages.get("Template")!, lib);
  await buildComponentArchitecture(kit, pages.get(ARCHITECTURE_PAGE)!, lib);
  await buildGuidelines(kit, pages.get(GUIDELINES_PAGE)!, lib);
  await buildPatterns(kit, pages.get(PATTERNS_PAGE)!, lib);
  await buildReadme(kit, pages.get("Read me")!);
  await buildCover(kit, pages.get(COVER_PAGE)!, lib);
  // Documentation links point at Guidelines and Patterns frames, which were just redrawn; then check the library.
  await applyDocLinks(pages.get("Components")!, pages);
  checkLibrary(kit, pages.get("Components")!);
  // Link text inside instances must follow its component (and so the link text styles and their underline).
  for (const p of LINK_PAGES.map((name) => pages.get(name)).filter((page): page is PageNode => !!page)) {
    for (const problem of await linkInstanceProblems(p)) warn(`${LIBRARY_CHECK_FAILED} — ${problem}`);
  }

  const links = await compareInstances(instancesBefore);
  const kept = [...links.values()].reduce((n, c) => n + c.kept, 0);
  const changed = report.warnings.filter((w) => w.startsWith("Link check")).length;
  const failed = report.warnings.filter((w) => w.startsWith(LIBRARY_CHECK_FAILED)).length;

  await figma.setCurrentPageAsync(pages.get("Template")!);
  return {
    summary: `Sterling ${VERSION} library: ${variables.vars.size} variables, ${styles.size} text styles, ${pages.size} pages`,
    extra: ` · links: ${kept} kept, ${changed} changed · library checks: ${failed ? `${failed} FAILED` : "pass"}`,
    focus: template,
  };
}
