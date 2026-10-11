import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { Menu, OptionWithDescription, type OptionWithDescriptionProps } from "./Menu";
import "../stories/stories.css";

const NAME = "Input/Option with description";

const meta = {
  title: "Components/Input/Option with description",
  component: OptionWithDescription,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: { ...argTypes(NAME), selected: { control: "boolean", description: "The selected state.", table: { type: { summary: "boolean" } } } },
  args: defaultArgs(NAME) as unknown as OptionWithDescriptionProps,
  // An option is only meaningful inside a menu.
  render: (args) => (
    <Menu aria-label="Options" className="stl-story-menu stl-story-menu--wide">
      <OptionWithDescription {...args} />
    </Menu>
  ),
} satisfies Meta<typeof OptionWithDescription>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every State in the definition. Hover is forced here; in use it comes from CSS. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <AllVariants<OptionWithDescriptionProps>
      component={NAME}
      states={{ selected: { selected: true } }}
      render={(props) => (
        <Menu aria-label="Options" className="stl-story-menu stl-story-menu--wide">
          <OptionWithDescription {...props} label="Option" description="Description" />
        </Menu>
      )}
    />
  ),
};
