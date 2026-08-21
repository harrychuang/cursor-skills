import type { Meta, StoryObj } from "@storybook/react-vite";

import { ShadowGuides } from "./ShadowGuides";

const meta = {
  title: "Foundations/Shadow Guide",
  component: ShadowGuides,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ShadowGuides>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
