// llms.txt: the plain-text entry point for AI tools, at the root of the published site. It follows the
// llms.txt convention: an H1 with the name, a blockquote summary, a short body, then H2 sections of links.
// Everything in it comes from ai/index.json (written by `npm run export:ai`), so it always lists the current
// files. To add a section, add it to `llmsTxt.sections` in ui/scripts/lib/ai-export.ts: a section has a title
// and any of `text` (paragraphs) and `links` ({ title, url, note }), and this file needs no change.
// No imports, so the site build and the check (ui/scripts/check-ai.ts) use the same function.

/** The text of llms.txt for an index (the parsed ai/index.json). */
export function renderLlmsTxt(index) {
  const { intro, guidance, sections } = index.llmsTxt;
  const lines = [`# ${index.name}`, "", `> ${index.summary}`, "", `Version ${index.version}, released ${index.released}. ${intro}`, ""];
  for (const item of guidance) lines.push(`- ${item}`);
  for (const section of sections) {
    lines.push("", `## ${section.title}`, "");
    for (const paragraph of section.text ?? []) lines.push(paragraph, "");
    for (const link of section.links ?? []) lines.push(`- [${link.title}](${link.url}): ${link.note}`);
    // A section that ends with a paragraph has a trailing blank line; drop it.
    while (lines[lines.length - 1] === "") lines.pop();
  }
  return lines.join("\n") + "\n";
}

/** Every link in an llms.txt text, as { title, url }. */
export function llmsLinks(text) {
  return [...text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map(([, title, url]) => ({ title, url }));
}
