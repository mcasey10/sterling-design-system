// Sterling's public addresses: the one place each is written (with pluginAddresses.ts, which holds the two the
// Figma plugin uses, re-exported here). Plain data, shared by the website build, the export in ai/ and
// llms.txt, Storybook, and the checks. Import addresses from here. The plugin doesn't bundle this file, so
// the website's pages can change without changing the plugin; the audience matrix is in audiences.ts.
// `npm run check:urls` fails if a Sterling address is written anywhere else in source code, or if the
// view-only Figma file is linked where the Figma Community page belongs.

import { STORYBOOK_URL, WEBSITE_URL } from "./pluginAddresses";
export { STORYBOOK_URL, WEBSITE_URL };

/** The token reference: every token with its values in both color modes, and every contrast pair. */
export const TOKENS_URL = `${WEBSITE_URL}tokens/`;
/** How Sterling works with AI tools, and how to set up the MCP server. */
export const AI_PAGE_URL = `${WEBSITE_URL}ai-tools/`;
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

/** How to install sterling-ui into a React project: a page of its own, so Start here stays a map. */
export const INSTALL_PACKAGE_URL = `${WEBSITE_URL}install/`;
/** How to set up the MCP server, on the AI page. */
export const MCP_SETUP_URL = `${AI_PAGE_URL}#set-up`;
