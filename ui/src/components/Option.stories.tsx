import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { Menu, Option, type OptionProps } from "./Menu";
import "../stories/stories.css";

const NAME = "Input/Option";

const meta = {
  title: "Components/Input/Option",
  component: Option,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `${docs(NAME)}\n\n**In code** Option draws one row of a Menu; Select gives the list its keyboard behavior. Use Select unless you are building another kind of list.`,
      },
    },
  },
  argTypes: { ...argTypes(NAME), selected: { control: "boolean", description: "The selected state.", table: { type: { summary: "boolean" } } } },
  args: defaultArgs(NAME) as unknown as OptionProps,
  // An option is only meaningful inside a menu.
  render: (args) => (
    <Menu aria-label="Options" className="stl-story-menu">
      <Option {...args} />
    </Menu>
  ),
} satisfies Meta<typeof Option>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every State in the definition. Hover and focus are forced here; in use they come from CSS. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <AllVariants<OptionProps>
      component={NAME}
      states={{ selected: { selected: true } }}
      render={(props) => (
        <Menu aria-label="Options" className="stl-story-menu">
          <Option {...props} label="Option" />
        </Menu>
      )}
    />
  ),
};
