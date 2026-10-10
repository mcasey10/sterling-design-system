import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "storybook-addon-pseudo-states"],
  core: { disableTelemetry: true },
  features: { sidebarOnboardingChecklist: false },
  viteFinal: (vite) => {
    // tokens/, definitions/ and scripts/lib/ sit beside ui/, so the dev server must be allowed to read them.
    vite.server = { ...vite.server, fs: { ...vite.server?.fs, allow: [...(vite.server?.fs?.allow ?? []), repoRoot] } };
    return vite;
  },
};

export default config;
