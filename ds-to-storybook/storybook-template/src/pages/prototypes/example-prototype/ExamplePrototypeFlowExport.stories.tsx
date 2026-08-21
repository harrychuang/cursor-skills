import type { Meta, StoryObj } from "@storybook/react-vite";

import { ExamplePrototypeFlowExport } from "./ExamplePrototypeFlowExport";
import { examplePrototypeMeta } from "./examplePrototypeMeta";

const meta = {
  title: "Pages/Prototypes/Example Prototype",
  component: ExamplePrototypeFlowExport,
  parameters: {
    layout: "fullscreen",
    prototype: examplePrototypeMeta,
  },
} satisfies Meta<typeof ExamplePrototypeFlowExport>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StaticFlow: Story = {};
