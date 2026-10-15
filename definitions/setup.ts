// Setup instructions, written once: the website, the README, and Storybook show them from here. Plain data.
// Every block answers the same questions, in the same order, so a reader never has to guess which console
// to use, which folder to be in, or what has to be set up first:
//   where   which console, and which folder (or "any folder")
//   need    each prerequisite, with a command that checks it, what it should show, and where to get it
//   steps   what to do: text, and commands (one per block); `choices` sets alternatives side by side
//   scope   only where it matters, with the choice to make
//   worked  what you see when it worked, and the first thing to try next
//   failed  the one or two most likely causes when it didn't
// Text may use `backticks` for code.

import { MCP_SERVER_DOWNLOAD_URL, STORYBOOK_URL, packageUrl } from "./site";

export interface Prerequisite {
  what: string;
  /** A command that checks it, and what it shows when it's there. Left out when there's nothing to run. */
  check?: string;
  expect?: string;
  /** What to do when it's missing, after "If not, ". */
  get: string;
}

/** One of several ways to do a step, shown side by side: "Claude Code" and "Any other MCP client". */
export interface Choice {
  title: string;
  text: string;
  command: string;
}

export interface Step {
  text?: string;
  command?: string;
  choices?: Choice[];
}

export interface SetupBlock {
  id: string;
  title: string;
  /** A line or two before the headings, when the reader needs it first. */
  intro?: string;
  where: string;
  need: Prerequisite[];
  steps: Step[];
  scope?: string;
  worked: string;
  failed: string[];
}

const ANY_TERMINAL = "Any terminal: PowerShell on Windows, Terminal on macOS, or the terminal in your editor. No administrator rights needed.";
const NODE: Prerequisite = {
  what: "Node.js 20 or later",
  check: "node --version",
  expect: "`v20` or higher",
  get: "install the LTS version from nodejs.org, then open a new terminal.",
};

/** Installing the React components into an application. */
export const installPackage = (version: string): SetupBlock => ({
  id: "install-sterling-ui",
  title: "Install sterling-ui",
  where:
    `${ANY_TERMINAL} Open it in your React project's folder, the one with \`package.json\`: go there with \`cd\`, ` +
    "or open the folder in your editor and open its terminal.",
  need: [
    NODE,
    {
      what: "A React 19 project",
      check: "npm ls react",
      expect: "`react@19…`",
      get: "upgrade the project to React 19, or start a new one with Vite.",
    },
  ],
  steps: [
    { text: "Install the package from the GitHub Release:" },
    { command: `npm install ${packageUrl(version)}` },
    {
      text:
        `No network access during installs? Download \`sterling-ui-${version}.tgz\` from the Release into the project, ` +
        `for example into a \`vendor\` folder, and install that file instead. Commit the file, so others can install it too:`,
    },
    { command: `npm install ./vendor/sterling-ui-${version}.tgz` },
    { text: "Then, once, at the top of your app's entry file (for example `src/main.tsx`):" },
    { command: 'import "sterling-ui/styles.css";\nimport "sterling-ui/fonts.css";' },
  ],
  worked:
    "`package.json` lists `sterling-ui`, and a Sterling button shows: `import { Button } from \"sterling-ui\"`, then " +
    `\`<Button label="Save" kind="primary" />\`. Next: each component's Docs page in Storybook (${STORYBOOK_URL}).`,
  failed: [
    "`ERESOLVE` mentioning React: the project isn't on React 19. Check with `npm ls react`.",
    "`404` or \"not found\": check the version number in the address.",
  ],
});

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
      get: "Any MCP client works. Its documentation says where to add an MCP server.",
    },
  ],
  steps: [
    {
      text:
        `Download \`sterling-mcp.js\` from the latest GitHub Release (${MCP_SERVER_DOWNLOAD_URL}). Put it in a folder where it ` +
        "can stay, for example a `tools` folder in your home folder, and note its full path.",
    },
    { text: "Check that it runs. In any terminal, from any folder:" },
    { command: 'node "/full/path/to/sterling-mcp.js" --version' },
    { text: `It prints \`Sterling MCP server ${version} · …\`. Then register it with your AI tool, once:` },
    {
      choices: [
        {
          title: "Claude Code",
          text: "In any terminal, from any folder:",
          command: 'claude mcp add --scope user sterling -- node "/full/path/to/sterling-mcp.js"',
        },
        {
          title: "Any other MCP client",
          text: "Add a server to the client's MCP settings: command `node`, argument the file's full path.",
          command: `{
  "mcpServers": {
    "sterling": { "command": "node", "args": ["/full/path/to/sterling-mcp.js"] }
  }
}`,
        },
      ],
    },
  ],
  scope:
    "`--scope user` makes Sterling available in every project, which is right for most people. To share it with a team " +
    "through one repository instead, put the JSON above in that project's `.mcp.json`, with a path that works for everyone.",
  worked:
    'Your tool lists `sterling` as connected (in Claude Code, run `/mcp`). Then ask: "Which Sterling component shows a ' +
    'record\'s status?" It should answer Chip/Status, from the server.',
  failed: [
    '"node" not found: Node.js isn\'t installed, or the terminal was opened before it was. Install it, then open a new terminal.',
    "The server doesn't start: the path is wrong, or it has spaces and isn't in quotes. In JSON on Windows, write the path " +
      "with forward slashes: `C:/Users/…/sterling-mcp.js`.",
  ],
});
