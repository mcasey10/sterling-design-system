import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { FilterChip, type FilterChipProps } from "./Chips";
import "../stories/stories.css";

const NAME = "Chip/Filter";

const meta = {
  title: "Components/Chip/Filter",
  component: FilterChip,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: `${docs(NAME)}\n\nWith Show remove on, the whole chip is the button that removes the filter, and its accessible name says so ("Remove filter: Status is Open").` } } },
  argTypes: { ...argTypes(NAME), type: { control: false } },
  args: defaultArgs(NAME) as unknown as FilterChipProps,
} satisfies Meta<typeof FilterChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every State in the definition. Hover, pressed, and focus are forced here; in use they come from CSS. */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => <AllVariants<FilterChipProps> component={NAME} render={(props) => <FilterChip {...props} label="Filter: Value" />} />,
};

/** A filter that can't be removed is text, not a button; a label longer than 240px truncates. */
export const NotRemovableAndLong: Story = {
  name: "Not removable, long label",
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="stl-story-row">
      <FilterChip label="Status is Open" showRemove={false} />
      <FilterChip label="Name contains a long phrase that does not fit in the chip at all" />
    </div>
  ),
};
