# Case study: Sterling 1.2, a design system AI tools can use

## Sterling

Sterling is a design system: design tokens, components and usage guidance that keep product screens consistent.
Designers use it in Figma, developers use its React components, and AI tools can look it up while they write
code. All three come from one set of definitions, so they always describe the same thing, and automated checks
fail if they drift apart.

This case study is about version 1.2.0, which added an API for AI coding tools. To show what it does, an AI
session was asked to build a sample application's screen with nothing but Sterling, and the result is part of
the case study.

## Built for adoption and governance

A design system only helps if teams use it, and use it correctly. Sterling is set up so that both are easier.

- **One place to start, a way in for each reader.** The website's Start here page says who Sterling is for and
  where each should go: an evaluator to the token reference and Storybook, a designer to the Figma library on
  Figma Community, a developer to the `sterling-ui` package, an AI-assisted developer to the MCP server, and a
  maintainer to the repository. Each setup is written to one standard: where to run it, what you need and how to
  check it, what to do, and how you know it worked.
- **Correct use is checked, not just documented.** Every color pair is checked for contrast, every component
  for a description and a documentation link, Figma and code for the same variants and properties, the code for
  raw values where a token belongs, every story and website page for accessibility, and the files for AI tools
  against their sources. A team building with Sterling inherits those checks instead of writing them.
- **One source of truth.** The tokens, the component definitions, and the guidance are written once. The Figma
  library, the React components, the website, and the files for AI tools are all generated from them, so a
  decision made once reaches every one of them, and none can drift.

## What 1.2 adds

**What it does:** an AI coding tool can ask Sterling which component fits, how it behaves, which token to use,
and which rules apply, while it writes code, and then build with Sterling's own components.

**How:** an MCP server, eight read-only tools that an AI tool calls (list and get components, tokens, guideline
sections, and patterns, and search them), in one file you download and register once; the same information as
files any tool can read by URL, starting at `llms.txt`; and the React components as a package to install. The
website's [Sterling and AI tools](https://mcasey10.github.io/sterling-design-system/ai-tools/) page follows one
component through all of it.

## Why build through a design system

An AI coding tool can build a working screen from a list of requirements on its own. What it builds is its own:
its own buttons, colors, spacing, and behavior, consistent with nothing else in the product. Built through
Sterling, the same screen uses the team's components, tokens, and rules, the same ones designers use in Figma
and developers use in code.

That makes the design system the shared ground between roles. A designer, a developer, and an AI tool work from
one set of definitions, so the hand-off between design and development shrinks: both sides build from the same
components, and checks catch the places where they drift. It also lets people cross roles. A product manager
can describe a screen in product terms, as this test's request did, and get one built from the real components.

And it separates two jobs. Whoever owns the design system changes a component or a rule once, in one place, and
every product built with it gets the change. Product designers design screens with the components without
having to maintain them. Where the system doesn't cover what a screen needs, the tool says so, and that gap goes
back to the system's owner instead of becoming a one-off inside a product.

## The test

**The request** ([demo/prompt.md](../../demo/prompt.md)) asked for the Pool loans screen of a loan pooling
tool: a trader reviews the loans in a draft pool, deals with the loans that break an eligibility rule, and
submits the pool. It describes the screen, the rules, and what the trader can do in product terms, not by
Sterling's component names, and asks the session to report the components it used and what Sterling was
missing. All data in it is fictional.

**The kit** (`npm run demo:kit`, see [demo/README.md](../../demo/README.md)) gave the session an empty React
app, the designer's screen as a picture, and three things from Sterling:

- the `sterling-ui` package: the React components and the token CSS;
- the MCP server, registered for the session;
- the pool's data: its totals, its rules, and a sample of its loans, 21 of the 186 (the first page of each
  saved view), to keep the kit small.

This is the designer's screen the session was given, from the Sterling Figma file's example page:

![The designer's Pool loans screen: a filter panel on the left, the pool's loans in a grid with one exception flagged, the bulk action bar, and a pool summary on the right listing the three issues that block submission](../images/example-pool-loans.png)

**Kept to the kit.** The session started with only the kit's MCP server. Its settings denied the web, the
Figma servers, and the folders it must not read, this repository among them. Afterwards its transcript was read
with `scripts/demo-transcript.mjs`: no other MCP server was called, nothing was fetched from the web, and no
file outside the kit's folder was read or written. One gap showed: Claude in Chrome was still offered. At the
end the session tried it, to look at the screen in a browser; the connection had been turned off by hand, so it
couldn't, and no browser call was made. The kit's settings now deny Claude in Chrome too.

## The session

Claude Code 2.1.299, with Opus 5.5, in auto mode, on October 14. Times are from the transcript (UTC).

| Time | What happened |
|---|---|
| 12:20:05 | The request |
| 12:20:09 to 12:20:13 | It looked at the empty app, the data file, and the designer's screen |
| 12:20:13 to 12:21:08 | **40 calls to Sterling's MCP server, in 55 seconds:** the component list and the guideline list; all 9 patterns; all 7 guideline sections; 16 components (the data grid and its parts, the bulk action bar, pagination, the status chip, summary metric, tabs, dialog, empty state, button, link, filter chip, select, and option); and the tokens, by collection |
| 12:20:30 to 12:24:25 | Alongside, it read the installed package's built files through shell commands, as part of using the package: the type declarations, `index.js`, and `styles.css` |
| 12:25:11 to 12:28:41 | It wrote the screen: six files |
| 12:28:46 to 12:29:25 | It built the app, started it, checked its data and query logic against the request's numbers, and scanned its CSS for raw values |
| 12:29:44 | It reported the screen done |

About ten minutes from the request to a working screen. The screen it delivered is committed unchanged
([2872cf0](https://github.com/mcasey10/sterling-design-system/commit/2872cf0)) and is in Storybook as
Examples › Pool loans, in its corrected form.

## What the session reported

As the request asked, it ended with a report, and the report was candid:

- **What it couldn't check.** The browser wasn't available, so it said plainly that nothing had been checked
  visually, with a keyboard, or with a screen reader. What it had checked was the numbers, by running its data
  code: 186 loans, 181 Ready, 2 Exception, 3 Signed off, Harbor Point at 32%, 3 issues.
- **The components it used:** 20 of Sterling's, among them the status chip, filter chip, bulk action bar,
  pagination, summary metric, select, dialog, and the grid's parts.
- **The most useful tool:** `get_pattern`. In its words, the patterns "decided most of the behaviour".
- **Seven gaps in Sterling:** the data grid couldn't give a flagged cell its reason for screen readers; no page
  checkbox outside the data grid; no grouped options or descriptions in Select; no toast or inline message; no
  card or panel; no screen-reader-only class or layout tokens; no tooltip.
- **Its guesses,** listed one by one, from how sign-offs are recorded to what it left out because the request
  didn't ask for it.

## What it got right

It followed the request and the guidance it had looked up: the filter panel with chips that stay in sync, the
saved view as the starting state, the bulk action bar only while rows are selected, sign-off with a required
note, Submit pool disabled while issues remain, and status chips that never rely on color alone. Its status
tones are the ones Sterling's Status chips pattern gives (Ready positive, Exception warning, Signed off info);
those lines are unchanged since delivery, and the website's AI page shows them as delivered.

It didn't invent loans. The kit held 21 of the pool's 186, so for a filter whose loans weren't in the sample,
the screen said so in an empty state instead of making rows up.

## What was corrected afterwards

Each correction is its own commit, made with Claude Code under my direction.

| | What | Why | Whose |
|---|---|---|---|
| a | The table became Sterling's `DataGrid` ([5dd0d11](https://github.com/mcasey10/sterling-design-system/commit/5dd0d11)) | The session had rebuilt the table from Sterling's internal class names, because `DataGrid` couldn't give a flagged cell its reason (its first reported gap). The grid gained row `descriptions` first ([a92a520](https://github.com/mcasey10/sterling-design-system/commit/a92a520)) | Sterling: a missing capability |
| b | The grid fits its column ([68e6d68](https://github.com/mcasey10/sterling-design-system/commit/68e6d68)) | The delivered columns added up to 904px in an 849px area, so the Exception column was cut off | The session |
| c | Demo settings became Storybook controls ([e180193](https://github.com/mcasey10/sterling-design-system/commit/e180193)) | The session added its own settings panel (color mode, density, a failed load) that overrode the page around it | The session |
| d | Reset returns to the active view's filters ([3d9a291](https://github.com/mcasey10/sterling-design-system/commit/3d9a291)) | See "What the checks missed" | Sterling: its guidance |
| e | The whole pool ([6e5aa99](https://github.com/mcasey10/sterling-design-system/commit/6e5aa99)) | See "What the checks missed" | The kit's sample data, and Sterling's data grid |

## What the checks missed

None of Sterling's automated checks caught these three problems.

**Reset cleared everything.** My own hands-on test found it: Reset emptied every filter, including the saved
view's. The session had followed the pattern as written, which said "Reset clears it". The gap was in
Sterling's guidance, not in the session's reading of it. The patterns now say that Reset returns every field to
the active saved view's filters, and Clear all removes every filter; correction d made the screen do so.

**"Any lender" showed no loans.** Choosing "Any lender", or Clear all, showed the empty state for loans outside
the sample: correct, but in use the screen looked broken, partly because the message explaining it was cut off
when the grid scrolled sideways. The filter logic was right; the session had explained the gap rather than
invented data. Correction e completed the fictional pool afterwards (marked in the code as added after
delivery), and an interaction test now checks the loan counts after a filter, Reset, "Any lender", and Clear
all. The cut-off message was Sterling's: the data grid's empty state now stays in view in a grid that scrolls
sideways. The patterns also say now that an empty field or an "Any …" option doesn't filter, a clarification,
since the session already handled it that way.

**The MCP server didn't start under its Release name.** Found by the journey test before release
([docs/journey-test.md](../journey-test.md)), not by the session: the server only started when its file was
named `server.js`, so downloaded as `sterling-mcp.js`, the name every setup instruction gives, it exited
silently. Neither the tests nor the demo caught it, because both ran it as `server.js`. It now runs under any
name, and the test runs it as `sterling-mcp.js`
([53272a1](https://github.com/mcasey10/sterling-design-system/commit/53272a1)).

## How well it worked

**It worked.** From a request written in product terms, with no component names, the session looked Sterling
up, built a working screen from Sterling's own components in about ten minutes, and followed the patterns
closely enough that most of the screen's behavior came from them. The MCP server did what it is for: the
session asked before it built, and it asked about patterns most.

**It built through the system, not around it.** The screen used 20 of Sterling's components, and when two
problems turned out to be Sterling's (the data grid's missing capability and the Reset wording), they were fixed
once, in Sterling, and the screen picked them up.

**Most of what needed fixing was Sterling's, not the session's.** Of the five corrections, two were the
session's own choices (column widths, an extra settings panel). The rest traced back to Sterling: a capability
the data grid lacked, a pattern that said the wrong thing, and an empty state that hid its own message. The
session's list of gaps became 1.2's data grid change and the backlog for later releases. Asking an AI tool to
build with a design system turned out to be a good test of the design system itself: it reads the guidance
literally, so it finds where the guidance is wrong or missing.

**It still needed a person.** The session couldn't see the screen, and said so. The Reset problem was found by
using the screen, not by any check. Each problem found that way now has a check, so the next session, or the
next team, is caught sooner.

**The limits of this test.** One session, one screen, one model, and a sample of the data. Sterling was built,
and the session directed, by one person; it hasn't yet been used by a team.

## How teams might apply it

These are possibilities this test suggests, not things it showed.

- **Developers** get an AI tool that already knows the system: which component, which props, which tokens, and
  which rules, without leaving the editor.
- **Designers** can turn a design and a short description into a working prototype built from the real
  components, and ask the server which component or pattern a design calls for.
- **People who don't write code**, such as product managers, analysts, or support staff, can describe a screen
  in product terms, as this request did, and get a working version that follows the system to try with users or
  hand to engineering.
- **Design system teams** can run a session like this on every release, as an adoption test: what the session
  can't find or gets wrong is where the guidance needs work, and its list of gaps is a roadmap.
- **Reviewers** can ask the server what a rule actually says, instead of searching the documentation.

## See also

- [Sterling and AI tools](https://mcasey10.github.io/sterling-design-system/ai-tools/): one component,
  Chip/Status, followed from Sterling's sources to the code this session wrote.
- [The screen's history](https://github.com/mcasey10/sterling-design-system/commits/main/ui/src/examples/pool-loans):
  every commit, from delivery to the last correction.
- [The request](../../demo/prompt.md), as the session received it.

Sterling is built with Claude Code, under my direction. All data in it, and here, is fictional.
