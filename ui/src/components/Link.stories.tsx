import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { Link, type LinkProps } from "./Link";

const NAME = "Controls/Link";

const meta = {
  title: "Components/Controls/Link",
  component: Link,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: argTypes(NAME),
  args: { ...(defaultArgs(NAME) as unknown as LinkProps), href: "#" },
} satisfies Meta<typeof Link>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every Size and State in the definition. Hover and focus are forced here; in use they come from CSS. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => <AllVariants<LinkProps> component={NAME} render={(props) => <Link {...props} label="Link" href="#" />} />,
};
