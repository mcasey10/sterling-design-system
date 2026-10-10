import type { Meta, StoryObj } from "@storybook/react-vite";
import { argTypes, defaultArgs, docs } from "../stories/definitions";
import { BulkActionBar, type BulkActionBarProps } from "./BulkActionBar";
import { Button } from "./Button";
import "../stories/stories.css";

const NAME = "Grid/BulkActionBar";

/** The actions the library's generic bar shows. */
const ACTIONS = (
  <>
    <Button kind="ghost" label="Clear selection" />
    <Button kind="secondary" label="Export" />
    <Button kind="danger" label="Delete" />
    <Button kind="primary" label="Primary action" />
  </>
);

// Show destructive is a Figma toggle for one of the bar's buttons; in code the actions are children.
const { showDestructive: _control, ...controls } = argTypes(NAME) as Record<string, object>;
const { showDestructive: _default, ...defaults } = defaultArgs(NAME);

const meta = {
  title: "Components/Grid/BulkActionBar",
  component: BulkActionBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `${docs(NAME)}\n\n**In code** the actions are children, the count is announced to screen readers when it changes, and the mark beside the count is a picture of the selection, not a control.`,
      },
    },
    layout: "padded",
  },
  argTypes: { ...controls, children: { control: false } },
  args: { ...(defaults as unknown as BulkActionBarProps), children: ACTIONS },
} satisfies Meta<typeof BulkActionBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A disabled action with the reason beside it. The button points to the hint, so a screen reader reads both. */
export const WithHint: Story = {
  name: "With a hint",
  args: {
    showHint: true,
    hintId: "bar-hint",
    children: (
      <>
        <Button kind="ghost" label="Clear selection" />
        <Button kind="secondary" label="Export" />
        <Button kind="primary" label="Primary action" disabled aria-describedby="bar-hint" />
      </>
    ),
  },
};

/** Once every matching row is selected, the count says so and the offer to select them all goes away. */
export const AllMatchingSelected: Story = {
  name: "All matching selected",
  args: { count: "All 120 matching selected", showSelectAll: false, allSelected: true },
};
