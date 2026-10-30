// The website's text about the repeat runs: Start here's "Two builds" section and the Follow-up runs page (/runs/).
// The pictures are in docs/demo/runs/images/ (made outside the repository from the runs' captures; each is 1600 px
// wide at 2x), copied into site/ by build-pages.ts. The alt texts were written with the pictures.

import { AI_PAGE_URL, DEMO_PAGE_URL, EXAMPLE_PAGE_URL, RUNS_PAGE_URL, TWO_BUILDS_URL, repositoryFileUrl, repositoryFolderUrl } from "../../../definitions/site";
import { esc } from "../../../scripts/lib/page-shell.mjs";

/** Where the pictures are kept in the repository. */
export const RUNS_IMAGES = "docs/demo/runs/images";

interface Visual {
  /** The file in RUNS_IMAGES, served under the same name. */
  file: string;
  /** Its size in CSS pixels (the file is twice that). */
  width: number;
  height: number;
  alt: string;
}

export const VISUALS = {
  twoBuilds: {
    file: "V0-two-builds.png", width: 1600, height: 1182,
    alt: "Diagram of two builds. On the left, Sterling's definitions produce a Figma library, the sterling-ui React package, and AI files with an MCP server. On the right, a design mockup (what it looks like), a request (what it does), and sample data (what it shows) from the user go with the package and the MCP server to an AI coding tool, which builds the Pool loans screen. A review of the screen (checks, judgment, iteration) reports gaps to a Sterling backlog of gaps and new needs, which feeds the next version of the definitions; a dashed line notes that in this test the mockup came from Sterling's own example, and a footnote says that in a team, people building with Sterling refine the AI's draft and report gaps while the design system's owners decide what goes into the next version.",
  },
  fix1: {
    file: "V1-fix-1.png", width: 1600, height: 946,
    alt: "Loan LN-204389's row, with its LTV of 93.0% flagged with a warning icon; the row looks the same before and after the fix. Below it, two diagrams: before, the screen used its own table styled with the data grid's internal styles and added the reason itself, and a screen reader heard \"93.0%, breaks a rule: LTV 93.0% — above 90%\"; after, the screen uses Sterling's data grid, the reason travels with the cell, and a screen reader hears \"Warning 93.0%, LTV 93.0% — above 90%\".",
  },
  fix2: {
    file: "V1-fix-2.png", width: 1600, height: 1320,
    alt: "Before Reset, the Harbor Point loans view with a Status filter added, the same in both builds: the filter panel shows Lender Harbor Point and Status Exception, its Reset button outlined, beside chips for both filters and Clear all. After Reset, the first build has removed the view's own Lender filter too: its view, still named \"Harbor Point loans · edited\", says \"No filters: every pool loan\", and its grid shows the sample's \"Not in the sample data\" message; after the fixes, Reset returns to the Lender is Harbor Point chip and 12 Harbor Point rows, showing 1–12 of 58 pool loans.",
  },
  fix3: {
    file: "V1-fix-3.png", width: 1600, height: 846,
    alt: "The data grid's \"no results\" message on a 390 px wide screen. In the first build the message is centered on the grid's full width, not on the space you can see, and is cut off after \"No pool loans matc\"; after the fixes, it is centered and wrapped within the visible space of the grid frame, and the whole message, its explanation, and a Clear filters button fit.",
  },
  consistent: {
    file: "V2-consistent-runs.png", width: 1600, height: 736,
    alt: "Thumbnails of the opening screen from follow-up runs 01 to 05, all showing the same Harbor Point loans view, with build times between 10 minutes 6 seconds and 13 minutes 32 seconds. A shared line says every run had all figures correct, all requested states built, and no automated accessibility violations, checked with axe in Light and Dark in every density.",
  },
  states: {
    file: "V5-states-edge-cases.png", width: 1600, height: 1211,
    alt: "A table of eleven items across follow-up runs 01 to 05, titled \"Every requested state, and the edge cases, in all five runs.\" Seven requested states (loading, empty (a filter with no results), error, disabled actions, selection, the bulk action bar, and sign-off) and four edge cases (long lender names, \"Any lender\", Clear all, and loans not in the sample) are marked handled in every run. Loading and error were checked in review; the others were scored automatically, and the loans-not-in-the-sample check was recorded as a note. Run 05's cell for that item adds \"wording noted\": its empty state counted all 186 pool loans, though only the sample was filtered.",
  },
  mockup: {
    file: "V3-mockup-vs-request.png", width: 1600, height: 1163,
    alt: "The design mockup's header and bulk action bar, with Edit criteria and Export outlined, next to the request's list of what the trader can do, which mentions neither control. A table of the five follow-up runs shows that four left Export out and said so while run 02 added a CSV download and said so, and that runs 01, 02, and 04 added an Edit criteria placeholder while runs 03 and 05 left it out.",
  },
  patterns: {
    file: "V4-patterns-filled-gaps.png", width: 1600, height: 691,
    alt: "A table showing that all five follow-up runs built a View menu, Save view, and summary links, none of which the request described. The View menu and Save view are described by Sterling's Saved views pattern, and summary links by the Link component's guidance.",
  },
} satisfies Record<string, Visual>;

/** A picture with its "Open it full size" link. `src` is its address from the page. */
export const visual = (v: Visual, src: string) => `<figure class="visual">
  <a class="visual__frame" href="${esc(src)}"><img src="${esc(src)}" width="${v.width}" height="${v.height}" alt="${esc(v.alt)}" loading="lazy"></a>
  <figcaption><a href="${esc(src)}">Open it full size</a></figcaption>
</figure>`;

export const VISUAL_CSS = `
.visual { margin: 16px 0; }
.visual__frame { display: block; border-radius: var(--radius-md); overflow: hidden; }
.visual img { display: block; width: 100%; height: auto; }
.visual figcaption { margin-top: 8px; font-size: 13px; }
`;

type Link = (url: string, label: string) => string;

/** Start here's "Two builds" section. The picture is served at the site root. */
export function twoBuildsSection(link: Link): string {
  return `<section class="panel" id="two-builds" aria-labelledby="two-builds-title">
  <h2 id="two-builds-title">Two builds</h2>
  <p class="lead">Sterling involves two different builds. Knowing which is which makes the demo and the example easier to read.</p>
  ${visual(VISUALS.twoBuilds, VISUALS.twoBuilds.file)}
  <p><strong>Building Sterling.</strong> Sterling's definitions (tokens, components and guidance) produce three outputs: the
  Figma library, the sterling-ui React package, and the AI files with an MCP server. The Figma library includes a worked
  example, the Pool loans screen, drawn by the plugin from the same definitions. Designed and built with Claude Code, under
  my direction.</p>
  <p><strong>Building with Sterling.</strong> Someone uses Sterling to build their own screen. They bring a design mockup
  (what it looks like), a request (what it does) and sample data (what it shows). Sterling supplies the components and the
  guidance. In the demo, an AI coding tool did the building. What a review of that screen finds goes two ways: fixes to the
  screen, and gaps in Sterling, which go on its backlog. In a team, the people building with Sterling refine the AI's draft
  and report gaps; the design system's owners decide what goes into the next version.</p>
  <p><strong>Where the two meet in the demo.</strong> The demo's mockup is a picture of Sterling's own Figma example. That
  makes the demo a best case: the screen Sterling's components were designed around. A screen Sterling wasn't designed for
  is the next test.</p>
  <p class="links">${link(DEMO_PAGE_URL, "Watch it build")} · ${link(EXAMPLE_PAGE_URL, "Live example")} · ${link(RUNS_PAGE_URL, "Follow-up runs")}</p>
</section>`;
}

/** The Follow-up runs page's main content. Pictures are served next to the page. */
export function runsMain(link: Link): string {
  const fix = (v: Visual, result: string) => `${visual(v, v.file)}
  <p>${esc(result)}</p>`;
  return `<div class="column">
<h1>Five follow-up runs</h1>
<p class="lead">During version 1.2, an AI coding tool built the Pool loans screen from Sterling, and review found three
problems in Sterling itself, which I fixed. One run proves less than it seems, so I ran the same build five more times from
scratch. The fixes held in every run where they could be measured, and where the runs varied, the cause traced back to
the handoff or to gaps in Sterling's guidance. (What “building with Sterling” means: ${link(TWO_BUILDS_URL, "Two builds")}.)</p>

<section class="panel" aria-labelledby="how-title">
  <h2 id="how-title">How the runs were done</h2>
  <ul>
    <li>Five new sessions, each in a fresh copy of the same kit: Sterling 1.2.0's package and MCP server, the same request,
    the same mockup and the same sample data.</li>
    <li>Each session could use only the kit: no web, no other folders, no other servers. A transcript audit checked this
    afterwards.</li>
    <li>Every screen was scored the same way: a scoring script fixed before the first run, a review of each transcript, and my
    own hands-on checks (keyboard and design in every run; a screen reader in the first).</li>
    <li>Sterling didn't change during the series. New gaps went on the backlog.</li>
  </ul>
</section>

<section class="panel" aria-labelledby="fixes-title">
  <h2 id="fixes-title">The three fixes held</h2>
  <p>The first build exposed three problems in Sterling. Each was fixed, then checked in all five follow-up runs.</p>
  ${fix(VISUALS.fix1, "All five follow-up runs used the data grid, and the reason is read out.")}
  ${fix(VISUALS.fix2, "All five follow-up runs return to the view's 58 loans.")}
  ${fix(VISUALS.fix3, "Fully visible in every follow-up run where it could be measured.")}
</section>

<section class="panel" aria-labelledby="consistent-title">
  <h2 id="consistent-title">Consistent where the request was clear</h2>
  ${visual(VISUALS.consistent, VISUALS.consistent.file)}
  <p>Each run took about 10 to 13½ minutes. In every run, all the figures the request specified were correct, every
  requested state was built (loading, empty, error, disabled actions, selection, sign-off), and automated accessibility
  checks found no violations.</p>
</section>

<section class="panel" aria-labelledby="states-title">
  <h2 id="states-title">Every state and edge case, in every run</h2>
  ${visual(VISUALS.states, VISUALS.states.file)}
  <p>All five runs built every requested state and handled each edge case. Run 05's empty-state wording is noted.</p>
  <p>${link(repositoryFileUrl("docs/demo/runs/states-and-edge-cases.md"), "What each state and edge case means")}</p>
</section>

<section class="panel" aria-labelledby="mockup-title">
  <h2 id="mockup-title">The mockup and the request didn't agree, and the AI followed the request</h2>
  ${visual(VISUALS.mockup, VISUALS.mockup.file)}
  <p>The request was drafted by Claude Code from a summary of the example, and I approved it without comparing it to the
  mockup. So the mockup showed controls the request never described. Export is in the mockup's bulk action bar; four runs
  left it out and said so, and one added a simple CSV download and said so. Edit criteria is in the mockup's header; three
  runs added a placeholder, and two left it out.</p>
  <p>The lesson: when AI drafts requirements, check them against their source.</p>
</section>

<section class="panel" aria-labelledby="patterns-title">
  <h2 id="patterns-title">Patterns filled the gaps</h2>
  ${visual(VISUALS.patterns, VISUALS.patterns.file)}
  <p>The request didn't describe the View menu, saving a view, or the clickable counts in the summary. All five runs built
  them the same way, matching what Sterling's Saved views pattern and its link guidance describe. Written-down patterns let
  a team, or an AI tool, get consistent behavior without spelling it out in every request.</p>
</section>

<section class="panel" aria-labelledby="also-title">
  <h2 id="also-title">Also worth knowing</h2>
  <ul>
    <li><strong>Missing guidance shows up as variation.</strong> One run in five didn't stack its layout on a narrow screen.
    Sterling has no narrow-width layout rule yet; it's on the backlog.</li>
    <li><strong>The runs checked their own work.</strong> All five opened a browser to look at the screen they built; the
    first build didn't. See ${link(`${AI_PAGE_URL}#see-what-it-builds`, "Set up")}.</li>
    <li><strong>One mistake of the AI's own in five runs:</strong> a log file written outside its folder.</li>
  </ul>
</section>

<section class="panel" aria-labelledby="limits-title">
  <h2 id="limits-title">Limits</h2>
  <ul>
    <li>A best case: the screen Sterling's components were designed for, with a mockup taken from Sterling's own example.</li>
    <li>A small sample: one screen, one model, one version of Claude Code, five runs.</li>
    <li>Next: a screen Sterling wasn't designed for, with a mockup and a request written together.</li>
  </ul>
</section>

<section class="panel" aria-labelledby="next-title">
  <h2 id="next-title">What goes into Sterling next</h2>
  <ul>
    <li>Say that the app hosting a screen owns its color mode and density, and that a screen never changes them.</li>
    <li>A layout rule for narrow screens, so a filters, grid and summary layout stacks instead of squeezing the grid.</li>
    <li>Layout tokens, and a z-index token for a screen's own menus and popups.</li>
    <li>Grouped options in Select, which the Saved views pattern asks for.</li>
    <li>Where keyboard focus goes after a short-lived action, such as Undo.</li>
    <li>Say that component class names are private: all five runs used them.</li>
  </ul>
</section>

<section class="panel" aria-labelledby="record-title">
  <h2 id="record-title">The full record</h2>
  <p>Every run's results, screenshots, code and session record, the checklist, the method and every scoring decision:
  ${link(repositoryFolderUrl("docs/demo/runs"), "docs/demo/runs on GitHub")}.</p>
</section>
</div>`;
}
