import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { textClass } from "../tokens";
import { BodyCell } from "./BodyCell";
import { HeaderCell, type HeaderCellProps } from "./HeaderCell";
import "../stories/stories.css";

const NAME = "Grid/HeaderCell";

/** A header cell is a <th>, so by itself it sits in a one-cell table. */
const InATable = ({ children }: { children: ReactNode }) => (
  <table className="stl-story-cell">
    <thead>
      <tr>{children}</tr>
    </thead>
  </table>
);

const meta = {
  title: "Components/Grid/HeaderCell",
  component: HeaderCell,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: argTypes(NAME),
  args: defaultArgs(NAME) as unknown as HeaderCellProps,
  render: (args) => (
    <InATable>
      <HeaderCell {...args} />
    </InATable>
  ),
} satisfies Meta<typeof HeaderCell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every Sort, Align, and State in the definition. Hover and focus are forced here; in use they come from CSS. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <AllVariants<HeaderCellProps>
      component={NAME}
      render={(props) => (
        <InATable>
          <HeaderCell {...props} label="Column" />
        </InATable>
      )}
    />
  ),
};

/**
 * The rule for numeric columns: the header label ends exactly where the values end, and the sort icon sits
 * immediately to the label's left, at any column width. In a column too narrow for its label, the label
 * truncates and the icon keeps its place. Numbers never truncate.
 */
export const RightAlignedAtAnyWidth: Story = {
  name: "Right-aligned at any width",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="stl-story-column">
      {[
        ["A column sized to its values", "Amount", "calc(var(--stl-size-40) * 2.2)"],
        ["A much wider column", "Amount", "calc(var(--stl-size-40) * 6)"],
        ["A label longer than its column", "Amount outstanding", "calc(var(--stl-size-40) * 2.2)"],
      ].map(([caption, label, width]) => (
        <div key={caption}>
          <span className={textClass("Caption")}>{caption}</span>
          <table className="stl-story-table" style={{ width }}>
            <thead>
              <tr>
                <HeaderCell label={label} align="right" sort="desc" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <BodyCell type="numeric" value="2,100.00" />
              </tr>
              <tr>
                <BodyCell type="numeric" value="840.00" />
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  ),
};

/** Show sort off: the column can't be sorted, so the header has no icon and isn't a button. */
export const NotSortable: Story = {
  name: "Not sortable",
  args: { showSort: false, label: "Notes" },
};
