import type { Meta, StoryObj } from "@storybook/react-vite";
import { argTypes, defaultArgs, docs } from "../stories/definitions";
import { Menu, MenuGroup, MenuHeading, type MenuHeadingProps, OptionWithDescription } from "./Menu";
import "../stories/stories.css";

const NAME = "Input/Menu heading";

const meta = {
  title: "Components/Input/Menu heading",
  component: MenuHeading,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: `${docs(NAME)}\n\n**In code** use MenuGroup, which puts a heading above its options and names the group for screen readers.` } } },
  argTypes: argTypes(NAME),
  args: defaultArgs(NAME) as unknown as MenuHeadingProps,
  // As wide as the library draws it.
  render: (args) => (
    <div className="stl-story-menu stl-story-menu--wide">
      <MenuHeading {...args} />
    </div>
  ),
} satisfies Meta<typeof MenuHeading>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A menu with two groups, each named by its heading: predefined views and the person's saved views. */
export const GroupedMenu: Story = {
  name: "In a grouped menu",
  parameters: { controls: { disable: true } },
  render: () => (
    <Menu aria-label="Views" className="stl-story-menu stl-story-menu--wide">
      <MenuGroup label="Predefined">
        <OptionWithDescription label="All items" description="No filters" />
        <OptionWithDescription label="Open items" description="Status is Open" selected />
      </MenuGroup>
      <MenuGroup label="Saved by me">
        <OptionWithDescription label="Team A, large" description="Owner is Team A · Amount > 1,000" />
        <OptionWithDescription label="Archived last year" description="Status is Archived · Updated in 2025" disabled />
      </MenuGroup>
    </Menu>
  ),
};
