import { createElement, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

function ParityFixture() {
  const [state, setState] = useState<"B" | "C">("B");
  return createElement(
    "main",
    {
      className: "parity-surface",
      "data-parity-story": "true",
      style: { minHeight: 360, padding: 32 },
    },
    createElement("h1", null, "Renderer parity fixture"),
    createElement("p", { "data-parity-state": "true" }, `State ${state}`),
    createElement(
      "button",
      {
        "data-parity-action": "true",
        onClick: () => setState("C"),
        type: "button",
      },
      "Advance",
    ),
  );
}

const meta = {
  title: "Parity/Fixture",
  component: ParityFixture,
} satisfies Meta<typeof ParityFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
