import type { Meta, StoryObj } from "@storybook/react-vite";

import { SizeGuides } from "./SizeGuides";

const meta = {
  title: "Foundations/Size Guide",
  component: SizeGuides,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SizeGuides>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
