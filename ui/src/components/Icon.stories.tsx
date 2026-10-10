import type { Meta, StoryObj } from "@storybook/react-vite";
import { ICON_DOC } from "../../../definitions/docRegistry";
import { textClass } from "../tokens";
import { ICON_NAMES, Icon } from "./Icon";
import "../stories/stories.css";

const meta = {
  title: "Components/Icon",
  component: Icon,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "A 16px outline glyph that takes its color from the text around it and its size from the Density icon size.",
          `**Use when** ${ICON_DOC.use}`,
          `**Don't use when** ${ICON_DOC.dont}`,
          "**In code** an icon is hidden from assistive technology unless you give it a `label`.",
        ].join("\n\n"),
      },
    },
  },
  argTypes: { name: { control: "select", options: ICON_NAMES } },
  args: { name: "plus" },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every icon in definitions/icons.ts. */
export const AllIcons: Story = {
  name: "All icons",
  parameters: { controls: { disable: true } },
  render: () => (
    <ul className="stl-icon-gallery">
      {ICON_NAMES.map((name) => (
        <li key={name}>
          <Icon name={name} />
          <span className={textClass("Caption")}>{name}</span>
        </li>
      ))}
    </ul>
  ),
};
