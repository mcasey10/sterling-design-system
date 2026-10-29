#!/usr/bin/env node
// Serves the built site (site/) at http://localhost:6008, to look at it before it is published.
//
// Usage: npm run site && npm run site:serve

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const site = resolve(dirname(fileURLToPath(import.meta.url)), "../site");
if (!existsSync(join(site, "index.html"))) {
  console.error("site/ is missing. Run `npm run site` first.");
  process.exit(1);
}
const port = Number(process.argv[2] ?? 6008);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".pdf": "application/pdf", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon" };

createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  let path = join(site, normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, ""));
  // A folder is served as its index.html; without the trailing slash, relative links inside it would break.
  if (existsSync(path) && statSync(path).isDirectory()) {
    if (!url.pathname.endsWith("/")) {
      response.writeHead(301, { location: `${url.pathname}/${url.search}` });
      return response.end();
    }
    path = join(path, "index.html");
  }
  try {
    const body = readFileSync(path);
    response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, () => console.log(`Serving site/ at http://localhost:${port}`));
