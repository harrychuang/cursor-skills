import type { Meta, StoryObj } from "@storybook/react-vite";

import { getComponentStoryParameters } from "../../storybook/componentCatalog";
import { ExampleCard } from "./ExampleCard";

const meta = {
  title: "Components/Examples/Example Card",
  component: ExampleCard,
  tags: ["autodocs"],
  parameters: getComponentStoryParameters("example-card"),
  args: {
    eyebrow: "Starter component",
    title: "Example Card",
    description:
      "A small neutral component that proves tokens, catalog metadata, and Storybook stories are wired together.",
    status: "Ready",
  },
  argTypes: {
    status: {
      control: "select",
      options: ["Ready", "Draft", "Review"],
    },
  },
} satisfies Meta<typeof ExampleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
