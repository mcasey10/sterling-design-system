// The Sterling MCP server: a small, read-only server that tells an MCP client what Sterling contains and how
// to use it. It runs locally over stdio, answers from the export bundled into this file, and opens no
// network connection and reads no file.
//
//   node dist/server.js             Serve over stdio (what an MCP client runs)
//   node dist/server.js --version   Print the version, the export's release date, and the data's hash

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { INDEX, META } from "./data";
import { TOOLS } from "./tools";

/** What a client is told once, when it connects: what Sterling is and the rules for using it. */
export const INSTRUCTIONS = [
  `${INDEX.summary} This server answers from Sterling ${META.exportVersion} (released ${META.released}).`,
  "Start with list_components and list_guidelines, or search. When generating designs or code with Sterling:",
  ...INDEX.llmsTxt.guidance.map((rule) => `- ${rule}`),
  `In code, the React components come from the ${INDEX.package.name} package: ${INDEX.package.components} ${INDEX.package.stylesNote}`,
  `Color mode: ${INDEX.package.colorMode} Density: ${INDEX.package.density}`,
].join("\n");

export const VERSION_LINE = `Sterling MCP server ${META.version} · export ${META.exportVersion}, released ${META.released} · data ${META.hash}`;

/** A server with every tool registered, not yet connected to a transport. */
export function createServer(): McpServer {
  const server = new McpServer({ name: "sterling", version: META.version }, { instructions: INSTRUCTIONS });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { title: tool.title, description: tool.description, inputSchema: tool.input, annotations: { readOnlyHint: true, openWorldHint: false } },
      async (args) => {
        const result = tool.run((args ?? {}) as Record<string, string | undefined>);
        return result.ok
          ? { content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }] }
          : { isError: true, content: [{ type: "text" as const, text: result.error }] };
      }
    );
  }
  return server;
}

// Run only as the program itself, so the tests can import createServer without starting it.
if (process.argv[1] && /server\.(js|ts)$/.test(process.argv[1])) {
  if (process.argv.includes("--version")) {
    console.log(VERSION_LINE);
  } else {
    await createServer().connect(new StdioServerTransport());
  }
}
