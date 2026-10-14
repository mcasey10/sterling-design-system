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
    // Examples are written against the sterling-ui package, as an application outside Sterling would write them
    // (src/examples/). Here the package is its source, src/index.ts, so an example runs unchanged.
    vite.resolve = { ...vite.resolve, alias: { ...(vite.resolve?.alias as Record<string, string> | undefined), "sterling-ui": resolve(repoRoot, "ui/src/index.ts") } };
    return vite;
  },
};

export default config;
