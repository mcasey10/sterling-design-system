import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { componentDef } from "../../../definitions/components";
import { DATA } from "../stories/gridData";
import { FORCED_STATES, docs, stateProps } from "../stories/definitions";
import { textClass } from "../tokens";
import { BodyCell } from "./BodyCell";
import { Checkbox } from "./Checkbox";
import { Row, type RowProps } from "./DataGrid";
import { StatusChip, type StatusChipTone } from "./StatusChip";
import "../stories/stories.css";

const NAME = "Grid/Row";
const SAMPLE = DATA.rows[0];

/** A row is a <tr>, so by itself it sits in a table with the generic grid's column widths. */
const InATable = ({ children }: { children: ReactNode }) => (
  <table className="stl-story-table">
    <colgroup>
      {DATA.columns.map((column) => (
        <col key={column.key} style={{ width: column.width }} />
      ))}
    </colgroup>
    <tbody>{children}</tbody>
  </table>
);

/** The generic grid's first row, as cells. */
const cells = (selected = false) =>
  DATA.columns.map((column) => {
    const value = SAMPLE.values[column.key] ?? "";
    if (column.type === "checkbox") {
      return (
        <BodyCell key={column.key} type="checkbox">
          <Checkbox label={`Select ${SAMPLE.values.id}`} checked={selected ? "on" : "off"} onChange={() => {}} />
        </BodyCell>
      );
    }
    if (column.type === "chip") {
      return (
        <BodyCell key={column.key} type="chip">
          <StatusChip tone={(DATA.tones[value] ?? "neutral") as StatusChipTone} label={value} />
        </BodyCell>
      );
    }
    return <BodyCell key={column.key} type={column.type} value={value} />;
  });

const meta = {
  title: "Components/Grid/Row",
  component: Row,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: { selected: { control: "boolean", description: "The selected state.", table: { type: { summary: "boolean" } } }, children: { control: false } },
  args: { selected: false },
  render: (args) => (
    <InATable>
      <Row {...args}>{cells(args.selected)}</Row>
    </InATable>
  ),
} satisfies Meta<typeof Row>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every State in the definition. Hover is forced here; in use it comes from CSS. Selected is the `selected` prop. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <div className="stl-story-column">
      {componentDef(NAME).variants.State.map((state) => {
        const props = stateProps(state, { selected: { selected: true } }) as RowProps;
        return (
          <div key={state}>
            <span className={textClass("Caption")}>{state}</span>
            <InATable>
              <Row {...props}>{cells(props.selected)}</Row>
            </InATable>
          </div>
        );
      })}
    </div>
  ),
};
