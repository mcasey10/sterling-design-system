import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, argTypes, defaultArgs, docs } from "../stories/definitions";
import { SummaryMetric, type SummaryMetricProps } from "./SummaryMetric";
import "../stories/stories.css";

const NAME = "Summary/Summary metric";

const meta = {
  title: "Components/Summary/Summary metric",
  component: SummaryMetric,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: {
    ...argTypes(NAME),
    loading: { control: "boolean", description: "The loading state.", table: { type: { summary: "boolean" } } },
    progress: { control: { type: "range", min: 0, max: 1.2, step: 0.05 } },
  },
  args: { ...(defaultArgs(NAME) as unknown as SummaryMetricProps), value: "1,234", detail: "75% of target", progress: 0.75 },
} satisfies Meta<typeof SummaryMetric>;
export default meta;
type Story = StoryObj<typeof meta>;

/** What each Status shows in these stories: the values the library draws. */
const SAMPLE: Record<string, Partial<SummaryMetricProps>> = {
  normal: { value: "1,234", detail: "75% of target", progress: 0.75 },
  "over-target": { value: "1,380", detail: "Over target by 12%", progress: 1.12 },
};

export const Default: Story = {};

export const OverTarget: Story = {
  name: "Over target",
  args: { status: "over-target", ...SAMPLE["over-target"] },
};

/** Every Status and State in the definition. Loading looks the same for both statuses: the data isn't known yet. */
export const Variants: Story = {
  name: "All variants",
  parameters: { controls: { disable: true } },
  render: () => (
    <AllVariants<SummaryMetricProps>
      component={NAME}
      states={{ loading: { loading: true } }}
      render={(props) => <SummaryMetric {...SAMPLE[props.status ?? "normal"]} {...props} label="Metric" />}
    />
  ),
};

/** A large value in compact notation, with the full value in the detail; a long label truncates, the value never does. */
export const CompactNotation: Story = {
  name: "Compact notation",
  args: { label: "Total outstanding balance across every account", value: "$12.35B", detail: "$12,345,678,901.23", showProgress: false },
};
