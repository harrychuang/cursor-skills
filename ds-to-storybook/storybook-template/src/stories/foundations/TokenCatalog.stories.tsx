import type { Meta, StoryObj } from "@storybook/react-vite";

import { TokenCatalog } from "./TokenCatalog";

const meta = {
  title: "Foundations/Token Catalog",
  component: TokenCatalog,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TokenCatalog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const All: Story = {
  args: {
    initialLayer: "all",
    initialFamily: "all",
  },
};

export const ReferenceTokens: Story = {
  args: {
    initialLayer: "ref",
    initialFamily: "all",
  },
};

export const SystemTokens: Story = {
  args: {
    initialLayer: "sys",
    initialFamily: "all",
  },
};

export const ComponentTokens: Story = {
  args: {
    initialLayer: "comp",
    initialFamily: "all",
  },
};
