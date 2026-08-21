import type { Meta, StoryObj } from "@storybook/react-vite";

import { SpacingGuides } from "./SpacingGuides";

const meta = {
  title: "Foundations/Spacing Guide",
  component: SpacingGuides,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SpacingGuides>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
