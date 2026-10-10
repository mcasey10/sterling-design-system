import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { Button, type ButtonProps } from "./Button";

const NAME = "Controls/Button";

const meta = {
  title: "Components/Controls/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: { ...argTypes(NAME), type: { control: false } },
  args: defaultArgs(NAME) as unknown as ButtonProps,
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIcon: Story = {
  name: "With icon",
  args: { showIcon: true, label: "Add item" },
};

/** Every Kind, Size, and State in the definition. Hover, pressed, and focus are forced here; in use they come from CSS. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => <AllVariants<ButtonProps> component={NAME} render={(props) => <Button {...props} label="Button" />} />,
};
