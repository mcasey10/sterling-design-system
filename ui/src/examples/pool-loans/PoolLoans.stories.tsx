// Examples › Pool loans: the loan pooling example's Pool loans screen, built in code by an AI session outside
// this repository from what Sterling publishes (the sterling-ui package and the MCP server) and one product
// request (demo/prompt.md). src/ is that session's code as delivered, unchanged: Storybook resolves its
// "sterling-ui" imports to src/index.ts (.storybook/main.ts), and this file only mounts it. The record of the
// session is docs/case-study/pool-loans.md.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { textClass } from "../../tokens";
import { App } from "./src/App";
import "./src/app.css";

function PoolLoansScreen() {
  // The delivered app puts the Body text style on <body> (src/main.tsx); here it goes on the story's root.
  return (
    <div className={textClass("Body")}>
      <App />
    </div>
  );
}

const meta = {
  title: "Examples/Pool loans",
  component: PoolLoansScreen,
  parameters: { layout: "fullscreen", controls: { disable: true } },
} satisfies Meta<typeof PoolLoansScreen>;
export default meta;

export const PoolLoans: StoryObj<typeof meta> = { name: "Pool loans" };
