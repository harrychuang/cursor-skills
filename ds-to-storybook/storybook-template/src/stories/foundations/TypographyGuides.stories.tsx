import type { Meta, StoryObj } from "@storybook/react-vite";

import { TypographyGuides } from "./TypographyGuides";

const meta = {
  title: "Foundations/Typography Guide",
  component: TypographyGuides,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TypographyGuides>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
