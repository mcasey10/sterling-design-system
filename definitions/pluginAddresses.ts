// The addresses the Figma plugin uses: the website, and Storybook, which its documentation links open. Kept
// apart from site.ts, which re-exports them, so the plugin's bundle doesn't change when the website's other
// addresses do (esbuild keeps every template-literal constant of a file it bundles, used or not). Import from
// site.ts everywhere but docRegistry.ts.

/** The Sterling website (GitHub Pages): the entry point every other touchpoint links to. */
export const WEBSITE_URL = "https://mcasey10.github.io/sterling-design-system/";
/** Storybook: the coded components, with a Docs page each. */
export const STORYBOOK_URL = `${WEBSITE_URL}storybook/`;
