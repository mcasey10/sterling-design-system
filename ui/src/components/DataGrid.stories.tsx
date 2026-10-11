import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { ALL_ROWS, DATA, INITIALLY_SELECTED, MATCHING, PAGE_SIZE, sortRows } from "../stories/gridData";
import { docs } from "../stories/definitions";
import { BulkActionBar } from "./BulkActionBar";
import { Button } from "./Button";
import { DataGrid, type DataGridProps, type GridSort } from "./DataGrid";
import { EmptyState, Pagination } from "./GridStates";
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

/**
 * A page of a longer result set, with Pagination under the grid. Previous is disabled on the first page and
 * Next on the last; the range is announced to screen readers when the page changes.
 */
export const WithPagination: Story = {
  name: "With pagination",
  parameters: { controls: { disable: true } },
  render: function Paging(args: DataGridProps) {
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const pages = Math.ceil(ALL_ROWS.length / PAGE_SIZE);
    const rows = ALL_ROWS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    return (
      <div className="stl-story-stack">
        <DataGrid {...args} rows={rows} sort={{ key: "id", direction: "asc" }} selected={selected} onSelectedChange={setSelected} />
        <Pagination
          range={`Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + rows.length} of ${ALL_ROWS.length}`}
          page={`Page ${page + 1} of ${pages}`}
          previousDisabled={page === 0}
          nextDisabled={page === pages - 1}
          onPrevious={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
        />
      </div>
    );
  },
};

/** While rows load: placeholder rows under the header, the first with a label, and the grid marked busy. */
export const Loading: Story = {
  args: { rows: [], loading: true },
};

/** No rows match: the empty state takes the place of the rows and offers a way out. */
export const NoResults: Story = {
  name: "No results",
  args: { rows: [], empty: <EmptyState />, emptyLabel: "No results" },
};

/** Loading failed: the critical tone says so with its icon and title, and offers Retry. */
export const LoadError: Story = {
  name: "Load error",
  args: { rows: [], empty: <EmptyState tone="critical" />, emptyLabel: "Couldn't load rows" },
};

/** Loading, then rows, no results, or an error: what a screen sees over time. The buttons stand in for the network. */
export const LoadingThenLoaded: Story = {
  name: "Loading, then loaded",
  parameters: { controls: { disable: true } },
  render: function Loads(args: DataGridProps) {
    const [state, setState] = useState<"loading" | "rows" | "none" | "error">("loading");
    return (
      <div className="stl-story-stack">
        <div className="stl-story-row">
          <Button kind="secondary" label="Load" onClick={() => setState("loading")} />
          <Button kind="secondary" label="Finish with rows" onClick={() => setState("rows")} />
          <Button kind="secondary" label="Finish with no results" onClick={() => setState("none")} />
          <Button kind="secondary" label="Fail" onClick={() => setState("error")} />
        </div>
        <DataGrid
          {...args}
          rows={state === "rows" ? DATA.rows : []}
          loading={state === "loading"}
          empty={<EmptyState tone={state === "error" ? "critical" : "neutral"} onAction={() => setState("loading")} />}
          emptyLabel={state === "error" ? "Couldn't load rows" : "No results"}
        />
      </div>
    );
  },
};
