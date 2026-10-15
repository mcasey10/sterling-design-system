// Examples › Pool loans: the loan pooling example's Pool loans screen, built in code by an AI session outside
// this repository from what Sterling publishes (the sterling-ui package and the MCP server) and one product
// request (demo/prompt.md). src/ is that session's code: committed as delivered, then corrected one commit at a
// time (git log on this folder shows each). Storybook resolves its "sterling-ui" imports to src/index.ts
// (.storybook/main.ts), and this file only mounts it. The record of the session is docs/case-study/pool-loans.md.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { textClass } from "../../tokens";
import { App, type AppProps } from "./src/App";
import { CAPPED_LENDER, PREDEFINED_VIEWS, sampleLoans, shortLender, totals } from "./src/data";
import raw from "./data/pool-2026-07.json";
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

// ---------------------------------------------------------------- Filter counts (an interaction test)

/** The counts the screen must show, from the data file. */
const VIEW = PREDEFINED_VIEWS[0];
const VIEW_COUNT = raw.savedViews[0].matchingLoans;
const FICO = "660-679";
const FICO_COUNT = sampleLoans.filter((l) => l.lender === CAPPED_LENDER && l.fico >= 660 && l.fico <= 679).length;

/**
 * Filters, Reset, "Any lender", and Clear all, checked by the loan count the screen reports. Runs in Storybook's
 * Interactions panel, and in CI (`npm run check:interactions`).
 */
export const FilterCounts: StoryObj<typeof meta> = {
  name: "Filter counts (test)",
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    // The number in "Showing 1–12 of 58 pool loans", once the list has loaded; null when there's no such line.
    const count = () => {
      const line = canvas.queryAllByRole("status").find((el) => /pool loans?/.test(el.textContent ?? ""));
      const match = /of ([\d,]+) pool loans?/.exec(line?.textContent ?? "");
      return match ? Number(match[1].replace(/,/g, "")) : null;
    };
    const expectCount = (n: number) => waitFor(() => expect(count()).toBe(n), { timeout: 5000 });
    const chips = () => canvas.queryAllByRole("button", { name: /^Remove filter:/ }).length;
    // The selects in the filter panel (the grid's column headers are buttons named "Lender" and "Status" too).
    const panel = () => within(canvas.getByRole("region", { name: "Filter pool loans" }));
    const lender = () => panel().getByRole("button", { name: /Lender/ });
    const status = () => panel().getByRole("button", { name: /Status/ });
    // A select, by keyboard: Arrow Down opens its list, then arrows move to the option and Enter chooses it.
    const choose = async (button: HTMLElement, option: string) => {
      button.focus();
      await userEvent.keyboard("{ArrowDown}");
      const listbox = await page.findByRole("listbox");
      const options = within(listbox).getAllByRole("option");
      const target = options.findIndex((o) => o.textContent?.trim() === option);
      await expect(target).toBeGreaterThanOrEqual(0);
      await userEvent.keyboard("{Home}");
      for (let i = 0; i < target; i++) await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(page.queryByRole("listbox")).toBeNull());
    };

    await step(`The default view, ${VIEW.name}: ${VIEW_COUNT} loans`, async () => {
      await expectCount(VIEW_COUNT);
      await expect(canvas.getByRole("tab", { name: new RegExp(`${totals.loansInPool}`) })).toBeInTheDocument();
    });

    await step(`A filter: FICO ${FICO} → ${FICO_COUNT}, and the view is edited`, async () => {
      // Entered as one input event, as a paste is: userEvent.type sets the value in a way React's controlled input
      // doesn't register, so React drops it. Typing on a keyboard works; this is a limit of the simulation.
      const fico = canvas.getByRole("textbox", { name: "FICO" });
      await userEvent.click(fico);
      await fireEvent.input(fico, { target: { value: FICO } });
      await userEvent.click(canvas.getByRole("button", { name: "Apply" }));
      await expectCount(FICO_COUNT);
      await expect(canvasElement.textContent).toContain(`${VIEW.name} · edited`);
    });

    await step(`Reset: back to the view's own filters, ${VIEW_COUNT} loans`, async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Reset" }));
      await expectCount(VIEW_COUNT);
      await expect(canvasElement.textContent).not.toContain("· edited");
    });

    await step(`"Any lender": no lender filter, all ${totals.loansInPool} loans`, async () => {
      await choose(lender(), "Any lender");
      await userEvent.click(canvas.getByRole("button", { name: "Apply" }));
      await expectCount(totals.loansInPool);
      await expect(chips()).toBe(0);
    });

    await step(`Clear all: no filters, all ${totals.loansInPool} loans`, async () => {
      await choose(lender(), shortLender(CAPPED_LENDER));
      await choose(status(), "Ready");
      await userEvent.click(canvas.getByRole("button", { name: "Apply" }));
      await waitFor(() => expect(chips()).toBe(2), { timeout: 5000 });
      await userEvent.click(canvas.getByRole("button", { name: "Clear all" }));
      await expectCount(totals.loansInPool);
      await expect(chips()).toBe(0);
    });
  },
};
