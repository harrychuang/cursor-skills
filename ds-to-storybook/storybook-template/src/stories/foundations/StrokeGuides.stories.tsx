import type { Meta, StoryObj } from "@storybook/react-vite";

import { StrokeGuides } from "./StrokeGuides";

const meta = {
  title: "Foundations/Border Guide",
  component: StrokeGuides,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof StrokeGuides>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
