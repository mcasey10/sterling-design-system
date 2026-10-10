import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { Select, type SelectProps } from "./Select";

const NAME = "Input/Select";

const OPTIONS = [
  { value: "one", label: "Option one" },
  { value: "two", label: "Option two" },
  { value: "three", label: "Option three" },
  { value: "four", label: "Option four" },
  { value: "five", label: "Option five", disabled: true },
];

const meta = {
  title: "Components/Input/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: {
    ...argTypes(NAME),
    value: { control: "select", options: [null, ...OPTIONS.map((option) => option.value)] },
    validation: { control: "select", options: [undefined, "error", "warning"], table: { type: { summary: '"error" | "warning"' } } },
    open: { control: false },
  },
  args: { ...(defaultArgs(NAME) as unknown as SelectProps), options: OPTIONS, value: "two" },
  // Choosing an option updates the Value control, as an application would update its state.
  render: function Controlled(args) {
    const [, updateArgs] = useArgs<SelectProps>();
    return <Select {...args} onValueChange={(value) => updateArgs({ value })} />;
  },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Enter, Space, or the arrow keys open the menu; the arrow keys, Home, End, and typing a letter move through
 * it; Enter or Space chooses; Escape or Tab closes. The disabled option is skipped.
 */
export const Default: Story = {};

export const Placeholder: Story = {
  args: { value: null },
};

export const Error: Story = {
  args: { validation: "error", value: null, helper: "Choose an option" },
};

export const Warning: Story = {
  args: { validation: "warning", helper: "This option is rarely used" },
};

/**
 * Every State in the definition, with a value and with the placeholder. Hover and focus are forced here; in
 * use they come from CSS. Open is the `open` prop, and error and warning are the validation prop.
 */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <AllVariants<SelectProps & { content: string }>
      component={NAME}
      className="stl-variants--menus"
      states={{ open: { open: true }, error: { validation: "error" }, warning: { validation: "warning" } }}
      render={({ content, ...props }) => (
        <Select
          {...props}
          label="Label"
          helper="Helper text"
          placeholder="Select an option"
          options={OPTIONS}
          value={content === "value" ? "two" : null}
        />
      )}
    />
  ),
};
