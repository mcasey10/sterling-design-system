import type { Meta, StoryObj } from "@storybook/react-vite";
import { DATA } from "../stories/gridData";
import { argTypes, defaultArgs, docs } from "../stories/definitions";
import { SkeletonRow, type SkeletonRowProps } from "./GridStates";
import "../stories/stories.css";

const NAME = "Grid/Skeleton row";

const meta = {
  title: "Components/Grid/Skeleton row",
  component: SkeletonRow,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `${docs(NAME)}\n\n**In code** a skeleton row is hidden from assistive technology; the grid says it is loading. Data grid\u2019s \`loading\` prop does both: see Data grid › Loading.`,
      },
    },
  },
  argTypes: { ...argTypes(NAME), columns: { control: false } },
  args: { ...(defaultArgs(NAME) as unknown as SkeletonRowProps), columns: DATA.columns },
  // A skeleton row is a <tr>, so by itself it sits in a table with the generic grid's column widths.
  render: (args) => (
    <table className="stl-story-table">
      <colgroup>
        {DATA.columns.map((column) => (
          <col key={column.key} style={{ width: column.width }} />
        ))}
      </colgroup>
      <tbody>
        <SkeletonRow {...args} />
      </tbody>
    </table>
  ),
} satisfies Meta<typeof SkeletonRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Turn the label on for the first row, so loading isn't conveyed by the bars alone. */
export const WithLabel: Story = {
  name: "With the label",
  args: { showLabel: true },
};
