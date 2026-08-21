import type { Meta, StoryObj } from "@storybook/react-vite";

import { ColorGuides } from "./ColorGuides";

const meta = {
  title: "Foundations/Color Guides",
  component: ColorGuides,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ColorGuides>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
