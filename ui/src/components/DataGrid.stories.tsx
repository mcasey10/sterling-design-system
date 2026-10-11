import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { DATA, INITIALLY_SELECTED, MATCHING, sortRows } from "../stories/gridData";
import { docs } from "../stories/definitions";
import { BulkActionBar } from "./BulkActionBar";
import { Button } from "./Button";
import { DataGrid, type DataGridProps, type GridSort } from "./DataGrid";
import "../stories/stories.css";

const NAME = "Grid/Data grid";

const meta = {
  title: "Components/Grid/Data grid",
  component: DataGrid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `${docs(NAME)}\n\n**In code** the grid is a native table. Tab moves between the header sort buttons and the row checkboxes; screen readers use their table commands. Shift+click or Shift+Space selects a range of rows. The grid shows the rows, sort, and selection it is given: the application sorts, pages, and stores the selection.`,
      },
    },
    controls: { include: ["label", "fill"] },
  },
  args: { label: "Items", columns: DATA.columns, rows: DATA.rows, tones: DATA.tones },
  // The story holds the sort and the selection, as an application would.
  render: function Stateful(args) {
    const [sort, setSort] = useState<GridSort>({ key: DATA.sortKey ?? "id", direction: "asc" });
    const [selected, setSelected] = useState<string[]>(INITIALLY_SELECTED);
    return <DataGrid {...args} rows={sortRows(args.rows, sort)} sort={sort} onSortChange={setSort} selected={selected} onSelectedChange={setSelected} />;
  },
} satisfies Meta<typeof DataGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The library's generic grid: two rows selected, one cell flagged with an error, sorted by ID. */
export const Default: Story = {};

/**
 * Selecting rows shows the bulk action bar above the grid; clearing the selection removes it and moves focus
 * to the grid's select-all checkbox. The bar says how many rows are selected, offers every matching row, and
 * explains why its main action is disabled.
 */
export const WithBulkActions: Story = {
  name: "With bulk actions",
  parameters: { controls: { disable: true } },
  render: function Selecting(args: DataGridProps) {
    const [sort, setSort] = useState<GridSort>({ key: "id", direction: "asc" });
    const [selected, setSelected] = useState<string[]>(INITIALLY_SELECTED);
    const [allMatching, setAllMatching] = useState(false);
    const select = (ids: string[]) => {
      setSelected(ids);
      setAllMatching(false);
    };
    // Clearing the selection removes the bar, and with it the button that had focus: move focus to the grid's
    // select-all checkbox, so a keyboard user isn't sent back to the top of the page.
    const stack = useRef<HTMLDivElement>(null);
    const clear = () => {
      select([]);
      stack.current?.querySelector<HTMLInputElement>("thead input")?.focus();
    };
    // The main action applies to Pending rows only.
    const eligible = DATA.rows.filter((row) => selected.includes(row.values.id) && row.values.status === "Pending").length;
    return (
      <div className="stl-story-stack" ref={stack}>
        {/* Always rendered: with an empty count the bar shows nothing but keeps its status region in the page. */}
        <BulkActionBar
            count={selected.length === 0 ? "" : allMatching ? `All ${MATCHING} matching selected` : `${selected.length} selected`}
            selectAll={`Select all ${MATCHING} matching`}
            showSelectAll={!allMatching}
            onSelectAll={() => {
              setSelected(DATA.rows.map((row) => row.values.id));
              setAllMatching(true);
            }}
            hint="No Pending items selected"
            showHint={eligible === 0}
            hintId="bulk-hint"
          >
            <Button kind="ghost" label="Clear selection" onClick={clear} />
            <Button kind="secondary" label="Export" />
            <Button kind="danger" label="Delete" />
            <Button
              kind="primary"
              label={eligible > 0 ? `Approve ${eligible}` : "Approve"}
              disabled={eligible === 0}
              aria-describedby={eligible === 0 ? "bulk-hint" : undefined}
            />
        </BulkActionBar>
        <DataGrid {...args} rows={sortRows(args.rows, sort)} sort={sort} onSortChange={setSort} selected={selected} onSelectedChange={select} />
      </div>
    );
  },
};

/** With `fill`, the grid takes its container's width and only the descriptive text column (Name) stretches. */
export const FillTheWidth: Story = {
  name: "Fill the width",
  args: { fill: true },
};
