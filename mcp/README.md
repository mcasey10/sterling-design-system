# Sterling MCP server

A small, read-only [Model Context Protocol](https://modelcontextprotocol.io) server that lets an AI tool ask
Sterling what it contains and how to use it: its components, tokens, guidelines, and patterns.

- It runs on your machine, over stdio. It opens no network connection and reads no file: everything it
  answers from is inside the one built file, `dist/server.js`.
- Its data is a copy of the export in [`ai/`](../ai), made when the server is built.
- It isn't published to a package registry. Build it from this repository.

## Build

Node.js 20 or newer. From this folder:

```bash
npm install
```

```bash
npm run build
```

This writes `dist/server.js`. To see which version of Sterling it carries:

```bash
node dist/server.js --version
```

It prints the server's version, the export's version and release date, and a hash of the data, for example
`Sterling MCP server 1.1.1 · export 1.1.1, released 2026-10-11 · data 3f9c…` (64 characters in full).

## Run it anywhere

`dist/server.js` is one self-contained file: the server, the libraries it needs, and the export are all
inside it. Copy that file to any folder, on any machine with Node.js 20 or newer, and run it from there.
Nothing else needs installing, and it doesn't need this repository.

```bash
node /path/to/server.js --version
```

## Connect

**Claude Code.** Use the full path to the file, wherever you keep it:

```bash
claude mcp add sterling -- node /path/to/server.js
```

To give one project the server without adding it for every project, put a `.mcp.json` file in that project's
folder (the path can be relative to the folder):

```json
{
  "mcpServers": {
    "sterling": { "command": "node", "args": ["./mcp/server.js"] }
  }
}
```

**Any other MCP client.** Add a stdio server whose command is `node` and whose argument is the built file.
Most clients take this as JSON:

```json
{
  "mcpServers": {
    "sterling": {
      "command": "node",
      "args": ["/path/to/server.js"]
    }
  }
}
```

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

## Keeping it current

The server's data is copied from `ai/` each time it is built, so rebuild it after the export changes
(`npm run export:ai` at the repository root, then `npm run build` here). `npm test` fails if the copy or the
built file is older than `ai/`, and if the built file contains any network code.

```bash
npm test
```
