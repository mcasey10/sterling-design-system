import type { Decorator, Preview } from "@storybook/react-vite";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
// Generated from tokens/tokens.json by `npm run tokens` (runs before Storybook starts). Never edit it.
import "../src/styles/tokens.css";
import "../src/styles/base.css";
import { COLOR_MODES, DENSITY_MODES, DEFAULT_DENSITY, densityClass, textClass } from "../src/tokens";

/**
 * Applies the toolbar's Theme and Density the way an application would: data-theme on the root element,
 * and the density class on the body (Default needs none; it is what :root declares). Body is the default
 * text style.
 */
const withThemeAndDensity: Decorator = (Story, context) => {
  const theme = String(context.globals.theme);
  const density = String(context.globals.density);
  document.documentElement.dataset.theme = theme.toLowerCase();
  document.body.classList.add(textClass("Body"));
  for (const mode of DENSITY_MODES) {
    if (mode !== DEFAULT_DENSITY) document.body.classList.toggle(densityClass(mode), mode === density);
  }
  return <Story />;
};

const preview: Preview = {
  decorators: [withThemeAndDensity],
  globalTypes: {
    theme: {
      description: "Color mode",
      toolbar: { title: "Theme", icon: "circlehollow", items: [...COLOR_MODES], dynamicTitle: true },
    },
    density: {
      description: "Density mode",
      toolbar: { title: "Density", icon: "component", items: [...DENSITY_MODES], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: COLOR_MODES[0], density: DEFAULT_DENSITY },
  parameters: {
    // The canvas background is Sterling's own surface color, which follows the Theme toolbar.
    backgrounds: { disable: true },
    layout: "padded",
    // Accessibility violations are errors, not warnings.
    a11y: { test: "error" },
    options: {
      storySort: { order: ["Foundations", ["Color", "Spacing and size", "Density", "Typography"], "Components"] },
    },
  },
};

export default preview;
