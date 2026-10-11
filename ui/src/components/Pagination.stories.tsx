import type { Meta, StoryObj } from "@storybook/react-vite";
import { argTypes, defaultArgs, docs } from "../stories/definitions";
import { Pagination, type PaginationProps } from "./GridStates";

const NAME = "Grid/Pagination";

const meta = {
  title: "Components/Grid/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `${docs(NAME)}\n\n**In code** Previous and Next are props (\`previousDisabled\`, \`nextDisabled\`, \`onPrevious\`, \`onNext\`), the range is announced to screen readers when it changes, and focus moves to the other button when the one in use becomes disabled. See Data grid › With pagination for it in use.`,
      },
    },
  },
  argTypes: { ...argTypes(NAME), previousDisabled: { control: "boolean" }, nextDisabled: { control: "boolean" } },
  args: { ...(defaultArgs(NAME) as unknown as PaginationProps), previousDisabled: true },
} satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The first page, as the library draws it: Previous is disabled. */
export const Default: Story = {};

export const MiddlePage: Story = {
  name: "A middle page",
  args: { range: "Showing 6–10 of 120", page: "Page 2 of 24", previousDisabled: false },
};

export const LastPage: Story = {
  name: "The last page",
  args: { range: "Showing 116–120 of 120", page: "Page 24 of 24", previousDisabled: false, nextDisabled: true },
};
