// Setup instructions, written once: the website, the README, and Storybook show them from here. Plain data.
// Every block answers the same questions, in the same order, so a reader never has to guess which console
// to use, which folder to be in, or what has to be set up first:
//   where   which console, and which folder (or "any folder")
//   need    each prerequisite, with a command that checks it, what it should show, and where to get it
//   steps   what to do: text, and commands (one per block)
//   scope   only where it matters, with the choice to make
//   worked  what you see when it worked, and the first thing to try next
//   failed  the one or two most likely causes when it didn't
// Text may use `backticks` for code.

import { STORYBOOK_URL, packageUrl } from "./site";

export interface Prerequisite {
  what: string;
  check: string;
  expect: string;
  get: string;
}

export interface Step {
  text?: string;
  command?: string;
}

export interface SetupBlock {
  id: string;
  title: string;
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
  get: "nodejs.org (the LTS version). Open a new terminal after installing it.",
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
      get: "a new project from Vite: `npm create vite@latest`, then choose React and TypeScript.",
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
