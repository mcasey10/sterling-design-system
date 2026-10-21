# The demo kit

A test of what Sterling publishes: can an AI tool, working for a team outside Sterling, build a real screen
from the React package and the MCP server alone? A fresh session in an empty folder gets the kit and one
product request, and builds the loan pooling example's Pool loans screen. It can't read this repository, the
Figma file, or the web.

## What's here

| | |
|---|---|
| `template/` | What the kit is built from: an empty React + TypeScript app (Vite), the session's `CLAUDE.md`, `.mcp.json`, and `.claude/settings.json` |
| `data/pool-2026-07.json` | The example's data, written from the plugin's example by `npm run export:demo-data`. Fictional |
| `prompt.md` | The product request to paste into the session |
| `kit.local.example.json` | A model for `kit.local.json`, the local setting that lists the folders the session must not read |
| `kit/` | The built kit (not committed) |

## Build the kit

1. Copy `kit.local.example.json` to `kit.local.json` and list the folders the session must not read: this
   repository, and anything else on the machine it could learn Sterling from. `kit.local.json` is never
   committed, so the paths exist only on this machine and in the built kit.
2. From the repository root:

```bash
npm run demo:kit
```

This builds the package and the MCP server, checks the data file against the plugin's example, and writes
`demo/kit/`:

```
sterling-ui-<version>.tgz     the React package
mcp/server.js                 the MCP server, one file
data/pool-2026-07.json        the data
design/pool-loans.png         the designer's screen
package.json, index.html, vite.config.ts, tsconfig.json, src/   an empty app
CLAUDE.md                     the rules of the session
.mcp.json                     the sterling server, and no other
.claude/settings.json         denies the web, the Figma servers, Claude in Chrome, and the folders in kit.local.json
```

## Run the demo

1. Copy `demo/kit/` to a new folder outside this repository.
2. In that folder, install the app's dependencies (this is the one step that uses the network):

```bash
npm install
```

3. Start a session there with only the kit's MCP server:

```bash
claude --strict-mcp-config --mcp-config .mcp.json
```

4. In the session, run `/mcp` and confirm `sterling` is the only server, connected.
5. Paste the request from `prompt.md`.

## How the session is kept to the kit

- **MCP servers.** `--strict-mcp-config` loads only the servers in the kit's `.mcp.json`, so servers set up
  for the user or for other projects (a Figma server, for example) aren't available. The settings also deny
  the `figma` and `figma-desktop` servers by name, in case the session is started another way.
- **The web.** The settings deny `WebFetch` and `WebSearch`, and the Claude in Chrome tools
  (`mcp__claude-in-chrome`), which drive the user's own browser: the repository and Storybook are public.
- **Files.** The settings deny reading and editing the folders in `kit.local.json`.
- **What this doesn't cover.** Deny rules apply to the file and web tools, not to every shell command, and the
  session needs the shell for `npm`. So the session's transcript is read afterwards, and every file it
  touched outside its folder and every network call is listed in the write-up.
