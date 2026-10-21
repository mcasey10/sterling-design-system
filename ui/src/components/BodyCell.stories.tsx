import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { BodyCell, type BodyCellProps } from "./BodyCell";
import { Checkbox } from "./Checkbox";
import { StatusChip } from "./StatusChip";
import "../stories/stories.css";

const NAME = "Grid/BodyCell";

/** A body cell is a <td>, so by itself it sits in a one-cell table. */
const InATable = ({ children, checkbox }: { children: ReactNode; checkbox?: boolean }) => (
  <table className={checkbox ? "stl-story-cell stl-story-cell--checkbox" : "stl-story-cell"}>
    <tbody>
      <tr>{children}</tr>
    </tbody>
  </table>
);

/** What each cell type shows in these stories. */
const sample = (props: BodyCellProps): BodyCellProps => {
  switch (props.type) {
    case "numeric":
      return { ...props, value: "1,250.00" };
    case "gain":
      return { ...props, value: "+1.25%" };
    case "loss":
      return { ...props, value: "−0.80%" };
    case "chip":
      return { ...props, children: <StatusChip tone="neutral" label="Status" /> };
    case "checkbox":
      return { ...props, children: <Checkbox label="Select row" checked={props.selected ? "on" : "off"} onChange={() => {}} /> };
    default:
      return { ...props, value: props.value ?? "Value" };
  }
};

const meta = {
  title: "Components/Grid/BodyCell",
  component: BodyCell,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: {
    ...argTypes(NAME),
    selected: { control: "boolean", description: "The cell's row is selected.", table: { type: { summary: "boolean" } } },
    validation: { control: "select", options: [undefined, "warning", "error"], table: { type: { summary: '"warning" | "error"' } } },
    children: { control: false },
  },
  args: defaultArgs(NAME) as unknown as BodyCellProps,
  render: (args) => (
    <InATable checkbox={args.type === "checkbox"}>
      <BodyCell {...sample(args)} />
    </InATable>
  ),
} satisfies Meta<typeof BodyCell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Every Type and State in the definition. Hover and focus are forced here; in use they come from CSS.
 * Selected is the `selected` prop, and warning and error are the validation prop.
 */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <AllVariants<BodyCellProps>
      component={NAME}
      states={{ selected: { selected: true }, warning: { validation: "warning" }, error: { validation: "error" } }}
      render={(props) => (
        <InATable checkbox={props.type === "checkbox"}>
          <BodyCell {...sample(props)} tabIndex={-1} />
        </InATable>
      )}
    />
  ),
};

/** Text truncates with an ellipsis; a number never does, so size numeric columns to their longest value. */
export const TruncateTextNeverNumbers: Story = {
  name: "Truncate text, never numbers",
  parameters: { controls: { disable: true } },
  render: () => (
    <table className="stl-story-table" style={{ width: "calc(var(--stl-size-40) * 5)" }}>
      <tbody>
        <tr>
          <BodyCell value="A long descriptive name that does not fit" />
          <BodyCell type="numeric" value="12,345,678.90" style={{ width: "calc(var(--stl-size-40) * 2.75)" }} />
        </tr>
      </tbody>
    </table>
  ),
};

/**
 * A flagged cell with its reason. The flag's icon says "Warning"; `description` adds why, for screen readers,
 * so they hear "Warning, 21.0%, Above the 20% limit". The reason is on screen too, in the cell beside it.
 */
export const FlaggedWithReason: Story = {
  name: "Flagged, with its reason",
  parameters: { controls: { disable: true } },
  render: () => (
    <table className="stl-story-table">
      <tbody>
        <tr>
          <BodyCell type="numeric" value="21.0%" validation="warning" description="Above the 20% limit" />
          <BodyCell value="Above the 20% limit" />
        </tr>
      </tbody>
    </table>
  ),
};
