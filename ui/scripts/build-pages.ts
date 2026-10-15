// Builds the website's pages that come from TypeScript data, all in the same page shell
// (scripts/lib/page-shell.mjs):
//   site/index.html            Start here, from the audience matrix in definitions/audiences.ts
//   site/install/index.html    Install sterling-ui, from the setup block in definitions/setup.ts
//   site/ai-tools/index.html   Sterling and AI tools: one component followed from the sources to code an AI tool
//                              wrote, with excerpts read from the real files (lib/excerpts.ts), a real exchange
//                              with the built MCP server (mcp/scripts/exchange.mjs), the overview diagram
//                              (docs/diagrams/ai-layer.svg, and .dark.svg), and the MCP setup block
// The token reference is built by scripts/build-token-site.mjs.
//
// Usage: npm run pages   (needs the MCP server built: npm run build in mcp/. scripts/build-site.mjs runs both as
//                         part of `npm run site`)

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { installPackage, mcpServer, type SetupBlock } from "../../definitions/setup";
import { AUDIENCES, HOW, NO_SETUP, type Audience, type How, type Place } from "../../definitions/audiences";
import { COMPONENTS } from "../../definitions/components";
import { ICONS } from "../../definitions/icons";
import {
  AI_FILES_URL, INSTALL_PACKAGE_URL, LLMS_TXT_URL, MCP_SETUP_URL, RELEASES_URL, REPOSITORY_URL, WEBSITE_URL, commitUrl, historyUrl,
  repositoryFileUrl,
} from "../../definitions/site";
import {
  DELIVERED, DELIVERED_FOLDER, codeExcerpts, componentsJsonExcerpt, exchangeExcerpts, llmsExcerpt, patternExcerpt, sourceExcerpts,
  tokenExcerpt, type Exchange, type Excerpt,
} from "./lib/excerpts";
import { esc, renderPage } from "../../scripts/lib/page-shell.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const site = resolve(root, "site");
const VERSION = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version as string;

/** An address on this website, made relative to a page `base` levels below the root, so the site works wherever it's served. */
const local = (url: string, base: string) => (url.startsWith(WEBSITE_URL) ? base + url.slice(WEBSITE_URL.length) || "./" : url);
/** Text with `backticks` for code; addresses become links (relative ones for this website, from the root). */
const inlineText = (text: string, base = "") =>
  esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\((https:\/\/[^\s)]+)\)/g, (_, url) => `(<a href="${esc(local(url, base))}">${esc(url.replace(/^https:\/\//, "").replace(/\/$/, ""))}</a>)`);

/**
 * A setup block, with the same headings in the same order everywhere it appears. Its title is the page's h1
 * when the block is the page (`level` 1), so the section is labelled by that heading.
 */
export function setupHtml(block: SetupBlock, level = 2, base = ""): string {
  const h = `h${level}`;
  const sub = `h${level + 1}`;
  const inline = (text: string) => inlineText(text, base);
  const title = level === 1 ? "" : `\n  <${h} id="${block.id}-title">${esc(block.title)}</${h}>`;
  const need = (n: SetupBlock["need"][number]) =>
    n.check
      ? `<li><strong>${esc(n.what)}.</strong> Check: <code>${esc(n.check)}</code> shows ${inline(n.expect ?? "")}. If not, ${inline(n.get)}</li>`
      : `<li><strong>${esc(n.what)}.</strong> ${inline(n.get)}</li>`;
  const step = (s: SetupBlock["steps"][number]) => {
    if (s.choices)
      return `<div class="choices">${s.choices
        .map((c) => `<div class="choice"><${sub === "h3" ? "h4" : "h3"}>${esc(c.title)}</${sub === "h3" ? "h4" : "h3"}><p>${inline(c.text)}</p><pre><code>${esc(c.command)}</code></pre></div>`)
        .join("")}</div>`;
    return s.command ? `<pre><code>${esc(s.command)}</code></pre>` : `<p>${inline(s.text ?? "")}</p>`;
  };
  return `
<section class="panel setup${level === 1 ? " setup--page" : ""}" id="${block.id}" aria-labelledby="${block.id}-title">${title}
  ${block.intro ? `<p>${inline(block.intro)}</p>` : ""}
  <${sub}>Where</${sub}>
  <p>${inline(block.where)}</p>
  <${sub}>You need</${sub}>
  <ul class="needs">${block.need.map(need).join("")}</ul>
  <${sub}>Do</${sub}>
  ${block.steps.map(step).join("\n  ")}
  ${block.scope ? `<${sub}>Scope</${sub}>\n  <p>${inline(block.scope)}</p>` : ""}
  <${sub}>It worked if</${sub}>
  <p>${inline(block.worked)}</p>
  <${sub}>If it didn't</${sub}>
  <ul>${block.failed.map((f) => `<li>${inline(f)}</li>`).join("")}</ul>
</section>`;
}

// ---------------------------------------------------------------- Start here

/** How you get it, as a pill. Its text carries the meaning; the one quiet difference is a fill when setup is needed. */
const pill = (how: How) =>
  `<span class="how${NO_SETUP.includes(how) ? "" : " how--setup"}"><span class="visually-hidden">How you get it: </span>${esc(how)}</span>`;

/** A place: its links on one line, what it gives you under them, and how you get it in the top-right corner. */
function place(p: Place, base: string): string {
  const links = p.links.map((l) => `<a href="${esc(local(l.url, base))}">${esc(l.label)}</a>`).join(" and ");
  return `<li class="place"><div class="links">${p.or ? "Or " : ""}${links}</div>${pill(p.how)}<div class="note">${esc(p.note)}</div></li>`;
}

const row = (a: Audience, base: string) => `<tr id="${a.id}">
  <th scope="row"><span class="role">${esc(a.role)}</span><span class="why">${esc(a.why)}</span></th>
  <td><ul class="places">${a.places.map((p) => place(p, base)).join("")}</ul></td>
</tr>`;

function startHere(): string {
  const base = "";
  const key = (hows: How[]) =>
    `<dl class="hows">${hows.map((how) => `<div><dt>${pill(how)}</dt><dd>${esc(HOW[how])}</dd></div>`).join("")}</dl>`;
  const all = Object.keys(HOW) as How[];
  const main = `<div class="column">
<h1>Sterling</h1>
<p class="lead">Sterling is a design system: design tokens, components and usage guidance that keep product screens
consistent. Designers use it in Figma, developers use it in React, and AI tools can look it up while they write code. All
three come from one set of definitions, so they always describe the same thing, and automated checks fail if they drift
apart. It's intentionally small: ${Object.keys(COMPONENTS).length} components and ${Object.keys(ICONS).length} icons.</p>

<section class="panel" aria-labelledby="start-title">
  <h2 id="start-title">Start with your role</h2>
  <p>Find the row that matches what you want to do with Sterling, then follow its links.</p>
  <table class="matrix">
    <thead><tr><th scope="col">Who you are</th><th scope="col">Where to go</th></tr></thead>
    <tbody>
${AUDIENCES.map((a) => row(a, base)).join("\n")}
    </tbody>
  </table>
  <h3>How you get each</h3>
  <div class="key">
    <div><h4>Nothing to set up</h4>${key(all.filter((h) => NO_SETUP.includes(h)))}</div>
    <div><h4>Setup needed, once</h4>${key(all.filter((h) => !NO_SETUP.includes(h)))}</div>
  </div>
</section>

<section class="panel" aria-labelledby="set-up-title">
  <h2 id="set-up-title">Set up</h2>
  <ul class="setups">
    <li><a href="${esc(local(INSTALL_PACKAGE_URL, base))}">Install sterling-ui</a>: add the components to a React project</li>
    <li><a href="${esc(local(MCP_SETUP_URL, base))}">Set up the MCP server</a>: connect Sterling to your AI tool</li>
  </ul>
</section>
</div>`;
  return renderPage({
    title: "Sterling Design System",
    description: "Sterling, a design system for data-dense applications: where to start, for each kind of reader.",
    base,
    current: "start",
    main,
    css: START_CSS,
    script: FORWARD_JS,
    version: VERSION,
    repositoryUrl: REPOSITORY_URL,
    releasesUrl: RELEASES_URL,
  });
}

// ---------------------------------------------------------------- Install sterling-ui

function installPage(): string {
  const base = "../";
  const block = installPackage(VERSION);
  const main = `
<h1 id="${block.id}-title">${esc(block.title)}</h1>
<p class="lead">The Sterling components in your React project, version ${esc(VERSION)}, from the GitHub Release.</p>
${setupHtml(block, 1, base)}`;
  return renderPage({
    title: "Install sterling-ui",
    description: "How to install sterling-ui, Sterling's React components, into a React project.",
    base,
    current: "install",
    main,
    css: SETUP_CSS,
    version: VERSION,
    repositoryUrl: REPOSITORY_URL,
    releasesUrl: RELEASES_URL,
  });
}

// ---------------------------------------------------------------- Sterling and AI tools

/** The exchange with the built MCP server, made now: nothing on the page is written by hand. */
function exchange(): Exchange {
  try {
    return JSON.parse(execFileSync(process.execPath, ["scripts/exchange.mjs"], { cwd: resolve(root, "mcp"), encoding: "utf8" }));
  } catch {
    console.error("The AI page needs the MCP server built: run `npm run build` in mcp/ (or `npm run site` at the root).");
    process.exit(1);
  }
}

/** The overview diagram, one SVG per color mode (npm run diagrams); the page shows the one for its theme. */
const DIAGRAM_MODES = (JSON.parse(readFileSync(resolve(root, "tokens/tokens.json"), "utf8")).color.$modes as string[]).map((mode, i) => ({
  theme: mode.toLowerCase(),
  file: i === 0 ? "ai-layer.svg" : `ai-layer.${mode.toLowerCase()}.svg`,
}));
const DIAGRAM_ALT =
  "Sterling's sources generate the AI files and the sterling-ui package. The AI files reach your AI tool two ways: read by URL " +
  "from the website (llms.txt and /ai/), or through calls to the MCP server. Your AI tool writes your code, which imports sterling-ui.";

const code = (text: string) => `<pre><code>${esc(text)}</code></pre>`;

/** An excerpt, captioned with the file it comes from (and the commit, for code read from one). */
function excerpt(e: Excerpt): string {
  const from = e.commit
    ? `<code>${esc(e.source)}</code> as delivered, in commit <a href="${esc(commitUrl(e.commit))}">${esc(e.commit)}</a>`
    : `<code>${esc(e.source)}</code>`;
  return `<figure class="excerpt"><figcaption>${from}: ${esc(e.label)}</figcaption>${code(e.text)}</figure>`;
}

interface Step {
  id: string;
  title: string;
  text: string;
  body: string;
}

function aiToolsPage(): string {
  const base = "../";
  const link = (url: string, label: string) => `<a href="${esc(local(url, base))}">${esc(label)}</a>`;
  const mcp = exchangeExcerpts(exchange());
  const steps: Step[] = [
    {
      id: "step-1",
      title: "Where it starts",
      text:
        "Three files in the repository describe Chip/Status: its Figma variants and properties, its documentation, and its tokens. " +
        "The Figma library, the React component, and everything in the next steps are generated from them.",
      body: sourceExcerpts().map(excerpt).join(""),
    },
    {
      id: "step-2",
      title: "The AI file for components",
      text:
        "Its entry in <code>components.json</code>: what it's for, when to use it and when not to, its Figma properties, and the " +
        "React props that stand for them.",
      body: excerpt(componentsJsonExcerpt()),
    },
    {
      id: "step-3",
      title: "The token it uses",
      text:
        "The warning tone's background, <code>status/warning-subtle</code>, in <code>tokens.dtcg.json</code>: the Design Tokens " +
        "(DTCG) format, with its value in Light and Dark and the CSS name to use.",
      body: excerpt(tokenExcerpt()),
    },
    {
      id: "step-4",
      title: "The pattern that applies",
      text: "Status chips, in <code>guidelines.json</code>: when to use them, and numbered steps.",
      body: excerpt(patternExcerpt()),
    },
    {
      id: "step-5",
      title: "llms.txt",
      text:
        "The plain-text entry point for tools that read by URL. It describes Sterling and links to the AI files. An MCP client " +
        "doesn't read it.",
      body: excerpt(llmsExcerpt()),
    },
    {
      id: "step-6",
      title: "Through the MCP server",
      text:
        "An MCP client reads each tool's description, then calls the tool. This exchange was made with the built server when " +
        "this page was built: what a client reads about <code>get_component</code>, then two calls and their results, shortened.",
      body:
        `<figure class="excerpt"><figcaption>What the client reads: the description of <code>get_component</code></figcaption>${code(mcp.description)}</figure>` +
        mcp.calls
          .map(
            (c) =>
              `<figure class="excerpt"><figcaption>The call</figcaption>${code(c.request)}</figure>` +
              `<figure class="excerpt"><figcaption>The result</figcaption>${code(c.result)}</figure>`
          )
          .join(""),
    },
    {
      id: "step-7",
      title: "The code an AI tool wrote",
      text:
        `An AI session built the Pool loans screen using only the sterling-ui package and the MCP server. The lines shown are as ` +
        `delivered, in commit ${link(commitUrl(DELIVERED), DELIVERED)}: each loan status with its chip tone, and the pool's ` +
        `status in the page header. The code around them was later changed to use DataGrid (${link(historyUrl(DELIVERED_FOLDER), "the screen's history")}).`,
      body: codeExcerpts().map(excerpt).join(""),
    },
  ];
  const main = `<div class="column">
<h1>Sterling and AI tools</h1>
<p class="lead">An AI tool builds better screens with Sterling when it can look things up: which components exist, what
each is for, which token to use, and the rules that apply. Sterling publishes the same information for AI tools in two
ways.</p>
<ul class="routes">
  <li><strong>An MCP server.</strong> One file you download and register with your AI tool, once. The tool calls it while it
  works. <a href="#set-up">Set it up</a>.</li>
  <li><strong>Files read by URL.</strong> ${link(LLMS_TXT_URL, "llms.txt")} describes Sterling and links to
  ${link(`${AI_FILES_URL}index.json`, "the AI files")} (components, tokens, guidelines). Any tool that can fetch a web page
  can read them.</li>
</ul>
<p>These are two separate routes to the same files. An MCP client doesn't read llms.txt, and a tool reading llms.txt doesn't
use the MCP server. Use whichever your tool supports.</p>
<figure class="diagram">
  <div class="diagram-frame" tabindex="0" role="region" aria-label="Diagram: how the AI layer is built and used">
  ${DIAGRAM_MODES.map((d) => `<img class="for-${d.theme}" src="${d.file}" width="1325" height="320" alt="${DIAGRAM_ALT}">`).join("")}
  </div>
  <figcaption>How the AI layer is built and used. ${DIAGRAM_MODES.map((d) => `<a class="for-${d.theme}" href="${d.file}">Open it full size</a>`).join("")}.</figcaption>
</figure>

<section class="panel" aria-labelledby="walkthrough-title">
  <h2 id="walkthrough-title">One component, start to finish: Chip/Status</h2>
  <p>Chip/Status shows a record's status. Here it is, from Sterling's sources to code an AI tool wrote, in seven steps. Every
  excerpt is read from the real files when this page is built.</p>
  <ol class="steps">
${steps
  .map(
    (st) => `<li class="step" id="${st.id}" aria-labelledby="${st.id}-title">
  <h3 id="${st.id}-title" tabindex="-1">${esc(st.title)}</h3>
  <p>${st.text}</p>
  ${st.body}
</li>`
  )
  .join("\n")}
  </ol>
</section>
${setupHtml(mcpServer(VERSION), 2, base)}
<section class="panel" aria-labelledby="first-prompt-title">
  <h2 id="first-prompt-title">A first prompt to try</h2>
  <p>Once your tool lists <code>sterling</code> as connected, ask it:</p>
  <blockquote class="prompt"><p>Using Sterling, build a table of five fictional orders, each with a status. Look up the
  components and the Status chips pattern first.</p></blockquote>
  <p>The full worked example, a complete screen, is ${link(repositoryFileUrl("demo/prompt.md"), "the Pool loans request")}.</p>
</section>
</div>`;
  return renderPage({
    title: "Sterling and AI tools",
    description: "How Sterling works with AI tools: an MCP server and files read by URL, one component followed from source to code, and setup.",
    base,
    current: "ai-tools",
    main,
    css: SETUP_CSS + AI_CSS,
    script: STEPS_JS,
    version: VERSION,
    repositoryUrl: REPOSITORY_URL,
    releasesUrl: RELEASES_URL,
  });
}

const SETUP_CSS = `
.setup h3, .setup--page h2 { font-size: 14px; margin-top: 16px; }
.setup--page h2:first-child { margin-top: 0; }
.setup ul { margin: 0 0 12px; padding-left: 20px; }
/* Commands wrap rather than scroll, so nothing needs scrolling sideways, at any width. Copying keeps them whole. */
.setup pre, .setup pre code { white-space: pre-wrap; overflow-wrap: anywhere; }
.choices { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0 0 12px; }
.choice { min-width: 0; border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); padding: 12px 16px; }
.choice h3, .choice h4 { margin: 0 0 4px; font-size: 13px; }
.choice pre { margin: 0; }
@media (max-width: 720px) { .choices { grid-template-columns: 1fr; } }
`;

const AI_CSS = `
/* One content column, the page's full width, as on Start here. */
.column p { max-width: none; }
.routes { padding-left: 20px; display: grid; gap: 8px; margin: 0 0 16px; }
.diagram { margin: 24px 0; }
.diagram-frame { overflow-x: auto; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-panel); }
.diagram-frame:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.diagram img { display: block; width: 100%; height: auto; }
/* The diagram and its full-size link in the page's color mode: the system's, unless the switch sets one. */
.diagram .for-dark { display: none; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .diagram .for-light { display: none; }
  :root:not([data-theme="light"]) .diagram img.for-dark { display: block; }
  :root:not([data-theme="light"]) .diagram a.for-dark { display: inline; }
}
:root[data-theme="dark"] .diagram .for-light { display: none; }
:root[data-theme="dark"] .diagram img.for-dark { display: block; }
:root[data-theme="dark"] .diagram a.for-dark { display: inline; }
/* On a narrow screen the diagram keeps a readable size, and its frame scrolls sideways. */
@media (max-width: 720px) { .diagram img { width: 760px; max-width: none; } }
.diagram figcaption { margin-top: 8px; font-size: 13px; color: var(--color-text-secondary); }
.steps { margin: 16px 0 0; padding-left: 24px; }
.step { margin: 0 0 24px; }
.step h3 { margin: 0 0 4px; font-size: 16px; }
.step h3:focus { outline: none; }
.step h3:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.excerpt { margin: 12px 0 0; }
.excerpt figcaption { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 4px; }
.excerpt pre { margin: 0; }
.excerpt pre, .excerpt pre code { white-space: pre-wrap; overflow-wrap: anywhere; }
.prompt { margin: 0 0 16px; padding: 12px 16px; border-left: 3px solid var(--color-accent-default); background: var(--color-surface-hover); }
.prompt p { margin: 0; }
/* The step-through, added by the script: without it, every step shows in order. */
.stepper ol { list-style: none; margin: 16px 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.stepper button, .step-controls button { font: inherit; font-size: 13px; padding: 4px 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-strong); background: var(--color-surface-panel); color: var(--color-text-primary); cursor: pointer; }
.stepper button[aria-current="step"] { border-color: var(--color-accent-default); box-shadow: inset 0 -2px 0 var(--color-accent-default); font-weight: 600; }
.stepper button:focus-visible, .step-controls button:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.step-controls { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.step-controls button:disabled { color: var(--color-text-disabled); background: var(--color-surface-disabled); border-color: var(--color-border-default); cursor: default; }
.steps[data-stepping] { list-style: none; padding-left: 0; }
.steps[data-stepping] .step { margin: 0; }
.step-count { font-size: 13px; color: var(--color-text-secondary); }
`;

// The seven steps, one at a time: a list of the steps and Previous / Next, all buttons, so Tab reaches them and
// Enter or Space works them. Without the script every step shows, in order. A step's address (#step-3) opens it.
// What the script adds carries data-script-added, and the list it changes data-stepping, so check:site can put
// the page back as it is without JavaScript and check that too.
const STEPS_JS = `
(() => {
  const list = document.querySelector(".steps");
  if (!list) return;
  const steps = [...list.children];
  const make = (text) => Object.assign(document.createElement("button"), { type: "button", textContent: text });
  const nav = document.createElement("nav");
  nav.className = "stepper";
  nav.dataset.scriptAdded = "";
  nav.setAttribute("aria-label", "Steps");
  const ol = document.createElement("ol");
  const tabs = steps.map((step, i) => {
    const button = make((i + 1) + ". " + step.querySelector("h3").textContent);
    button.addEventListener("click", () => show(i, true));
    const li = document.createElement("li");
    li.append(button);
    ol.append(li);
    return button;
  });
  nav.append(ol);
  const controls = document.createElement("div");
  controls.className = "step-controls";
  controls.dataset.scriptAdded = "";
  const previous = make("Previous");
  const next = make("Next");
  const count = Object.assign(document.createElement("span"), { className: "step-count" });
  count.setAttribute("aria-live", "polite");
  controls.append(previous, next, count);
  list.before(nav);
  list.after(controls);
  list.dataset.stepping = "";
  let current = 0;
  function show(i, moved) {
    current = i;
    steps.forEach((step, j) => (step.hidden = j !== i));
    tabs.forEach((tab, j) => (j === i ? tab.setAttribute("aria-current", "step") : tab.removeAttribute("aria-current")));
    previous.disabled = i === 0;
    next.disabled = i === steps.length - 1;
    count.textContent = "Step " + (i + 1) + " of " + steps.length;
    if (moved) {
      history.replaceState(null, "", "#" + steps[i].id);
      steps[i].querySelector("h3").focus();
    }
  }
  previous.addEventListener("click", () => show(Math.max(0, current - 1), true));
  next.addEventListener("click", () => show(Math.min(steps.length - 1, current + 1), true));
  const fromAddress = () => steps.findIndex((step) => "#" + step.id === location.hash);
  show(Math.max(0, fromAddress()), false);
  addEventListener("hashchange", () => fromAddress() >= 0 && show(fromAddress(), false));
})();
`;

const START_CSS = `
.visually-hidden { position: absolute; width: var(--stroke-1); height: var(--stroke-1); overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
/* One content column, the page's full width: the introduction, the table, and Set up share its edges. */
.column p { max-width: none; }
.matrix th[scope="row"] { width: 40%; padding-right: 24px; }
.role { display: block; font-weight: 600; }
.why { display: block; margin-top: 2px; color: var(--color-text-secondary); font-weight: 400; font-size: 13px; }
.places { list-style: none; margin: 0; padding: 0; }
.place { display: grid; grid-template-columns: 1fr auto; align-items: start; column-gap: 12px; padding: 8px 0; }
.place .how { grid-column: 2; grid-row: 1 / span 2; }
.place .note { grid-column: 1; }
.place:first-child { padding-top: 0; }
.place:last-child { padding-bottom: 0; }
.place + .place { border-top: 1px solid var(--color-border-default); }
.note { font-size: 13px; color: var(--color-text-secondary); }
/* How you get it. Not Chip/Status: that is for a record's status. Neutral colors, no status tone; the text
   carries the meaning, and "setup needed" adds one quiet difference, a fill. */
.how { display: inline-block; flex: none; font-size: 12px; line-height: 16px; padding: 1px 8px; border: 1px solid var(--color-border-default); border-radius: var(--radius-pill); color: var(--color-text-secondary); white-space: nowrap; }
.how--setup { background: var(--color-surface-hover); }
.key { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; }
.key h4 { margin: 0 0 8px; font-size: 13px; color: var(--color-text-secondary); }
.hows { display: grid; grid-template-columns: max-content 1fr; gap: 8px 12px; align-items: baseline; margin: 0; }
.hows div { display: contents; }
.hows dd { margin: 0; }
.setups { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
@media (max-width: 720px) {
  .matrix thead { position: absolute; width: var(--stroke-1); height: var(--stroke-1); overflow: hidden; clip-path: inset(50%); }
  .matrix, .matrix tbody, .matrix tr, .matrix th, .matrix td, .matrix th[scope="row"] { display: block; width: auto; }
  .matrix tr { border-top: 1px solid var(--color-border-default); padding: 12px 0; }
  .matrix th, .matrix td { border-top: 0; padding: 4px 0; }
  .matrix th[scope="row"] { padding: 0 0 8px; }
  .place .how { grid-row: 1; }
  .place .note { grid-column: 1 / -1; }
  .key { grid-template-columns: 1fr; }
  .hows { grid-template-columns: 1fr; gap: 4px; }
  .hows dt { justify-self: start; }
  .hows dd { margin-bottom: 8px; }
}
`;

// The token reference used to be the home page. Its section links (/#color and the rest) still arrive here,
// so send them on to the same section of /tokens/.
const FORWARD_JS = `
(() => {
  const sections = ["color", "primitives", "scales", "density", "type", "contrast"];
  const forward = () => {
    const target = location.hash.slice(1);
    if (sections.includes(target)) location.replace("tokens/#" + target);
  };
  forward();
  addEventListener("hashchange", forward);
})();
`;

for (const folder of ["install", "ai-tools"]) mkdirSync(resolve(site, folder), { recursive: true });
writeFileSync(resolve(site, "index.html"), startHere());
writeFileSync(resolve(site, "install/index.html"), installPage());
writeFileSync(resolve(site, "ai-tools/index.html"), aiToolsPage());
for (const { file } of DIAGRAM_MODES) copyFileSync(resolve(root, "docs/diagrams", file), resolve(site, "ai-tools", file));
console.log("Wrote site/index.html (Start here), site/install/ (Install sterling-ui), and site/ai-tools/ (Sterling and AI tools).");
