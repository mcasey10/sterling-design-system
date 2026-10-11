import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, argTypes, defaultArgs, docs } from "../stories/definitions";
import { EmptyState, type EmptyStateProps } from "./GridStates";
import "../stories/stories.css";

const NAME = "Grid/Empty state";

const meta = {
  title: "Components/Grid/Empty state",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `${docs(NAME)}\n\n**In code** the title, message, and action label are props, with the library\u2019s copy as defaults for each tone. See Data grid › No results and Load error for it in a grid.`,
      },
    },
  },
  argTypes: { ...argTypes(NAME), title: { control: "text" }, message: { control: "text" }, actionLabel: { control: "text" } },
  args: defaultArgs(NAME) as unknown as EmptyStateProps,
  // As wide as the generic grid, which is where the library draws it.
  render: (args) => (
    <div className="stl-story-empty">
      <EmptyState {...args} />
    </div>
  ),
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every Tone in the definition: neutral for no results, critical for a load error. */
export const Variants: Story = {
  name: "All variants",
  parameters: { controls: { disable: true } },
  render: () => (
    <AllVariants<EmptyStateProps>
      component={NAME}
      render={(props) => (
        <div className="stl-story-empty">
          <EmptyState {...props} />
        </div>
      )}
    />
  ),
};

/** Without an action, when there is nothing the person can do from here. */
export const NoAction: Story = {
  name: "No action",
  args: { showAction: false, title: "Nothing here yet", message: "Items appear here once they are created." },
};
