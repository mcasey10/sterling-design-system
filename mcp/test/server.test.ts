// The server through the protocol, and the built file: a client lists and calls the tools; the bundle
// carries a current copy of the export, imports no network module, and runs from a folder with nothing
// else in it.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { INSTRUCTIONS, VERSION_LINE, createServer } from "../src/server";
import { TOOL_NAMES } from "../src/tool-names";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundle = join(here, "dist/server.js");
const FILES = ["index.json", "components.json", "tokens.dtcg.json", "guidelines.json"];
const text = (result: any): string => result.content[0].text;

async function connected() {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return { client, close: () => Promise.all([client.close(), server.close()]) };
}

test("a client sees the eight tools, each read-only, with a description and a schema", async () => {
  const { client, close } = await connected();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name), [...TOOL_NAMES]);
  for (const tool of tools) {
    assert.ok(tool.description && tool.description.length > 80, tool.name);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.annotations?.readOnlyHint, true);
  }
  assert.deepEqual(tools.find((t) => t.name === "get_component")!.inputSchema.required, ["name"]);
  assert.equal(client.getInstructions(), INSTRUCTIONS);
  assert.match(INSTRUCTIONS, /Use only the components and icons listed/);
  assert.equal(client.getServerVersion()?.name, "sterling");
  await close();
});

test("a client can call every tool", async () => {
  const { client, close } = await connected();
  const call = async (name: string, args: Record<string, string> = {}) => {
    const result: any = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, `${name}: ${text(result)}`);
    return JSON.parse(text(result));
  };
  assert.equal((await call("list_components")).count, 24);
  assert.equal((await call("list_components", { category: "Grid" })).count, 8);
  assert.equal((await call("get_component", { name: "DataGrid" })).name, "Grid/Data grid");
  assert.equal((await call("get_component", { name: "Icon/Search" })).requested.icon, "search");
  assert.equal((await call("get_tokens")).collections.length, 6);
  assert.equal((await call("get_tokens", { collection: "color", mode: "Dark" })).mode, "Dark");
  assert.equal((await call("get_token", { name: "--stl-space-8" })).value, "8px");
  assert.equal((await call("list_guidelines")).patterns.length, 9);
  assert.equal((await call("get_guideline", { section: "Color" })).rules.length, 4);
  assert.equal((await call("get_pattern", { name: "Saved views" })).steps.length, 3);
  assert.ok((await call("search", { query: "empty state" })).results.length > 0);
  await close();
});

test("an unknown name comes back as a tool error with the closest matches", async () => {
  const { client, close } = await connected();
  const result: any = await client.callTool({ name: "get_component", arguments: { name: "DataTable" } });
  assert.equal(result.isError, true);
  assert.match(text(result), /No component named "DataTable"\. Closest matches: .*Grid\/Data grid \(DataGrid\)/);
  const missing: any = await client.callTool({ name: "get_component", arguments: {} });
  assert.equal(missing.isError, true, "a missing required argument is an error");
  await close();
});

// ---------------------------------------------------------------- the built file

const sha = (dir: string) => {
  const hash = createHash("sha256");
  for (const file of FILES) hash.update(readFileSync(join(dir, file)));
  return hash.digest("hex");
};

test("the bundled data is a current copy of ai/", () => {
  for (const file of FILES) {
    assert.ok(readFileSync(join(here, "data", file)).equals(readFileSync(join(here, "../ai", file))), `mcp/data/${file} differs from ai/${file}: run npm run build`);
  }
  const meta = JSON.parse(readFileSync(join(here, "data/meta.json"), "utf8"));
  const index = JSON.parse(readFileSync(join(here, "../ai/index.json"), "utf8"));
  assert.equal(meta.hash, sha(join(here, "../ai")));
  assert.equal(meta.exportVersion, index.version);
  assert.equal(meta.version, JSON.parse(readFileSync(join(here, "package.json"), "utf8")).version);
  assert.equal(meta.version, JSON.parse(readFileSync(join(here, "../package.json"), "utf8")).version, "mcp and the root package have the same version");
});

test("the built server reports its version and the hash of ai/", () => {
  const line = execFileSync(process.execPath, [bundle, "--version"], { encoding: "utf8" }).trim();
  assert.equal(line, VERSION_LINE);
  assert.ok(line.endsWith(`data ${sha(join(here, "../ai"))}`), "dist/server.js was built from an older ai/: run npm run build");
  assert.match(line, /^Sterling MCP server \d+\.\d+\.\d+ · export \d+\.\d+\.\d+, released \d{4}-\d{2}-\d{2} · data [0-9a-f]{64}$/);
});

test("the built server imports no network module and never calls fetch", () => {
  // dist/build.json is esbuild's own account of the bundle (scripts/build.mjs writes it): the Node modules it
  // imports at run time and the packages whose code it contains. Both lists are exact, so an addition is noticed.
  const built = JSON.parse(readFileSync(join(here, "dist/build.json"), "utf8")) as { nodeModules: string[]; packages: string[] };
  const network = ["http", "https", "http2", "net", "tls", "dgram", "dns", "dns/promises", "child_process", "worker_threads", "cluster"];
  assert.deepEqual(built.nodeModules.filter((name) => network.includes(name)), []);
  assert.deepEqual(built.nodeModules, ["process"]);
  // The SDK, its schema validation, and zod: no web server, HTTP client, or process launcher.
  assert.deepEqual(built.packages, ["@modelcontextprotocol/sdk", "ajv", "ajv-formats", "fast-deep-equal", "fast-uri", "json-schema-traverse", "zod", "zod-to-json-schema"]);
  // And the text of the bundle: no network module is required by name, and nothing calls fetch.
  const source = readFileSync(bundle, "utf8");
  for (const name of network) {
    assert.equal(new RegExp(`(?:from\\s*|require\\(\\s*|import\\(\\s*)["'](?:node:)?${name}["']`).test(source), false, `the bundle imports ${name}`);
  }
  assert.equal(/\bfetch\s*\(/.test(source), false, "the bundle calls fetch");
  assert.equal(/XMLHttpRequest|WebSocket\b/.test(source), false);
});

const temp = mkdtempSync(join(tmpdir(), "sterling-mcp-"));
after(() => rmSync(temp, { recursive: true, force: true }));

test("the built server runs over stdio from a folder with nothing else in it", async () => {
  copyFileSync(bundle, join(temp, "server.js"));
  assert.deepEqual(readdirSync(temp), ["server.js"]);
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(temp, "server.js")], cwd: temp });
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(transport);
  assert.deepEqual((await client.listTools()).tools.map((t) => t.name), [...TOOL_NAMES]);
  const result: any = await client.callTool({ name: "get_component", arguments: { name: "DataGrid" } });
  assert.equal(JSON.parse(text(result)).react.component, "DataGrid");
  const token: any = await client.callTool({ name: "get_token", arguments: { name: "surface/background" } });
  assert.equal(JSON.parse(text(token)).modes.Dark.value, "#14181D");
  await client.close();
});
