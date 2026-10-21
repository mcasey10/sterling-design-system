import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";
import pkg from "../../package.json";

const TITLE = `Sterling ${pkg.version}`;

addons.setConfig({
  // On the published site the title links to the website, one folder up (set by scripts/build-site.mjs).
  theme: create({ base: "light", brandTitle: TITLE, brandUrl: process.env.STORYBOOK_TOKEN_SITE_URL || undefined, brandTarget: "_self" }),
});

// The browser tab reads the same as the title in the sidebar. Storybook's own page title is "storybook - Storybook",
// and it may set its own again, so keep it.
const keepTitle = () => {
  if (document.title !== TITLE) document.title = TITLE;
};
keepTitle();
new MutationObserver(keepTitle).observe(document.head, { subtree: true, childList: true, characterData: true });
