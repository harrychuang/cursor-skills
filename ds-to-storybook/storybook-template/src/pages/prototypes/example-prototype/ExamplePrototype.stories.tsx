import type { Meta, StoryObj } from "@storybook/react-vite";

import { ExamplePrototype } from ".";
import { examplePrototypeMeta } from "./examplePrototypeMeta";

function getFlowPreviewFromLocation() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    new URLSearchParams(window.location.search).get("prototypeFlowPreview") ===
    "true"
  );
}

const meta = {
  title: "Pages/Prototypes/Example Prototype",
  component: ExamplePrototype,
  parameters: {
    layout: "fullscreen",
    prototype: examplePrototypeMeta,
  },
  args: {
    initialRouteId: "intake",
    isFlowPreview: false,
  },
  render: (args) => {
    const isFlowPreview = args.isFlowPreview || getFlowPreviewFromLocation();

    return <ExamplePrototype {...args} isFlowPreview={isFlowPreview} />;
  },
} satisfies Meta<typeof ExamplePrototype>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
