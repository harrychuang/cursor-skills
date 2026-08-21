import type { Meta, StoryObj } from "@storybook/react-vite";

import { GovernanceOverview } from "./GovernanceOverview";

const meta = {
  title: "Governance/Storybook Architecture",
  component: GovernanceOverview,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof GovernanceOverview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
