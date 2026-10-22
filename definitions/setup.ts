// Setup instructions, written once: the website (/install/, /ai-tools/#set-up) and the MCP server's README show
// them from here. Plain data.
// Every block answers the same questions, in the same order, so a reader never has to guess which console
// to use, which folder to be in, or what has to be set up first:
//   where   which console, and which folder (or "any folder")
//   need    each requirement, how to check it, and at most a one-line pointer to where it comes from (a step
//           here, or a place to get it). Never instructions
//   steps   Do: every action, as numbered steps in the order they're taken. A step is a list of parts: text, a
//           command (one per part), `choices` (alternatives side by side), or a `prompt` to ask an AI tool
//   scope   only where it matters, with the choice to make
//   worked  It worked if: only what the reader should see
//   next    what to do next, shown after It worked if
//   failed  the one or two most likely causes when it didn't
//
// The rule: Do holds every action, as numbered steps in the order they're taken. A condition for skipping a step
// comes first, in the step's opening words ("Check the install (optional; skip it if …)"). It worked if only
// describes what the reader should see; it never introduces a step. Next follows It worked if. You need only
// states a requirement, how to check it, and at most a one-line pointer to what provides it ("or create one in
// step 1", "If not, get the LTS version from nodejs.org"). The one exception: If it didn't may say how to fix a cause.
//
// Text may use `backticks` for code.

import { INSTALL_PACKAGE_URL, MCP_SERVER_DOWNLOAD_URL, MCP_SETUP_URL, STORYBOOK_URL, packageUrl, repositoryFileUrl } from "./site";

/** A requirement under You need: "**what.** Check [checkWhat] with `check`: it shows expect. If not, get" */
export interface Prerequisite {
  /** The requirement, with a pointer to the step that provides it when there is one ("…, or create one in step 1"). */
  what: string;
  /** A command that checks it, and what it shows when it's there. Left out when there's nothing to run. */
  check?: string;
  expect?: string;
  /** What the check is run on, when that needs saying: "an existing project". */
  checkWhat?: string;
  /** A one-line pointer to where to get it, after "If not, ", or a short note when there's no check. Never steps. */
  get?: string;
}

/** One of several ways to do a step, shown side by side: "Claude Code" and "Any other MCP client". */
export interface Choice {
  title: string;
  text: string;
  command: string;
}

/** One part of a step: text, a command, alternatives side by side, or something to ask an AI tool (a quotation). */
export interface Part {
  text?: string;
  command?: string;
  choices?: Choice[];
  prompt?: string;
}

/** One numbered step under Do: its parts, in order. */
export type Step = Part[];

export interface SetupBlock {
  id: string;
  title: string;
  /** A line or two before the headings, when the reader needs it first. */
  intro?: string;
  where: string;
  need: Prerequisite[];
  steps: Step[];
  scope?: string;
  /** What the reader should see, in sentences. Never an action: actions are steps. */
  worked: string[];
  /** What to do next, each a sentence with "Next:". */
  next: string[];
  failed: string[];
}

const ANY_TERMINAL = "Any terminal: PowerShell on Windows, Terminal on macOS, or the terminal in your editor. No administrator rights needed.";
const NODE: Prerequisite = {
  what: "Node.js 20 or later",
  check: "node --version",
  expect: "`v20` or higher",
  get: "get the LTS version from nodejs.org.",
};

/** Installing the React components into an application. */
export const installPackage = (version: string): SetupBlock => {
  const steps: Step[] = [
    [
      { text: "Create a React project (skip this if you already have one):" },
      { command: "npm create vite@latest my-app -- --template react-ts" },
      { text: "If it asks setup questions, the defaults are fine, except \"Install with npm and start now?\": choose No. Then:" },
      { command: "cd my-app\nnpm install" },
    ],
    [
      { text: "Install the package from the GitHub Release:" },
      { command: `npm install ${packageUrl(version)}` },
      {
        text:
          `Or, with no network access during installs: download \`sterling-ui-${version}.tgz\` from the Release into the ` +
          "project, for example into a `vendor` folder, and install that file instead. Commit the file, so others can install it too:",
      },
      { command: `npm install ./vendor/sterling-ui-${version}.tgz` },
    ],
    [
      {
        text:
          "Open your app's entry file (in a new Vite project, `src/main.tsx`) in your editor, add these two lines at the " +
          "top, remove `import './index.css'` (the starter's styles change Sterling's layout), and save:",
      },
      { command: 'import "sterling-ui/styles.css";\nimport "sterling-ui/fonts.css";' },
    ],
    [
      {
        text:
          "Check the install (optional; skip it if you're going straight on to an AI tool). This replaces the starter " +
          "page of the new project from step 1: it's only a check, so don't do it in a project with your own work in " +
          "`src/App.tsx`. Open `src/App.tsx` in your editor and replace everything in it with:",
      },
      { command: 'import { Button } from "sterling-ui";\n\nexport default function App() {\n  return <Button label="Save" kind="primary" />;\n}' },
      { text: "Then save, run `npm run dev`, and open the address it prints." },
    ],
  ];
  const check = steps.length;
  return {
    id: "install-sterling-ui",
    title: "Install sterling-ui",
    where:
      `${ANY_TERMINAL} Open it in your React project's folder, the one with \`package.json\`: go there with \`cd\`, ` +
      "or open the folder in your editor and open its terminal. Creating a new project in step 1? Open it in the folder " +
      "where you keep your projects instead.",
    need: [
      NODE,
      {
        what: "A React 19 project, or create one in step 1",
        checkWhat: "an existing project",
        check: "npm ls react",
        expect: "`react@19…`",
      },
    ],
    steps,
    worked: [
      `\`package.json\` lists \`sterling-ui\`, and, if you did step ${check}, a blue Save button appears in Sterling's font. ` +
        "You can remove the button afterwards.",
    ],
    next: [
      `Next: each component's Docs page in Storybook (${STORYBOOK_URL}).`,
      `Using an AI coding tool? Next: connect it to Sterling's MCP server (${MCP_SETUP_URL}), then try the first prompt there.`,
    ],
    failed: [
      '"node" or "npm" not found: Node.js isn\'t installed, or the terminal was opened before it was. Install it, then open a new terminal.',
      "`ERESOLVE` mentioning React: the project isn't on React 19. Check with `npm ls react`.",
      "`404` or \"not found\": check the version number in the address.",
    ],
  };
};

/** Setting up the MCP server, for any MCP client. Its id is the AI page's #set-up. */
export const mcpServer = (version: string): SetupBlock => ({
  id: "set-up",
  title: "Set up the MCP server",
  intro:
    "It works with any MCP client: Claude Code, Claude Desktop, editors with MCP support, and others. It's one file, " +
    "`sterling-mcp.js`, that runs on your machine and makes no network requests.",
  where: `${ANY_TERMINAL} Any folder: the commands use the file's full path.`,
  need: [
    NODE,
    {
      what: "An AI tool that supports MCP servers",
      get: "Any MCP client works.",
    },
    {
      what: "For step 5 only: a React project with sterling-ui installed",
      get: `See Install sterling-ui (${INSTALL_PACKAGE_URL}).`,
    },
  ],
  steps: [
    [
      {
        text:
          `Download \`sterling-mcp.js\` from the latest GitHub Release (${MCP_SERVER_DOWNLOAD_URL}). Put it in a folder where it ` +
          "can stay, for example a `tools` folder in your home folder, and note its full path.",
      },
    ],
    [
      { text: "Check that it runs. In any terminal, from any folder:" },
      { command: 'node "/full/path/to/sterling-mcp.js" --version' },
      { text: `It prints \`Sterling MCP server ${version} · …\`.` },
    ],
    [
      { text: "Register it with your AI tool, once:" },
      {
        choices: [
          {
            title: "Claude Code",
            text: "In any terminal, from any folder:",
            command: 'claude mcp add --scope user sterling -- node "/full/path/to/sterling-mcp.js"',
          },
          {
            title: "Any other MCP client",
            text:
              "Open the client's MCP settings file in your editor (its documentation says where), add a server with command " +
              "`node` and argument the file's full path, save, and restart the client:",
            command: `{
  "mcpServers": {
    "sterling": { "command": "node", "args": ["/full/path/to/sterling-mcp.js"] }
  }
}`,
          },
        ],
      },
    ],
    [
      {
        text:
          "Check the connection: start your AI tool (in Claude Code, run `claude` in a terminal, then `/mcp`) and ask: " +
          '"Which Sterling component shows a record\'s status?" The first time it calls one of Sterling\'s tools, Claude ' +
          "Code asks for permission: allow it.",
      },
    ],
    [
      {
        text:
          "Try the first prompt (skip it until you have a React project with sterling-ui installed): open your AI tool in " +
          "that project's folder (in Claude Code, run `claude` there, and if it asks whether you trust the folder, choose " +
          "Yes), check it lists `sterling` as connected, and ask:",
      },
      {
        prompt:
          "Using Sterling, build a table of five fictional orders, each with a status, using sterling-ui, and show it in " +
          "`src/App.tsx`. Look up the components and the Status chips pattern first.",
      },
      {
        text:
          "When it's done, run `npm run dev` in the project folder (in a second terminal if your AI tool is in the first) " +
          "and open the address it prints.",
      },
    ],
  ],
  scope:
    "`--scope user` makes Sterling available in every project, which is right for most people. To share it with a team " +
    "through one repository instead, put the JSON above in that project's `.mcp.json`, with a path that works for everyone. " +
    "Claude Code asks each person to approve a project's servers the first time.",
  worked: [
    "Your tool lists `sterling` as connected, and answers Chip/Status, from the server.",
    "With the first prompt, the tool looks up the components and the Status chips pattern before it writes code, and the " +
      "page shows a table of orders with Sterling's status chips, each with an icon and a label.",
  ],
  next: [
    `Next: the full worked example, a complete screen, is the Pool loans request (${repositoryFileUrl("demo/prompt.md")}).`,
  ],
  failed: [
    '"node" not found: Node.js isn\'t installed, or the terminal was opened before it was. Install it, then open a new terminal.',
    "The server doesn't start: the path is wrong, or it has spaces and isn't in quotes. In JSON on Windows, write the path " +
      "with forward slashes: `C:/Users/…/sterling-mcp.js`.",
  ],
});
