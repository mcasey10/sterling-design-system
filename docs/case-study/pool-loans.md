# Case study: Sterling 1.2, a design system AI tools can use

## Sterling

Sterling is a design system: design tokens, components and usage guidance that keep product screens consistent.
Designers use it in Figma, developers use its React components, and AI tools can look it up while they write
code. All three come from one set of definitions, so they always describe the same thing, and automated checks
fail if they drift apart.

This case study is about version 1.2.0, which added an API for AI coding tools. To show what it does, an AI
session was given a request for a sample application's screen, a picture of the screen's design, and sample
data, with Sterling's package and MCP server as its only Sterling references. What it built is part of the case
study.

## Built for adoption and governance

A design system only helps if teams use it, and use it correctly. Sterling is set up so that both are easier.

- **One place to start, a way in for each reader.** The website's Start here page sends each reader where they
  need to go: an evaluator to the token reference and Storybook, a product designer to the Figma library, a
  developer to the `sterling-ui` package, an AI-assisted developer to the MCP server, a design system owner to the
  repository. Every setup is written to one standard, ending with how you know it worked.
- **Correct use is checked, not just documented.** Every color pair is checked for contrast, every component
  for a description and a documentation link, Figma and code for the same variants and properties, the code for
  raw values where a token belongs, every story and website page for accessibility, and the files for AI tools
  against their sources. A team building with Sterling inherits those checks instead of writing them.
- **One source of truth.** The tokens, the component definitions, and the guidance are written once. The Figma
  library, the website, and the files for AI tools are generated from them, and the React components follow them,
  so a decision made once reaches every one of them, and automated checks fail if they drift apart.

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
components, and checks catch the places where they drift. It also separates two jobs, owning the system and
designing products with it, which "What it means for each role" below takes in turn.

## What came before this test

The test relied on two layers of earlier work.

- **The system.** Versions 1.0 to 1.1.1 built Sterling itself: the tokens; 24 components, in Figma and, since
  1.1, in React in Storybook, checked against each other for parity; the guidelines; and the nine patterns. 1.2
  packaged the components as `sterling-ui` and added the AI files, `llms.txt`, and the MCP server.
- **The product design.** The Pool loans screen was already designed in Figma with Sterling's library. A picture
  of that design, the design picture below, was the session's reference.

One person held both roles here: the system's owner and the product designer.

## The test

**The request** ([demo/prompt.md](../../demo/prompt.md)) asked for the Pool loans screen of a loan pooling
tool: a trader reviews the loans in a draft pool, deals with the loans that break an eligibility rule, and
submits the pool. It describes the screen, the rules, and what the trader can do in product terms, not by
Sterling's component names, and asks the session to report the components it used and what Sterling was
missing. All data in it is fictional.

**The kit** (`npm run demo:kit`, see [demo/README.md](../../demo/README.md)) gave the session an empty React
app, the design picture, and three things from Sterling:

- the `sterling-ui` package: the React components and the token CSS;
- the MCP server, registered for the session;
- the pool's data: its totals, its rules, and a sample of its loans, 21 of the 186 (the first page of each
  saved view), to keep the kit small.

This is the design picture the session was given, a PNG of the design from the Sterling Figma file's example
page:

![The design picture, the Pool loans screen as designed: a filter panel on the left, the pool's loans in a grid with one exception flagged, the bulk action bar, and a pool summary on the right listing the three issues that block submission](../images/example-pool-loans.png)

**Kept to the kit.** The session had to learn Sterling only from the package and the MCP server, so it started
with only the kit's MCP server, and its settings denied the web, the Figma servers, and this repository. Its
transcript, read afterwards with `scripts/demo-transcript.mjs`, shows no other MCP server, nothing from the web,
and no file outside the kit read or written.

**What the session could and couldn't see.** It could see the design picture, which it read as an image. It
couldn't see the app it built: looking at a running app takes a browser, and the only browser tool available,
Claude in Chrome, drives the user's own Chrome, with their sign-ins and the open web. That would have broken the
isolation, so it was turned off for the session. This was deliberate, and it had a cost: the session couldn't
look at its own work, use it by keyboard, or check it with a screen reader. Near the end it tried Claude in
Chrome, found it off, and checked its numbers through the code instead. The kit's settings now deny Claude in
Chrome outright.

## The session

Claude Code 2.1.299, with Opus 5.5, in auto mode, on October 14. Times are from the transcript (UTC).

| Time | What happened |
|---|---|
| 12:20:05 | The request |
| 12:20:09 to 12:20:13 | It looked at the empty app, the data file, and the design picture |
| 12:20:13 to 12:21:08 | **40 calls to Sterling's MCP server, in 55 seconds:** the component list and the guideline list; all 9 patterns; all 7 guideline sections; 16 components (the data grid and its parts, the bulk action bar, pagination, the status chip, summary metric, tabs, dialog, empty state, button, link, filter chip, select, and option); and the tokens, by collection |
| 12:20:30 to 12:24:25 | Alongside, it read the installed package's built files through shell commands, as part of using the package: the type declarations, `index.js`, and `styles.css` |
| 12:25:11 to 12:28:41 | It wrote the app: six files |
| 12:28:46 to 12:29:25 | It built the app, started it, checked its data and query logic against the request's numbers, and scanned its CSS for raw values |
| 12:29:44 | It reported the app done |

About ten minutes from the request to a working app. The app it delivered is committed unchanged
([2872cf0](https://github.com/mcasey10/sterling-design-system/commit/2872cf0)) and is in Storybook as
Examples › Pool loans, in its corrected form.

## What the session reported

As the request asked, it ended with a report, and the report was candid:

- **What it couldn't check.** Without a browser, it said plainly that nothing in the app it built had been
  checked visually, with a keyboard, or with a screen reader. What it had checked was the numbers, by running its data
  code: 186 loans, 181 Ready, 2 Exception, 3 Signed off, Harbor Point at 32%, 3 issues.
- **The components it used:** 20 of Sterling's, among them the status chip, filter chip, bulk action bar,
  pagination, summary metric, select, dialog, and the grid's parts.
- **The most useful tool:** `get_pattern`. In its words, the patterns "decided most of the behaviour".
- **Seven gaps in Sterling:** the data grid couldn't give a flagged cell its reason for screen readers; no page
  checkbox outside the data grid; no grouped options or descriptions in Select; no toast or inline message; no
  card or panel; no screen-reader-only class or layout tokens; no tooltip.
- **Its guesses,** listed one by one.

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
| f | Status links wrap without a leading separator ([595c938](https://github.com/mcasey10/sterling-design-system/commit/595c938)) | In the summary's "Loans by status", a wrapped line began with "·", with no space before the first one; found while preparing the Community images | The session |

## What the checks missed

None of Sterling's automated checks caught these three problems.

**Reset cleared everything.** My own hands-on test found it: Reset emptied every filter, including the saved
view's. The session had followed the pattern as written, which said "Reset clears it". The gap was in
Sterling's guidance, not in the session's reading of it. The patterns now say that Reset returns every field to
the active saved view's filters, and Clear all removes every filter; correction d made the screen do so.

**"Any lender" showed no loans.** Choosing "Any lender", or Clear all, showed the empty state for loans outside
the sample: correct, but in use the app looked broken, partly because the message explaining it was cut off
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

**It worked.** From a request in product terms, the session looked Sterling up before it built, patterns most,
and in about ten minutes built a working screen whose behavior came mostly from those patterns.

**It built through the system, not around it.** The screen used 20 of Sterling's components, and when two
problems turned out to be Sterling's (the data grid's missing capability and the Reset wording), they were fixed
once, in Sterling, and the screen picked them up.

**Three of the six fixes were in Sterling itself.** Three corrections fixed the session's own work (column widths,
an extra settings panel, a wrapping separator); the other three traced back to Sterling: a capability the data grid
lacked, a pattern that said the wrong thing, an empty state that hid its message. An AI tool reads the guidance
literally, so building with it tests the design system itself: it finds where the guidance is wrong or missing.

**It still needed a person, for two different things.** Looking at the app and trying it: the session couldn't,
for want of a browser, and said so; a browser that reaches only the local app would let the next session do it
itself, and would probably have caught the cut-off column (correction b). Judging whether the behavior is right:
the Reset problem was found by my own hands-on use of the app, not by any check, and a browser wouldn't have
changed it, because the session had followed Sterling's guidance as written. Each problem found that way now has a check, so the next session, or the
next team, is caught sooner.

**The limits of this test.** One session, one screen, one model, and a sample of the data. It started from a
finished design and a system that already covered almost all of the screen: the session found seven gaps, and
worked around each. A screen that needs a new component would first need the system's owner to add it. Two
natural next tests: a run that can see the app it builds, with a browser restricted to the local app, and a run
from the request alone, without the design picture. And Sterling was built, and the session directed, by one
person; it hasn't yet been used by a team.

## What it means for each role

- **The design system's owner.** Adding a component, a slide-out panel for example, is one piece of work in one
  place: its definition and documentation entry, the Figma spec, the React component and its story. The checks
  hold them together (parity between Figma and code, the AI files against their sources), the AI files and the
  MCP server regenerate from the same definitions, and a release ships it. Until then an AI tool reports the gap
  or works around it, as this session did with the grid, and the gap comes back to the owner. Running a session
  like this on every release would make an adoption test, and its list of gaps a roadmap.
- **The product designer** designs screens with the components that exist. Once a system matures, most new
  screens need no new component; when one does, it's a request to the system's owner, not a one-off inside the
  product. A change the owner makes to a component or a rule reaches every product built with it.
- **Developers, with an AI tool or without,** build from the package with the system's guidance at hand: which
  component, which props, which tokens, and which rules apply, without leaving the editor.
- **People who don't write code**, such as product managers or analysts, could describe a screen in product
  terms, as this request did, and get a working version built from the real components, to try with users or
  hand to engineering. That is a possibility this test suggests; it wasn't tested here.
- **Reviewers and evaluators** can ask the server what a rule actually says, instead of searching the
  documentation.

## See also

- [The demo replay](https://mcasey10.github.io/sterling-design-system/demo/): this session, step by step: the
  request, every call to the MCP server with its answer, the session's own notes, and the screen as delivered.
- [Sterling and AI tools](https://mcasey10.github.io/sterling-design-system/ai-tools/): one component,
  Chip/Status, followed from Sterling's sources to the code this session wrote.
- [The screen's history](https://github.com/mcasey10/sterling-design-system/commits/main/ui/src/examples/pool-loans):
  every commit, from delivery to the last correction.
- [The request](../../demo/prompt.md), as the session received it.

Sterling is built with Claude Code, under my direction. All data in it, and here, is fictional.
