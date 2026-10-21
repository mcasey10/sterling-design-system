# Journey test, Sterling 1.2

Before the 1.2 release, each kind of reader followed only Sterling's published documentation, from a new, empty
folder outside the repository, to see where they would have to guess. This records each journey, each guess, what
was fixed, and what can only be tested after the release.

## Method

- **The documentation as published:** the website built from `release/1.2` (`npm run site`) and served locally
  (`npm run site:serve`), with Storybook beside it, `llms.txt`, and the AI files.
- **A new folder for each journey**, outside the repository, with nothing installed in it.
- **The Release downloads** don't exist until the release, so local files stood in for them: the package built by
  `npm run package` (`sterling-ui-1.1.1.tgz`), and the MCP server built by `npm run build` in `mcp/`, copied as
  `sterling-mcp.js`.
- **Tools:** Node.js 24, npm 11, Claude Code 2.1.300, on Windows 11.

## Results

| Reader | Followed | Result |
|---|---|---|
| Developer | Start here → /install/ → a new Vite React project → install from the downloaded file → a Sterling button → Storybook Docs | Works. Three guesses, one of them a layout problem (all fixed) |
| AI-assisted developer | Start here → /ai-tools/#set-up → `--version` check → register → the "It worked if" question; and llms.txt read by URL | **Found a defect: the server didn't run under its Release name (fixed).** Then works. One guess (fixed) |
| Evaluator | Start here → Storybook → back through the Introduction → tokens → AI page | Works. One cosmetic finding (fixed) |
| Designer | Start here → Figma Community | Address only: Figma itself can't be driven from here. Re-test after release |
| Maintainer | A new clone → README "Work on Sterling" → Storybook, the plugin, the website, the checks | Works; the plugin builds to the same bytes as the reference build. One guess (fixed) |

## The journeys

### Developer

1. **Start here, Developer row:** "sterling-ui from the GitHub Release" opens /install/.
2. **You need:** Node.js (`node --version`: v24) and a React 19 project. There was no project, and the page says
   "start a new one with Vite" without the command. **Guess:** `npm create vite@latest`, template React and
   TypeScript. Then `npm ls react` showed `react@19.3.1`, as the page says.
3. **Do**, the downloaded-file route: the tarball into `vendor/`, then `npm install ./vendor/sterling-ui-1.1.1.tgz`.
   `package.json` lists `sterling-ui`.
4. **The two style imports** at the top of `src/main.tsx`, as written.
5. **It worked if:** the page gives the import and the `<Button>` but not where to put them. **Guess:**
   `src/App.tsx`.
6. The app type-checked and built, and the button showed in Sterling's colors, in Light and Dark. **But it
   stretched across the page inside a bordered column:** the new Vite project's own stylesheet
   (`src/index.css`, imported in `src/main.tsx`) styles the page's root. With that import removed, the button
   showed as it should.
7. **Next:** the Storybook Docs link works.

### AI-assisted developer

1. **Start here, AI-assisted developer row:** "MCP server from the GitHub Release" opens /ai-tools/#set-up.
2. **The file** in a `tools` folder, as the page suggests.
3. **The check**, `node "…/sterling-mcp.js" --version`, printed **nothing**. The server only started when its file
   was named `server.js`, its name in the repository; under the Release name, `sterling-mcp.js`, it exited
   silently, so every MCP client would have seen a server that never answers. The test that runs the built server
   in an empty folder copied it as `server.js`, so it didn't notice.
4. After the fix, the check printed `Sterling MCP server 1.1.1 · …`, as the page says.
5. **Register:** the page's main route, `claude mcp add --scope user`, changes the user's own Claude Code settings,
   so it waits for the post-release test. The team route was followed instead: the JSON from "Any other MCP
   client" in the project's `.mcp.json`, with forward slashes, as "If it didn't" advises. `claude mcp list` then
   showed the server as **"Pending approval"**: Claude Code asks each person to approve a project's servers the
   first time, which the page didn't say. **Guess:** what that meant.
6. **It worked if:** asked "Which Sterling component shows a record's status?", a Claude Code run with only this
   server answered Chip/Status, from the server's `search` tool.
7. **llms.txt**, read by URL: every link in it resolved. The website's pages and the AI files answered from the
   local site; the raw files on `main` exist in the repository and go live with the merge.

### Evaluator

1. **Start here:** Token reference and Storybook open; the Figma Community preview is an outside address.
2. **Storybook:** the Introduction's links (Install, Start here, Token reference, AI tools) go to the right pages
   of the website, and the Figma Community link is the Community page.
3. **The AI page:** the seven steps, the diagram in each color mode, and the setup.
4. **Cosmetic:** the browser tab for Storybook read "storybook - Storybook", while its sidebar says
   "Sterling 1.1.1".

### Designer

The Figma links on Start here and in the README go to the Community page. Duplicating the file and following its
Read me needs Figma, so it is the first post-release re-test below.

### Maintainer

1. **A new clone** of `release/1.2`, then the README's "Work on Sterling".
2. **Storybook:** `npm install --prefix ui`, then `npm run storybook`; it opened at http://localhost:6006.
3. **The Figma library:** `npm install --prefix plugin`, then `npm run build --prefix plugin`. The build was
   byte-for-byte the reference build (the same hash), so a new clone builds the same plugin. Importing it into
   Figma needs the Figma app: post-release.
4. **The website:** the README said it "needs `npm install` in `ui/` and in `mcp/` first", without the command for
   `mcp/`. **Guess:** `npm install --prefix mcp`, like the others. Then `npm run site` built it, and
   `npm run check:site` passed in the clone.
5. **The checks** from CONTRIBUTING passed in the clone, including `check:excerpts`, which reads the commit the
   example was delivered in. In a shallow clone (`--depth 1`) it fails, with a message that names the cause:
   CI and the Pages build check out the full history for it.

## Fixed

| Found in | Problem | Fix |
|---|---|---|
| AI-assisted developer | The MCP server didn't run under its Release name, `sterling-mcp.js` | It runs when it is the program Node started, whatever its name (`mcp/src/server.ts`). The empty-folder test now copies it as `sterling-mcp.js` and checks `--version` |
| Developer | A new Vite project's stylesheet changes Sterling's layout | Install sterling-ui, Do: "In a new Vite project, also remove `import './index.css'` from `src/main.tsx`: the starter's own styles change Sterling's layout." |
| Developer | Where the test button goes | It worked if: "…for example in `src/App.tsx`." |
| AI-assisted developer | A project's `.mcp.json` server waits for approval | Set up the MCP server, Scope: "Claude Code asks each person to approve a project's servers the first time." |
| Maintainer | The command for the MCP server's dependencies | README, "The website and the checks": `npm install --prefix mcp` |
| Developer | The command for a new React 19 project | Install sterling-ui, You need: "If not, start a new one with Vite: run `npm create vite@latest my-app -- --template react-ts`, then `cd my-app` and `npm install`, then continue with the steps below." |
| Evaluator | Storybook's browser tab read "storybook - Storybook" | The tab reads the same as the sidebar title, "Sterling" and the version (`ui/.storybook/manager.ts`) |

## Re-test after the release

- **The designer journey:** duplicate Sterling from Figma Community, and follow its Read me.
- **The package from the Release address:** `npm install https://github.com/…/releases/download/v1.2.0/sterling-ui-1.2.0.tgz`.
- **The MCP server from `releases/latest/download/sterling-mcp.js`**, registered with
  `claude mcp add --scope user`, run for real, then the first prompt on the AI page.
- **The live website:** `/`, `/install/`, `/tokens/`, `/ai-tools/`, Storybook, and `/llms.txt` with every link in
  it, including the raw files on `main` (the checklist in `docs/reference.md`, "After a release: check the live
  site").
- **The Figma Community page:** its text and links.
- **The plugin imported into Figma** from a new clone, then Build library and Build example in an empty file.
