import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, argTypes, defaultArgs, docs } from "../stories/definitions";
import { SideChip, type SideChipProps } from "./Chips";
import "../stories/stories.css";

const NAME = "Chip/Side";

const meta = {
  title: "Components/Chip/Side",
  component: SideChip,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: { ...argTypes(NAME), label: { control: "text" } },
  args: defaultArgs(NAME) as unknown as SideChipProps,
} satisfies Meta<typeof SideChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every Side in the definition. The label says which; the color only supports it. */
export const Variants: Story = {
  name: "All variants",
  parameters: { controls: { disable: true } },
  render: () => <AllVariants<SideChipProps> component={NAME} render={(props) => <SideChip {...props} />} />,
};

/** In a tight column, one letter each. */
export const ShortLabels: Story = {
  name: "Short labels",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="stl-story-row">
      <SideChip side="buy" label="B" />
      <SideChip side="sell" label="S" />
    </div>
  ),
};
