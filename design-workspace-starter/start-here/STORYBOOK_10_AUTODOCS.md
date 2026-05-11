# Storybook 10 Autodocs Reference

Use this reference when setting up or extending Storybook in this workspace.

## Goals

- Use the latest stable Storybook 10
- Enable Autodocs for reusable components
- Include component descriptions in docs output
- Keep stories framework-agnostic where possible

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
  tags: ['autodocs']
}

export default preview
```

Replace `@storybook/your-framework` with the actual renderer package after the app stack is chosen.

## Story file baseline

Each reusable component should have a story file with:

- `title`
- `component`
- `tags: ['autodocs']` when not already enabled globally
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
    docs: {
      description: {
        component: 'Primary action trigger used across forms, dialogs, and marketing CTAs.'
      }
    }
  },
  args: {
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

## What to document

At minimum, reusable component docs should cover:

- purpose
- main variants
- important states
- key token or theming expectations
- accessibility notes when behavior is interactive

## When to add custom docs pages

Use a custom docs page only when default Autodocs is not enough, for example:

- token-heavy primitives
- layout primitives with usage constraints
- components with non-obvious accessibility contracts

Default Autodocs is still the baseline.

## Done criteria

- Storybook is on the latest stable 10.x release
- reusable components have stories before screen composition
- reusable component stories generate Autodocs
- reusable component docs include descriptions
- stories cover representative visual and behavioral states
