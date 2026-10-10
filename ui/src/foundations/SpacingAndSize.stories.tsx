import type { Meta, StoryObj } from "@storybook/react-vite";
import { SpacingAndSizePage } from "./Foundations";

const meta = {
  title: "Foundations/Spacing and size",
  component: SpacingAndSizePage,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof SpacingAndSizePage>;
export default meta;

export const SpacingAndSize: StoryObj<typeof meta> = { name: "Spacing and size" };
