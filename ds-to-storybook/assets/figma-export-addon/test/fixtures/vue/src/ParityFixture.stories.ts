import { defineComponent, h, ref } from "vue";
import type { Meta, StoryObj } from "@storybook/vue3-vite";

const ParityFixture = defineComponent({
  name: "ParityFixture",
  setup() {
    const state = ref<"B" | "C">("B");
    return () =>
      h(
        "main",
        {
          class: "parity-surface",
          "data-parity-story": "true",
          style: { minHeight: "360px", padding: "32px" },
        },
        [
          h("h1", "Renderer parity fixture"),
          h("p", { "data-parity-state": "true" }, `State ${state.value}`),
          h(
            "button",
            {
              "data-parity-action": "true",
              onClick: () => {
                state.value = "C";
              },
              type: "button",
            },
            "Advance",
          ),
        ],
      );
  },
});

const meta = {
  title: "Parity/Fixture",
  component: ParityFixture,
} satisfies Meta<typeof ParityFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
