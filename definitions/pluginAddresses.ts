// The addresses the Figma plugin uses: the website (on the Cover and the Read me page), Storybook (which its
// documentation links open), and the repository and its CONTRIBUTING file (on the Read me page). Kept apart from
// site.ts, which re-exports them, so the plugin's bundle doesn't change when the website's other addresses do
// (esbuild keeps every template-literal constant of a file it bundles, used or not). Import from site.ts
// everywhere but docRegistry.ts and the plugin.

/** The Sterling website (GitHub Pages): the entry point every other touchpoint links to. */
export const WEBSITE_URL = "https://mcasey10.github.io/sterling-design-system/";
/** Storybook: the coded components, with a Docs page each. */
export const STORYBOOK_URL = `${WEBSITE_URL}storybook/`;
/** The public repository: the source of everything Sterling publishes. */
export const REPOSITORY_URL = "https://github.com/mcasey10/sterling-design-system";
/** How a change to Sterling is proposed, built, checked, and released. */
export const CONTRIBUTING_URL = `${REPOSITORY_URL}/blob/main/CONTRIBUTING.md`;
