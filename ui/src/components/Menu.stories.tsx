import type { Meta, StoryObj } from "@storybook/react-vite";
import { docs } from "../stories/definitions";
import { Menu, MenuGroup, Option, OptionWithDescription } from "./Menu";
import "../stories/stories.css";

const NAME = "Input/Menu";

const meta = {
  title: "Components/Input/Menu",
  component: Menu,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `${docs(NAME)}\n\n**In code** Menu is the raised panel and takes Options as children; give it an accessible name. It draws the list only: Select gives a list its keyboard behavior, so use Select unless you are building another kind of list.`,
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof Menu>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Input/Menu as the library draws it: five options, one selected, one disabled. */
export const Default: Story = {
  render: () => (
    <Menu aria-label="Options" className="stl-story-menu">
      <Option label="Option one" />
      <Option label="Option two" selected />
      <Option label="Option three" />
      <Option label="Option four" />
      <Option label="Option five" disabled />
    </Menu>
  ),
};

/** Two groups, each named by its heading, with a description under each option. */
export const Grouped: Story = {
  render: () => (
    <Menu aria-label="Views" className="stl-story-menu stl-story-menu--wide">
      <MenuGroup label="Predefined">
        <OptionWithDescription label="All items" description="No filters" />
        <OptionWithDescription label="Open items" description="Status is Open" selected />
      </MenuGroup>
      <MenuGroup label="Saved by me">
        <OptionWithDescription label="Team A, large" description="Owner is Team A · Amount > 1,000" />
      </MenuGroup>
    </Menu>
  ),
};
