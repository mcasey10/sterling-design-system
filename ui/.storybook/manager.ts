import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";
import pkg from "../../package.json";

addons.setConfig({
  theme: create({ base: "light", brandTitle: `Sterling ${pkg.version}` }),
});
