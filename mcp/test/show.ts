// Prints what a client sees: each tool's description, and two sample calls. For reviewing wording.
// Usage (from mcp/): npx tsx test/show.ts

import { TOOLS, getComponent } from "../src/tools";

for (const tool of TOOLS) console.log(`### ${tool.name}\n${tool.description}\n`);
const sample = getComponent("DataGrid");
console.log('### get_component("DataGrid")\n' + (sample.ok ? JSON.stringify(sample.data, null, 2) : sample.error));
const unknown = getComponent("DataTable");
console.log('\n### get_component("DataTable")\n' + (unknown.ok ? "" : unknown.error));
