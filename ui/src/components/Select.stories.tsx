import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { Menu, Option } from "./Menu";
import { Select, SelectField, type SelectProps } from "./Select";

const NAME = "Input/Select";

// First letters differ, so typing a letter jumps to one option.
const OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "never", label: "Never", disabled: true },
];

// The options Input/Menu shows in the Figma library, for "All variants".
const LIBRARY_OPTIONS = [
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
  args: { ...(defaultArgs(NAME) as unknown as SelectProps), options: OPTIONS, value: "weekly" },
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
 * use they come from CSS. Error and warning are the validation prop. The open column is a picture, drawn
 * with SelectField, Menu, and Option: a live select is modal while open, so only one can be open at a time.
 */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <AllVariants<SelectProps & { content: string }>
      component={NAME}
      className="stl-variants--menus"
      states={{ open: { open: true }, error: { validation: "error" }, warning: { validation: "warning" } }}
      render={({ content, open, ...props }) =>
        open ? (
          <SelectField
            label="Label"
            placeholder="Select an option"
            valueText={content === "value" ? "Option two" : undefined}
            open
            triggerProps={{ "aria-haspopup": "listbox" }}
          >
            <Menu aria-label="Label">
              {LIBRARY_OPTIONS.map((option) => (
                <Option key={option.value} label={option.label} selected={option.value === "two"} disabled={option.disabled} />
              ))}
            </Menu>
          </SelectField>
        ) : (
          <Select
            {...props}
            label="Label"
            helper="Helper text"
            placeholder="Select an option"
            options={LIBRARY_OPTIONS}
            value={content === "value" ? "two" : null}
          />
        )
      }
    />
  ),
};
