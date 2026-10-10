import type { Meta, StoryObj } from "@storybook/react-vite";
import { TypographyPage } from "./Foundations";

const meta = {
  title: "Foundations/Typography",
  component: TypographyPage,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof TypographyPage>;
export default meta;

export const Typography: StoryObj<typeof meta> = { name: "Typography" };
