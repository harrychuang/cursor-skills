import type { Meta, StoryObj } from "@storybook/react-vite";

import { OpacityGuides } from "./OpacityGuides";

const meta = {
  title: "Foundations/Opacity Guide",
  component: OpacityGuides,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof OpacityGuides>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
