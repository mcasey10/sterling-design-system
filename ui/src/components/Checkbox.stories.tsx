import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { Checkbox, type CheckboxProps } from "./Checkbox";

const NAME = "Controls/Checkbox";

const meta = {
  title: "Components/Controls/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: argTypes(NAME),
  args: defaultArgs(NAME) as unknown as CheckboxProps,
  // Clicking the checkbox updates the Checked control, as an application would update its state.
  render: function Controlled(args) {
    const [, updateArgs] = useArgs<CheckboxProps>();
    return <Checkbox {...args} onCheckedChange={(checked) => updateArgs({ checked })} />;
  },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  name: "With label",
  args: { showLabel: true, label: "Include closed items" },
};

/** Every Checked value and State in the definition. Hover and focus are forced here; in use they come from CSS. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <AllVariants<CheckboxProps> component={NAME} render={(props) => <Checkbox {...props} label="Select row" onChange={() => {}} />} />
  ),
};
