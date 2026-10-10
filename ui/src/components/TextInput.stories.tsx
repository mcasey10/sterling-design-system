import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { AllVariants, FORCED_STATES, argTypes, defaultArgs, docs } from "../stories/definitions";
import { TextInput, type TextInputProps } from "./TextInput";

const NAME = "Input/Text";

const meta = {
  title: "Components/Input/Text",
  component: TextInput,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs(NAME) } } },
  argTypes: {
    ...argTypes(NAME),
    validation: { control: "select", options: [undefined, "error", "warning"], table: { type: { summary: '"error" | "warning"' } } },
  },
  args: defaultArgs(NAME) as unknown as TextInputProps,
  // Typing in the field updates the Value control, as an application would update its state.
  render: function Controlled(args) {
    const [, updateArgs] = useArgs<TextInputProps>();
    return <TextInput {...args} onChange={(event) => updateArgs({ value: event.target.value })} />;
  },
} satisfies Meta<typeof TextInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Error: Story = {
  args: { validation: "error", value: "12.5x", helper: "Enter a number, for example 12.5" },
};

export const Warning: Story = {
  args: { validation: "warning", value: "97.5", helper: "Above the usual range" },
};

/**
 * Every State in the definition, with a value and with the placeholder. Hover and focus are forced here; in
 * use they come from CSS. Error and warning are the validation prop.
 */
export const Variants: Story = {
  name: "All variants",
  parameters: { pseudo: FORCED_STATES, controls: { disable: true } },
  render: () => (
    <AllVariants<TextInputProps & { content: string }>
      component={NAME}
      states={{ error: { validation: "error" }, warning: { validation: "warning" } }}
      render={({ content, ...props }) => (
        <TextInput
          {...props}
          label="Label"
          helper="Helper text"
          placeholder="Enter a value"
          value={content === "value" ? "Value" : ""}
          onChange={() => {}}
        />
      )}
    />
  ),
};
