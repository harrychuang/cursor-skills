import type { Meta, StoryObj } from "@storybook/react-vite";

import "./TemplateFoundation.css";

function TemplateFoundation() {
  const swatches = [
    {
      label: "Primary",
      token: "--sbt-sys-color-primary",
    },
    {
      label: "Surface",
      token: "--sbt-sys-color-surface",
    },
    {
      label: "Outline",
      token: "--sbt-sys-color-outline",
    },
  ];

  return (
    <section className="sbt-foundation">
      <header className="sbt-foundation__header">
        <p>Foundation</p>
        <h2>Template Tokens</h2>
      </header>
      <div className="sbt-foundation__grid">
        {swatches.map((swatch) => (
          <article className="sbt-foundation__swatch" key={swatch.token}>
            <span
              className="sbt-foundation__color"
              style={{ background: `var(${swatch.token})` }}
            />
            <div>
              <strong>{swatch.label}</strong>
              <code>{swatch.token}</code>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const meta = {
  title: "Foundations/Template Tokens",
  component: TemplateFoundation,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TemplateFoundation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
