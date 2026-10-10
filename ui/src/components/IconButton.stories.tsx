import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { IconButton, type IconButtonProps } from "./IconButton";

const NAME = "Controls/Icon button";

const meta = {
  title: "Components/Controls/Icon button",
  component: IconButton,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: { ...argTypes(NAME), type: { control: false } },
  args: defaultArgs(NAME) as unknown as IconButtonProps,
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every Kind, Size, and State in the definition. Hover, pressed, and focus are forced here; in use they come from CSS. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => <AllVariants<IconButtonProps> component={NAME} render={(props) => <IconButton {...props} label="Action" />} />,
};
