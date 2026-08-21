import type { Meta, StoryObj } from "@storybook/react-vite";

import { ShapeGuides } from "./ShapeGuides";

const meta = {
  title: "Foundations/Shape Guide",
  component: ShapeGuides,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ShapeGuides>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
