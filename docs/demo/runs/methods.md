# Repeat runs: methods

On October 14 one Claude Code session built the Pool loans screen from the demo kit
([case study](../../case-study/pool-loans.md)). Six corrections followed; three of them were in Sterling: the
data grid's row descriptions, Reset returning to the active view's filters, and the data grid's empty state
staying in view at narrow widths. These runs repeat that session, unchanged where possible, to see whether the
fixes hold and how consistent fresh runs are.

The checklist is in [checklist.md](checklist.md) and the steps for each run in [procedure.md](procedure.md).
Both were fixed before run 1. Sterling isn't changed during the series: new gaps go on the backlog.

## The series

- **Main:** 5 runs on one Windows computer, each in a fresh copy of the kit, with the same request.
- **Control:** 2 runs on the kit as it was before the fixes (commit 9888b34), only if any fix check scores below
  5 of 5.
- **Cloud:** 3 runs in Claude Code cloud sessions, after the main runs are scored. Reported separately, never
  pooled with the main runs.
- **Browser:** a variant with a browser limited to the local app, decided after scoring.

## What each run gets

Built once with `npm run demo:kit` from Sterling 1.2.0, and copied unchanged into each run's folder:

| | |
|---|---|
| `sterling-ui-1.2.0.tgz` | The React package. SHA-256 `b577b03892adebc9732ec34185b9d44d1b5a1c9f7852d2682b7350f643af5c18`, identical to the v1.2.0 release asset |
| `mcp/server.js` | The MCP server. SHA-256 `98d9c59eacf9be606b710436bdbc8930959bd03b4e7371dbff3f56592334438e`, identical to the release asset `sterling-mcp.js`. `--version`: `1.2.0 · export 1.2.0, released 2026-10-21 · data dce7ff6c…` |
| `package-lock.json` | One lockfile for every run, local and cloud (see below) |
| `data/pool-2026-07.json` | The data, unchanged since October 14 |
| `design/pool-loans.png` | The designer's screen, unchanged |
| `CLAUDE.md`, `.mcp.json`, `.claude/settings.json` | The session's rules, the one server, and the deny rules |

The request is [demo/prompt.md](../../../demo/prompt.md), unchanged since October 14, pasted as the first message.

### The lockfile

The October 14 kit had no lockfile, so its `npm install` took whatever versions the ranges allowed that day. The
series uses one lockfile, made once from the October 14 run's own: every third-party package is the version
that run installed (React 19.3.0, Vite 8.3.4, TypeScript 7.0.2, @vitejs/plugin-react 6.1.2), and only
`sterling-ui` and the packages it brings changed for 1.2.0. Runs install with `npm ci`. Each run also records
`npm ls --depth=0`.

## How each session is started

From PowerShell in the run's folder, with a separate Claude Code configuration folder and automatic updates off:

```
$env:CLAUDE_CONFIG_DIR = "C:\sterling-runs-config"
$env:DISABLE_AUTOUPDATER = "1"
claude --strict-mcp-config --mcp-config .mcp.json --setting-sources project,local --model claude-opus-5-5 --effort medium --permission-mode auto
```

- **Model and effort:** Opus 5.5 at medium effort, in auto mode, as on October 14 (all three are recorded in
  that session's transcript).
- **MCP servers:** only the kit's. The maintainer's own registration of the same server was removed for the
  series. Each run saves its `/mcp` view and the list of running Node processes, which shows `./mcp/server.js`.
  If any claude.ai connector appears, the run stops.
- **Claude Code version:** held at one version for the series (automatic updates off) and recorded at the start
  and end of each run.

## What the session can't use

### Configuration outside the run folder

The separate configuration folder means the session reads none of the maintainer's own Claude Code settings.
Excluded, item by item (none of them mentions Sterling or the Pool loans screen):

- user settings, including a list of allowed commands from another project (among them `curl`, `node`, and
  PowerShell commands, which would have run without the auto-mode check);
- user-scope MCP servers (also excluded by `--strict-mcp-config`);
- per-project state and other projects' memory;
- the plugin marketplace settings.

There's no user-level `CLAUDE.md`, hook, agent, command, rule, output style, or managed setting to exclude.
Skills and one plugin synced from the claude.ai account may still appear, as they did on October 14 (none
mentions Sterling); each run records `/skills` at its start.

### Folders and files

The kit's settings deny reading and editing, by path:

- this repository, and every other folder on the machine with Sterling's source, earlier test runs, or the
  October 14 run's folder (the screen as delivered);
- the folder that held the user-scope MCP server;
- the maintainer's Claude Code transcripts, file history, prompt history, backups, and session files;
- the series' private folder (finished runs' transcripts, calibration) and its folder of finished runs;
- in the series' configuration folder, everything but `projects/`, where the running session keeps its own
  transcript and saved tool outputs.

Each run works in `C:\sterling-runs\run-NN`; when it ends, its folder moves to the finished-runs folder and its
transcript to the private folder, so later runs can't read either.

### The web

Web fetch and web search, the Figma servers, and Claude in Chrome are denied, as on October 14 (Claude in Chrome
was added to the kit's settings after that session; it was off for it).

### What deny rules don't cover

Deny rules bind the file and web tools, not every shell command. The transcript audit lists every shell command
and file-tool path outside the run's folder, every read of the package's built files inside `node_modules`
(listed on their own, since October 14's session read them as part of using the package), every network call,
and every MCP call by server.

## Differences from October 14

| | October 14 | These runs |
|---|---|---|
| Sterling | 1.1.1 package and export | 1.2.0, with the three fixes |
| Claude Code | 2.1.299 | Held at one version (2.1.308 when the series was planned); recorded per run |
| Start | CLI | CLI, with `--strict-mcp-config`, `--setting-sources project,local`, and the model, effort, and mode given as flags |
| Configuration | The maintainer's own | A separate folder (see above) |
| Install | `npm install`, no lockfile | `npm ci` from one lockfile with October 14's versions |
| Deny list | This repository and one other folder | Extended (see above) |
| Claude in Chrome | Off, not denied | Denied |
| Folder | Inside the user's Documents | `C:\sterling-runs\run-NN` |

## The data, as it is

The data file isn't changed for the series. Two quirks, recorded so scoring doesn't count them against a run:

- **"Harbor Point" and "Harbor Point Lending."** The saved view and the lender-cap total name the lender "Harbor
  Point"; each loan names it "Harbor Point Lending". A run has to treat them as the same lender.
- **21 loans.** The file says it holds "the first page of each saved view": that would be 13 loans (12 for
  Harbor Point loans; the Exceptions view's 2, one of them a Harbor Point loan). It holds 21. The other 8 are in
  the pool and fictional like the rest, and can appear under other filters.

Because the file holds 21 of 186 loans, the true count is known only for some filters: none (186), Lender is
Harbor Point (58), and each status alone (181, 2, 3). For any other filter a correct screen can show only the
sample's loans; it mustn't invent rows or totals. How it words that is noted, not scored.

## Scoring

The scorer (`demo/scoring/`) was written after the checklist and before run 1, and used unchanged on every run;
its files' SHA-256 values were recorded privately before run 1. It builds the run with `npm run build`, serves it
with `vite preview`, and drives it in Chrome with Playwright, finding elements by role and accessible name. It
runs axe in Light and Dark, in each density. The token check is a copy of Sterling's own CSS check, pointed at the
run's folder.

### Checks beyond the scorer, and owners

After each run, once its folder and transcript are out of the run's reach, a separate Claude Code session in the
repository, following written steps, does the checks that need reading or measuring (the states the scorer can't trigger, the report,
the transcript audit), and records the actual owner of every fail with a one-line reason from the transcript and the
MCP answers: did Sterling's guidance cover it clearly, and did the run read it? Michael does, by hand, the keyboard check, the
comparison with the design, and, optionally, a screen-reader check, and reviews what the session flags.

### Calibration

Before run 1 the scorer was run on five versions of the screen, with known answers:

- the October 14 screen, as delivered (fails the three fix checks: its own table, Reset clearing every filter,
  and an empty state outside the data grid);
- the corrected screen (Examples › Pool loans; passes them; fails "no invented data", because correction e
  generated the rest of the pool);
- the corrected screen on the package from just before the empty-state fix (FIX-c: mechanism passes, outcome
  fails);
- the corrected screen on the package from just before the row-descriptions fix (FIX-a: both parts fail);
- the corrected screen with its Ready count changed to 16 in the page (NUM-181 must not pass).

Where the October 14 and corrected screens word things differently, neither may fail on wording alone. The
results are in [calibration.md](calibration.md).

## The record

- **Public, here:** this file, the checklist, the procedure, the calibration, and for each run its results, its
  final report, screenshots in Light and Dark, its `src/`, and its session record (`session.json`, written by
  `npm run demo:extract`, which leaves out paths, the person's messages, and reasoning).
- **Private, kept outside the repository:** the raw transcripts, the kit's local deny list, the per-run records
  that name local paths (the `/mcp` view, the process list), the dry-run login record, and the scorer's hashes.
