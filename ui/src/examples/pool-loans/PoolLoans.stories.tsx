// Examples › Pool loans: the loan pooling example's Pool loans screen, built in code by an AI session outside
// this repository from what Sterling publishes (the sterling-ui package and the MCP server) and one product
// request (demo/prompt.md). src/ is that session's code: committed as delivered, then corrected one commit at a
// time (git log on this folder shows each). Storybook resolves its "sterling-ui" imports to src/index.ts
// (.storybook/main.ts), and this file only mounts it. The record of the session is docs/case-study/pool-loans.md.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { textClass } from "../../tokens";
import { App, type AppProps } from "./src/App";
import "./src/app.css";

// Color mode and density come from Storybook's toolbar, as they would from an application around the screen.
// Whether the list fails to load is a control. Changing it remounts the screen (key), so it starts afresh.
function PoolLoansScreen({ loadFails = false }: AppProps) {
  // The delivered app puts the Body text style on <body> (src/main.tsx); here it goes on the story's root.
  return (
    <div className={textClass("Body")}>
      <App key={String(loadFails)} loadFails={loadFails} />
    </div>
  );
}

const meta = {
  title: "Examples/Pool loans",
  component: PoolLoansScreen,
  parameters: { layout: "fullscreen" },
  args: { loadFails: false },
  argTypes: { loadFails: { name: "The list fails to load", control: "boolean" } },
} satisfies Meta<typeof PoolLoansScreen>;
export default meta;

export const PoolLoans: StoryObj<typeof meta> = { name: "Pool loans" };

/** The list failing to load: the error state, with Retry. */
export const LoadFails: StoryObj<typeof meta> = { name: "The list fails to load", args: { loadFails: true } };
