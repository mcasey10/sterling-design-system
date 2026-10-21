// A real exchange with the built server, for the website's AI page (step 6): starts dist/server.js over stdio,
// as an MCP client does, lists its tools, and makes two calls. Prints JSON: the server's version line, the
// get_component tool's description as a client reads it, and each call with its result. Nothing is written by
// hand, and the data is deterministic, so the page is too.
//
// Usage: node scripts/exchange.mjs   (after `npm run build`)

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const server = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/server.js");
if (!existsSync(server)) {
  console.error("mcp/dist/server.js is missing. Run `npm run build` in mcp/ first.");
  process.exit(1);
}

/** The calls the page shows, in order. */
const CALLS = [
  { name: "get_component", arguments: { name: "Chip/Status" } },
  { name: "get_pattern", arguments: { name: "Status chips" } },
];

const client = new Client({ name: "sterling-website", version: "0.0.0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [server] }));
try {
  const { tools } = await client.listTools();
  const calls = [];
  for (const call of CALLS) {
    const result = await client.callTool(call);
    if (result.isError) throw new Error(`${call.name}: ${result.content[0].text}`);
    calls.push({ request: call, result: JSON.parse(result.content[0].text) });
  }
  const version = client.getServerVersion();
  console.log(
    JSON.stringify(
      {
        server: { name: version?.name, version: version?.version },
        tools: tools.map((t) => t.name),
        getComponent: { name: "get_component", description: tools.find((t) => t.name === "get_component")?.description },
        calls,
      },
      null,
      2
    )
  );
} finally {
  await client.close();
}
