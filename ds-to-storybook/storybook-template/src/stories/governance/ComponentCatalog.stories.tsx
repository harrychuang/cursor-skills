import type { Meta, StoryObj } from "@storybook/react-vite";

import { ComponentCatalog } from "./ComponentCatalog";

const meta = {
  title: "Governance/Component Catalog",
  component: ComponentCatalog,
  parameters: {
    docs: {
      description: {
        component:
          "Component Catalog mirrors `src/storybook/componentCatalog.ts` so humans and AI agents can locate components by category, role, purpose, dependencies, and keywords.",
      },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof ComponentCatalog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
