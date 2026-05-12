# Storybook 10 Autodocs Reference

Use this reference when setting up or extending Storybook in this workspace.

## Goals

- Use the latest stable Storybook 10
- Enable Autodocs for reusable components
- Include component descriptions in docs output
- Keep stories framework-agnostic where possible
- Define foundations and guides pages before component docs sprawl

## Install or upgrade

For a new Storybook setup:

```bash
npm create storybook@latest
```

For an existing Storybook setup:

```bash
npx storybook@latest upgrade
```

Storybook 10 is ESM-only and requires Node 20.19+ or 22.12+.

## Global Autodocs

Prefer enabling Autodocs globally in `.storybook/preview.ts` or `.storybook/preview.js`:

```ts
import type { Preview } from '@storybook/your-framework'

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    controls: {
      expanded: true
    }
  }
}

export default preview
```

Replace `@storybook/your-framework` with the actual renderer package after the app stack is chosen.

## Story file baseline

Each reusable component should have a story file with:

- `title`
- `component`
- `tags: ['autodocs']` when not already enabled globally
- `argTypes` for the props you expect designers and engineers to inspect in docs
- representative `args`
- multiple meaningful states

Example:

```ts
import type { Meta, StoryObj } from '@storybook/your-framework'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    controls: {
      expanded: true,
      sort: 'requiredFirst'
    },
    docs: {
      description: {
        component: 'Primary action trigger used across forms, dialogs, and marketing CTAs.'
      }
    }
  },
  argTypes: {
    variant: {
      description: 'Visual style mapped to the product hierarchy.',
      control: 'inline-radio',
      options: ['primary', 'secondary'],
      table: {
        type: { summary: "'primary' | 'secondary'" },
        defaultValue: { summary: 'primary' }
      }
    }
  },
  args: {
    variant: 'primary',
    children: 'Continue'
  }
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = {
  args: {
    variant: 'secondary'
  }
}
```

## Component descriptions

Every reusable component should include a docs description. Acceptable sources:

- `parameters.docs.description.component`
- framework-supported code comments when your Storybook renderer surfaces them reliably
- a custom docs page that includes a description block

Prefer `parameters.docs.description.component` because it is explicit and portable.

## Props documentation baseline

For reusable components, do not rely on generated prop tables alone. Add `argTypes` for the props that matter to consumers so the docs explain:

- what the prop changes
- which options are valid
- what the default behavior is
- which props are design-system level versus component-specific

Use `design/foundations/storybook-docs/component-story-template.tsx.txt` as the default starting point.

## What to document

At minimum, reusable component docs should cover:

- purpose
- main variants
- important states
- key token or theming expectations
- accessibility notes when behavior is interactive

## Foundation Guides Before Components

Before component docs multiply, create the foundations docs contract in Storybook:

- document the site map, with `Foundations`, `Styles`, and `Components` as the default navigation
- add a guides page that defines the standard component sections: `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens`
- write foundation pages so they explain when to use a role or token family, not only what values exist

This keeps Autodocs focused on component API and state details instead of forcing every component page to re-explain basic visual logic.

## When to add custom docs pages

Use a custom docs page only when default Autodocs is not enough, for example:

- token-heavy primitives
- layout primitives with usage constraints
- components with non-obvious accessibility contracts

Default Autodocs is still the baseline.

## Validation

Run:

```bash
npm run storybook:check-docs
```

The check expects each reusable component under `src/components` to have:

- a companion story file
- Autodocs enabled globally or locally
- `parameters.docs.description.component`
- `argTypes`
- expanded controls for prop inspection

## Done criteria

- Storybook is on the latest stable 10.x release
- reusable components have stories before screen composition
- reusable component stories generate Autodocs
- reusable component docs include descriptions
- reusable component docs expose important props through `argTypes`
- stories cover representative visual and behavioral states
