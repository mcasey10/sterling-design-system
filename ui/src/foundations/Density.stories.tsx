import type { Meta, StoryObj } from "@storybook/react-vite";
import { DensityPage } from "./Foundations";

const meta = {
  title: "Foundations/Density",
  component: DensityPage,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof DensityPage>;
export default meta;

export const Density: StoryObj<typeof meta> = { name: "Density" };
