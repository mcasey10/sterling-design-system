import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";
import pkg from "../../package.json";

addons.setConfig({
  // On the published site the title links to the token reference, one folder up (set by scripts/build-site.mjs).
  theme: create({ base: "light", brandTitle: `Sterling ${pkg.version}`, brandUrl: process.env.STORYBOOK_TOKEN_SITE_URL || undefined, brandTarget: "_self" }),
});
