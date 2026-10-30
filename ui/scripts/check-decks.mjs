// Deck check: every PowerPoint file (.pptx) and PDF (.pdf) in the repository is read in full and fails if
//   • any of its text holds a banned term (the list is kept outside the repository: pass it with --banned <file>);
//   • any of its text holds a local file path (C:\…, a file:// address, /Users/…, /home/…, \\server\…);
//   • its metadata names an author, a last editor, a company or a manager, or a comment carries an author's name.
// "All of its text" means, for a .pptx: every part of the file (slides, hidden slides too, speaker notes, comments,
// masters, layouts, links, and the document properties), read as raw XML so nothing is skipped; for a .pdf: each page's
// text, its annotations (comments), its outline, its document information and its XMP metadata, plus the raw file.
// No network access. Text is never printed: a finding names the file, where it is, and the line of the banned-terms
// list it matched.
//
// Usage: npm run check:decks -- --banned <file> [deck …]   (every .pptx and .pdf in the repository, or the decks named;
//        without --banned, banned terms aren't checked, and it says so: CI has no list, so there it checks paths and
//        metadata only)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const bannedFile = args.includes("--banned") ? args[args.indexOf("--banned") + 1] : process.env.STERLING_BANNED_TERMS;
const banned = bannedFile
  ? readFileSync(bannedFile, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).map((t, i) => ({ term: t.trim().toLowerCase(), line: i + 1 })).filter((t) => t.term && !t.term.startsWith("#"))
  : null;

/** Local file paths: a drive letter, a file:// address, a home folder on macOS or Linux, a network share. */
const PATHS = [
  [/(?<![A-Za-z0-9])[A-Za-z]:[\\/]/, "a Windows path"],
  [/file:\/\//i, "a file:// address"],
  [/\/(?:Users|home)\/[^/\s"<>]+/, "a home folder"],
  [/\\\\[A-Za-z0-9._$-]+\\/, "a network share"],
];

const problems = [];
/** Scans one piece of text; `where` says where it came from. */
function scan(file, where, text) {
  if (!text) return;
  const lower = text.toLowerCase();
  for (const { term, line } of banned ?? []) if (lower.includes(term)) problems.push(`${file}, ${where}: a banned term (line ${line} of the list)`);
  for (const [pattern, what] of PATHS) if (pattern.test(text)) problems.push(`${file}, ${where}: ${what}`);
}
const named = (file, where, value) => {
  if (value && String(value).trim()) problems.push(`${file}: ${where} is set (it must be empty)`);
};

// ------------------------------------------------------------ .pptx: a zip of XML parts

/** Every entry of a zip file, by name, decompressed (stored or deflated). */
function unzip(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error("not a zip file");
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(at) !== 0x02014b50) throw new Error("damaged zip directory");
    const method = buffer.readUInt16LE(at + 10);
    const size = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const local = buffer.readUInt32LE(at + 42);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);
    const dataAt = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(dataAt, dataAt + size);
    entries.set(name, method === 0 ? data : method === 8 ? inflateRawSync(data) : null);
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const tag = (xml, name) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`, "g"))].map((m) => m[1]);

function checkPptx(file) {
  const parts = unzip(readFileSync(resolve(root, file)));
  for (const [name, data] of parts) {
    if (!data) {
      problems.push(`${file}, ${name}: can't be read (unknown compression)`);
      continue;
    }
    // Media (pictures, fonts) aren't text; every other part is XML or plain text, and is scanned whole.
    if (/\.(png|jpe?g|gif|bmp|tiff?|emf|wmf|fntdata|odttf|bin|wdp|mp4|m4a|wav)$/i.test(name)) continue;
    scan(file, name, data.toString("utf8"));
  }
  const xml = (name) => parts.get(name)?.toString("utf8") ?? "";
  const core = xml("docProps/core.xml");
  named(file, "the author (docProps/core.xml, dc:creator)", tag(core, "dc:creator").join(""));
  named(file, "the last editor (docProps/core.xml, cp:lastModifiedBy)", tag(core, "cp:lastModifiedBy").join(""));
  const app = xml("docProps/app.xml");
  named(file, "the company (docProps/app.xml)", tag(app, "Company").join(""));
  named(file, "the manager (docProps/app.xml)", tag(app, "Manager").join(""));
  // Comment authors: the classic list (commentAuthors.xml) and the modern one (authors.xml).
  for (const name of ["ppt/commentAuthors.xml", "ppt/authors.xml"]) {
    const names = [...xml(name).matchAll(/\sname="([^"]*)"/g)].map((m) => m[1]).filter((n) => n.trim());
    if (names.length) problems.push(`${file}: ${names.length} comment author name(s) in ${name} (remove the comments or their authors)`);
  }
}

// ------------------------------------------------------------ .pdf

async function checkPdf(file) {
  const bytes = readFileSync(resolve(root, file));
  // The raw file first, without its streams (compressed data would match by chance): the document information and
  // anything else written in the clear.
  scan(file, "the raw file", bytes.toString("latin1").replace(/stream\r?\n[\s\S]*?endstream/g, ""));
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
  const { info, metadata } = await doc.getMetadata();
  for (const [key, value] of Object.entries(info ?? {})) scan(file, `document information (${key})`, typeof value === "string" ? value : JSON.stringify(value));
  named(file, "the author (document information, Author)", info?.Author);
  for (const key of ["Company", "Manager", "SourceModified"]) named(file, `the ${key.toLowerCase()} (document information, ${key})`, info?.Custom?.[key]);
  if (metadata) {
    const all = metadata.getAll();
    scan(file, "the XMP metadata", JSON.stringify(all));
    named(file, "the author (XMP metadata, dc:creator)", [].concat(all["dc:creator"] ?? []).join(""));
  }
  const outline = await doc.getOutline();
  const titles = [];
  const walk = (items) => items?.forEach((i) => (titles.push(i.title), walk(i.items)));
  walk(outline);
  scan(file, "the outline", titles.join("\n"));
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const text = await page.getTextContent();
    scan(file, `page ${n}`, text.items.map((i) => ("str" in i ? i.str : "")).join(" "));
    for (const a of await page.getAnnotations()) {
      scan(file, `page ${n}, a ${a.subtype} annotation`, [a.contentsObj?.str, a.titleObj?.str, a.url, a.unsafeUrl].filter(Boolean).join("\n"));
      named(file, `page ${n}, the author of a ${a.subtype} annotation`, a.titleObj?.str);
    }
  }
  await doc.destroy();
}

// ------------------------------------------------------------ every deck in the repository

/** Files named on the command line (anything but --banned and its value), or else every deck in the repository. */
const named_ = args.filter((a, i) => a !== "--banned" && args[i - 1] !== "--banned");
const files = named_.length ? named_ : execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.pptx", "*.pdf"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const unique = [...new Set(files)];
for (const file of unique) {
  try {
    if (/\.pptx$/i.test(file)) checkPptx(file);
    else await checkPdf(file);
  } catch (error) {
    problems.push(`${file}: can't be read (${error instanceof Error ? error.message : error})`);
  }
}

for (const p of problems) console.error(`  ${p}`);
const note = banned ? `${banned.length} banned terms` : "banned terms NOT checked (no list: pass --banned <file>)";
console.log(`check:decks: ${unique.length} file(s) (.pptx, .pdf); ${note}; local paths and metadata — ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
