// The audience matrix: who Sterling is for, why each would use it, and where each should go. The website's
// Start here draws it (ui/scripts/build-pages.ts), and the README's table is generated from it. Plain data on
// top of the addresses in site.ts.

import { AI_FILES_URL, FIGMA_COMMUNITY_URL, INSTALL_PACKAGE_URL, LLMS_TXT_URL, MCP_SETUP_URL, REPOSITORY_URL, STORYBOOK_URL, TOKENS_URL } from "./site";

/** How a reader gets something: the pill beside each place on Start here. */
export type How = "Browser" | "Duplicate" | "Read by URL" | "Install" | "Download and register once" | "Clone";

/** The hows that need nothing set up first; the rest need some setup, once. */
export const NO_SETUP: readonly How[] = ["Browser", "Duplicate", "Read by URL"];

export interface Link {
  label: string;
  url: string;
}

/** Somewhere to go: one link, or a few that give the same thing ("Token reference and Storybook"). */
export interface Place {
  links: Link[];
  /** What it gives you, in a line. */
  note: string;
  how: How;
  /** Another way to what the place before gives: shown after "Or". */
  or?: boolean;
}

export interface Audience {
  id: string;
  /** Who: "Developer". */
  role: string;
  /** Why this role would use Sterling, in a sentence, addressed to them. */
  why: string;
  places: Place[];
}

const sterlingUi: Place = {
  links: [{ label: "sterling-ui from the GitHub Release", url: INSTALL_PACKAGE_URL }],
  note: "Components and token CSS",
  how: "Install",
};

/** Who Sterling is for, and where each should go. Start here draws this table. */
export const AUDIENCES: Audience[] = [
  {
    id: "evaluator",
    role: "Evaluator",
    why: "You want to see what Sterling covers and how it's built, without setting anything up.",
    places: [
      {
        links: [
          { label: "Token reference", url: TOKENS_URL },
          { label: "Storybook", url: STORYBOOK_URL },
        ],
        note: "Tokens, components, guidance",
        how: "Browser",
      },
      { links: [{ label: "Figma Community preview", url: FIGMA_COMMUNITY_URL }], note: "The Figma library", how: "Browser" },
    ],
  },
  {
    id: "designer",
    role: "Designer",
    why: "You design screens in Figma. Start from components, variables and guidance that match the code, so what you hand off is what gets built.",
    places: [
      {
        links: [{ label: "Figma library on Figma Community", url: FIGMA_COMMUNITY_URL }],
        note: "Variables, components, guideline and pattern pages",
        how: "Duplicate",
      },
    ],
  },
  {
    id: "developer",
    role: "Developer",
    why: "You build screens in React. Use the same components and tokens as the designs, with props named after the Figma properties.",
    places: [sterlingUi, { links: [{ label: "Storybook Docs", url: STORYBOOK_URL }], note: "Guidance for each component", how: "Browser" }],
  },
  {
    id: "ai-developer",
    role: "AI-assisted developer",
    why: "You build with an AI coding tool. Give it Sterling's components, tokens and rules, so the code it writes follows the system instead of inventing its own.",
    places: [
      sterlingUi,
      {
        links: [{ label: "MCP server from the GitHub Release", url: MCP_SETUP_URL }],
        note: "Guidance and token lookup for your AI tool",
        how: "Download and register once",
      },
      {
        links: [
          { label: "llms.txt", url: LLMS_TXT_URL },
          { label: "the AI files", url: `${AI_FILES_URL}index.json` },
        ],
        note: "The same information, for tools that read web pages",
        how: "Read by URL",
        or: true,
      },
    ],
  },
  {
    id: "maintainer",
    role: "Maintainer",
    why: "You change Sterling itself. Edit the source, and every output is regenerated and checked.",
    places: [{ links: [{ label: "GitHub repository", url: REPOSITORY_URL }], note: "The source everything above is generated from", how: "Clone" }],
  },
];

/** What each "how" means, in a line: Start here prints these under the table as its key, in this order. */
export const HOW: Record<How, string> = {
  Browser: "Open it in a web browser.",
  Duplicate: "Open the Community page and choose Open in Figma. You need a Figma account.",
  "Read by URL": "Give your AI tool the address.",
  Install: "Install the package into a React project: see Install sterling-ui.",
  "Download and register once": "Download one file and register it with your AI tool: see Set up the MCP server.",
  Clone: "Clone the repository: see its CONTRIBUTING file.",
};
