import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, argTypes, defaultArgs, docs } from "../stories/definitions";
import { StatusChip, type StatusChipProps } from "./StatusChip";
import "../stories/stories.css";

const NAME = "Chip/Status";

const meta = {
  title: "Components/Chip/Status",
  component: StatusChip,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: argTypes(NAME),
  args: defaultArgs(NAME) as unknown as StatusChipProps,
} satisfies Meta<typeof StatusChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every Tone in the definition, each with its own icon. */
export const Variants: Story = {
  name: "All variants",
  parameters: { controls: { disable: true } },
  render: () => <AllVariants<StatusChipProps> component={NAME} render={(props) => <StatusChip {...props} label="Status" />} />,
};

/** A label longer than 160px truncates with an ellipsis; without the icon, the label alone carries the status. */
export const LongLabelAndNoIcon: Story = {
  name: "Long label, no icon",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="stl-story-row">
      <StatusChip tone="warning" label="Awaiting a second review before it can be released" />
      <StatusChip tone="info" label="Signed off" showIcon={false} />
    </div>
  ),
};
