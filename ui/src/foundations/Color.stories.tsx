import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorPage } from "./Foundations";

const meta = {
  title: "Foundations/Color",
  component: ColorPage,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof ColorPage>;
export default meta;

export const Color: StoryObj<typeof meta> = { name: "Color" };
