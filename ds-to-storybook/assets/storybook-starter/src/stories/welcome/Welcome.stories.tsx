import type { Meta, StoryObj } from "@storybook/react-vite";

function WelcomePage() {
  return (
    <div className="ds-story-shell">
      <div className="ds-story-stack">
        <header className="ds-story-header">
          <h1>Storybook Starter</h1>
          <p>
            A generic Storybook workspace with Figma export and prototype UI
            flow tooling. Add components, foundations, and product prototypes as
            your design system grows.
          </p>
        </header>

        <section className="ds-story-card">
          <h2>Included tooling</h2>
          <ul>
            <li>Figma export addon with review overlay and Open source</li>
            <li>Prototype inspector for Docs, UI Flow, and Data review</li>
            <li>Token layers under <code>tokens/</code></li>
            <li>Design-system docs scaffold under <code>design-system/</code></li>
          </ul>
        </section>

        <section className="ds-story-card">
          <h2>Next steps</h2>
          <ul>
            <li>Run <code>design-system-extractor</code> to populate tokens and specs</li>
            <li>Run <code>design-system-to-storybook</code> to add components and stories</li>
            <li>Use <code>prototype-storybook-flow</code> to create product prototypes</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

const meta = {
  title: "Welcome/Getting Started",
  component: WelcomePage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof WelcomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
