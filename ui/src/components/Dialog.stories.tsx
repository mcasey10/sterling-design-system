import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { argTypes, defaultArgs, docs } from "../stories/definitions";
import { Button } from "./Button";
import { Dialog, type DialogProps } from "./Dialog";
import { TextInput } from "./TextInput";

const NAME = "Overlay/Dialog";

const meta = {
  title: "Components/Overlay/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: {
    // A modal dialog covers its page, so on the Docs page each story gets a frame of its own.
    docs: { description: { component: docs(NAME) }, story: { inline: false, iframeHeight: 360 } },
  },
  argTypes: {
    ...argTypes(NAME),
    children: { control: false },
    primaryKind: { control: "select", options: ["primary", "danger"] },
  },
  args: {
    ...(defaultArgs(NAME) as unknown as DialogProps),
    open: true,
    children: <p>Dialog content</p>,
    onClose: () => {},
    onPrimary: () => {},
  },
  // The story holds the open state, as an application would. Escape, Cancel, and the close button all close it.
  render: function Controlled(args) {
    const [, updateArgs] = useArgs<DialogProps>();
    const close = () => updateArgs({ open: false });
    return (
      <>
        <Button kind="secondary" size="md" label="Open dialog" onClick={() => updateArgs({ open: true })} />
        <Dialog {...args} onClose={close} onPrimary={close} />
      </>
    );
  },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Focus starts on Cancel, stays inside the dialog, and returns to the button that opened it. Escape closes. */
export const Default: Story = {};

/** The title asks the question with the count; the primary button repeats the verb and the count. */
export const DestructiveConfirmation: Story = {
  name: "Destructive confirmation",
  args: {
    title: "Delete 2 items?",
    children: <p>This can't be undone.</p>,
    primaryLabel: "Delete 2 items",
    primaryKind: "danger",
  },
};

/** A field marked data-autofocus takes focus when the dialog opens. */
export const WithAField: Story = {
  name: "With a field",
  args: {
    title: "Rename view",
    showClose: false,
    primaryLabel: "Rename",
    children: <TextInput label="Name" defaultValue="Open items" showHelper={false} data-autofocus />,
  },
};
