# Sterling MCP server

A small, read-only [Model Context Protocol](https://modelcontextprotocol.io) server that lets an AI tool ask
Sterling what it contains and how to use it: its components, tokens, guidelines, and patterns. It reads no files:
everything it answers from, a copy of Sterling's [AI files](https://github.com/mcasey10/sterling-design-system/tree/main/ai),
is built into it.

## Set up

<!-- generated: setup (npm run docs:sync, from definitions/setup.ts) -->
It works with any MCP client: Claude Code, Claude Desktop, editors with MCP support, and others. It's one file, `sterling-mcp.js`, that runs on your machine and makes no network requests.

### Where

Any terminal: PowerShell on Windows, Terminal on macOS, or the terminal in your editor. No administrator rights needed. Any folder: the commands use the file's full path.

### You need

- **Node.js 20 or later.** Check: `node --version` shows `v20` or higher. If not, install the LTS version from nodejs.org, then open a new terminal.
- **An AI tool that supports MCP servers.** Any MCP client works. Its documentation says where to add an MCP server.
- **For the first prompt: a React project with sterling-ui installed.** See Install sterling-ui (https://mcasey10.github.io/sterling-design-system/install/). Setting up the server doesn't need it, so you can create the project afterwards.

### Do

1. Download `sterling-mcp.js` from the latest GitHub Release (https://github.com/mcasey10/sterling-design-system/releases/latest/download/sterling-mcp.js). Put it in a folder where it can stay, for example a `tools` folder in your home folder, and note its full path.

2. Check that it runs. In any terminal, from any folder:

   ```bash
   node "/full/path/to/sterling-mcp.js" --version
   ```

   It prints `Sterling MCP server 1.2.0 · …`.

3. Register it with your AI tool, once:

   **Claude Code.** In any terminal, from any folder:

   ```bash
   claude mcp add --scope user sterling -- node "/full/path/to/sterling-mcp.js"
   ```

   **Any other MCP client.** Open the client's MCP settings file in your editor (its documentation says where), add a server with command `node` and argument the file's full path, save, and restart the client:

   ```json
   {
     "mcpServers": {
       "sterling": { "command": "node", "args": ["/full/path/to/sterling-mcp.js"] }
     }
   }
   ```

4. Check the connection: start your AI tool (in Claude Code, run `claude` in a terminal, then `/mcp`) and ask: "Which Sterling component shows a record's status?" The first time it calls one of Sterling's tools, Claude Code asks for permission: allow it.

5. Try the first prompt (skip it until you have a React project with sterling-ui installed): open your AI tool in that project's folder (in Claude Code, run `claude` there, and if it asks whether you trust the folder, choose Yes), check it lists `sterling` as connected, and ask:

   > Using Sterling, build a table of five fictional orders, each with a status, using sterling-ui, and show it in `src/App.tsx`. Look up the components and the Status chips pattern first.

   When it's done, run `npm run dev` in the project folder (in a second terminal if your AI tool is in the first) and open the address it prints.

### Scope

`--scope user` makes Sterling available in every project, which is right for most people. To share it with a team through one repository instead, put the JSON above in that project's `.mcp.json`, with a path that works for everyone. Claude Code asks each person to approve a project's servers the first time.

### It worked if

Your tool lists `sterling` as connected, and answers Chip/Status, from the server.

With the first prompt, the tool looks up the components and the Status chips pattern before it writes code, and the page shows a table of orders with Sterling's status chips, each with an icon and a label.

Next: the full worked example, a complete screen, is the Pool loans request (https://github.com/mcasey10/sterling-design-system/blob/main/demo/prompt.md).

### If it didn't

- "node" not found: Node.js isn't installed, or the terminal was opened before it was. Install it, then open a new terminal.
- The server doesn't start: the path is wrong, or it has spaces and isn't in quotes. In JSON on Windows, write the path with forward slashes: `C:/Users/…/sterling-mcp.js`.
<!-- /generated: setup -->

## Tools

Every tool is read-only and returns JSON.

| Tool | Arguments | Returns |
|---|---|---|
| `list_components` | `category` (optional): Controls, Chip, Grid, Input, Overlay, Summary, Tabs, or Icon | Each component's Figma name, React name, and one-line description |
| `get_component` | `name`: a Figma name (`Grid/Data grid`), a React name (`DataGrid`), or an icon (`Icon/search`) | The full entry: guidance, Figma properties, React props, states in code, and links. The 20 icons share one entry |
| `get_tokens` | `collection` (optional), `mode` (optional) | With no arguments, the collections and their modes. With a collection, its tokens: name, CSS name, value, description |
| `get_token` | `name`: a Figma name (`surface/background`), a CSS name (`--stl-color-surface-background`), a DTCG path (`color.surface.background`), or a text style (`Body`) | One token: type, description, CSS name, what it aliases, and its value in every mode |
| `list_guidelines` | none | The 7 guideline sections and 9 patterns, each with a one-line summary |
| `get_guideline` | `section`: for example `Accessibility` | The section's rules and its do / don't pairs |
| `get_pattern` | `name`: for example `Saved views` | The pattern: when to use it, when not to, and its numbered steps |
| `search` | `query`: a word or phrase | The best matches across components, guidelines, patterns, and tokens, each with the tool to call next |

Names are matched by their letters and digits, so `data grid`, `Grid/Data Grid`, and `DataGrid` all find the
same component. An unknown name returns an error that lists the closest matches.

`node sterling-mcp.js --version` prints the server's version, the version and release date of the files it
carries, and a hash of them: `Sterling MCP server <version> · export <version>, released <date> · data <hash>`.

## For maintainers: build it from this repository

From this folder (`mcp/`), with Node.js 20 or later:

```bash
npm install
```

```bash
npm run build
```

This writes `dist/server.js`, the file each Release attaches as `sterling-mcp.js`: the server, the libraries it
needs, and a copy of `ai/`, in one file. Its data is copied from `ai/` each time it is built, so rebuild it after
the export changes (`npm run export:ai` at the repository root, then `npm run build` here). `npm test` fails if
the copy or the built file is older than `ai/`, if the built file contains any network code, or if it doesn't run
alone in an empty folder.

```bash
npm test
```

`scripts/exchange.mjs` calls the built server as a client would; the website's AI page shows the exchange.
