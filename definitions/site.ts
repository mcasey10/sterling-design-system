// Sterling's public addresses and the audience matrix: the one place each is written. Plain data, shared by
// the website build (Start here, the AI page), the export in ai/ and llms.txt, Storybook, the plugin's
// documentation links, and the checks. docRegistry.ts re-exports the addresses it used to hold.
// `npm run check:urls` fails if a Sterling address is written anywhere else in source code, or if the
// view-only Figma file is linked where the Figma Community page belongs.

/** The Sterling website (GitHub Pages): the entry point every other touchpoint links to. */
export const WEBSITE_URL = "https://mcasey10.github.io/sterling-design-system/";
/** The token reference: every token with its values in both color modes, and every contrast pair. */
export const TOKENS_URL = `${WEBSITE_URL}tokens/`;
/** How Sterling works with AI tools, and how to set up the MCP server. */
export const AI_PAGE_URL = `${WEBSITE_URL}ai-tools/`;
/** Storybook: the coded components, with a Docs page each. */
export const STORYBOOK_URL = `${WEBSITE_URL}storybook/`;
/** The machine-readable files for AI tools (ai/ in the repository, published as is). */
export const AI_FILES_URL = `${WEBSITE_URL}ai/`;
/** llms.txt: the plain-text entry point for AI tools that read by URL. */
export const LLMS_TXT_URL = `${WEBSITE_URL}llms.txt`;

/** The public repository: the source of everything above. */
export const REPOSITORY_URL = "https://github.com/mcasey10/sterling-design-system";
/** Released versions, with their downloads. */
export const RELEASES_URL = `${REPOSITORY_URL}/releases`;
/** A file on the repository's main branch as plain text, for tools that read by URL. */
export const RAW_URL = "https://raw.githubusercontent.com/mcasey10/sterling-design-system/main/";
/** The MCP server, latest version. Its file name carries no version, so this address never changes. */
export const MCP_SERVER_DOWNLOAD_URL = `${RELEASES_URL}/latest/download/sterling-mcp.js`;
/** The sterling-ui package for one version, on its Release. Versioned, so a project's lockfile pins it. */
export const packageUrl = (version: string) => `${RELEASES_URL}/download/v${version}/sterling-ui-${version}.tgz`;

/** Sterling's page on Figma Community, where the library can be previewed and duplicated. */
export const FIGMA_COMMUNITY_URL = "https://www.figma.com/community/file/1691833753587232312";
/**
 * The published Figma file itself, view only. For maintainers: everyone else gets the Community page, which
 * check:urls enforces.
 */
export const FIGMA_FILE_URL = "https://www.figma.com/design/1Ah1TdgOoCkaCq1dUZFYbd/Sterling-Design-System";

/** Anchors on the website that setup instructions live under. */
export const INSTALL_PACKAGE_URL = `${WEBSITE_URL}#install-sterling-ui`;
export const MCP_SETUP_URL = `${AI_PAGE_URL}#set-up`;

// ---------------------------------------------------------------- the audience matrix

/** How a reader gets something: the words shown under each link on Start here. */
export type How = "Browser" | "Duplicate" | "Install" | "Download, register once" | "Clone" | "Read by URL";

export interface Place {
  label: string;
  url: string;
  how: How;
}

export interface Audience {
  id: string;
  /** Who: "Developer". */
  role: string;
  /** What they're doing: "Building by hand". */
  activity: string;
  tokens: Place[];
  /** Omitted when it's the same as the column before. */
  components?: Place[];
  guidance?: Place[];
  /** Another way to the same guidance, shown after "or". */
  alternative?: Place[];
}

const tokenReference: Place = { label: "Token reference", url: TOKENS_URL, how: "Browser" };
const storybook: Place = { label: "Storybook", url: STORYBOOK_URL, how: "Browser" };
const storybookDocs: Place = { label: "Storybook Docs", url: STORYBOOK_URL, how: "Browser" };
const communityPreview: Place = { label: "Figma Community preview", url: FIGMA_COMMUNITY_URL, how: "Browser" };
const communityLibrary: Place = { label: "Figma library on Figma Community", url: FIGMA_COMMUNITY_URL, how: "Duplicate" };
const sterlingUi: Place = { label: "sterling-ui from the GitHub Release", url: INSTALL_PACKAGE_URL, how: "Install" };
const mcpServer: Place = { label: "MCP server from the GitHub Release", url: MCP_SETUP_URL, how: "Download, register once" };
const repository: Place = { label: "GitHub repository", url: REPOSITORY_URL, how: "Clone" };

/** Who Sterling is for, and where each finds its tokens, components, and guidance. Start here draws this table. */
export const AUDIENCES: Audience[] = [
  {
    id: "evaluator",
    role: "Evaluator",
    activity: "Seeing what it is",
    tokens: [tokenReference],
    components: [storybook, communityPreview],
    guidance: [storybookDocs],
  },
  {
    id: "designer",
    role: "Designer",
    activity: "Designing screens",
    tokens: [communityLibrary],
  },
  {
    id: "developer",
    role: "Developer",
    activity: "Building by hand",
    tokens: [sterlingUi],
    guidance: [storybookDocs],
  },
  {
    id: "ai-developer",
    role: "AI-assisted developer",
    activity: "Building with an AI tool",
    tokens: [sterlingUi],
    guidance: [mcpServer],
    alternative: [
      { label: "llms.txt", url: LLMS_TXT_URL, how: "Read by URL" },
      { label: "the AI files", url: AI_FILES_URL, how: "Read by URL" },
    ],
  },
  {
    id: "maintainer",
    role: "Maintainer",
    activity: "Changing Sterling",
    tokens: [repository],
  },
];

/** What each "how" means, in a line: Start here prints these under the table. */
export const HOW: Record<How, string> = {
  Browser: "Open it in a web browser. Nothing to set up.",
  Duplicate: "Open the Community page and choose Open in Figma. You need a Figma account.",
  Install: "Install the package into a React project: see Install sterling-ui.",
  "Download, register once": "Download one file and register it with your AI tool: see Set up the MCP server.",
  Clone: "Clone the repository: see its CONTRIBUTING file.",
  "Read by URL": "Give your AI tool the address. Nothing to install.",
};
