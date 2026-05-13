import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildScreenManifest,
  buildTasksMarkdown,
  getFoundationGuideEntries,
  getRequiredFoundationPaths,
  getFigmaAuthMode,
  getRequiredSkillPaths,
  isFigmaAutomationReady,
  parseFigmaUrl
} from '../scripts/lib/workspace.js'
import {
  previewHasExpandedControls,
  previewHasGlobalAutodocs,
  storyHasArgTypes,
  storyHasComponentDescription,
  storyHasExpandedControls,
  storyHasLocalAutodocs
} from '../scripts/lib/storybook.js'

test('parseFigmaUrl normalizes node id', () => {
  const parsed = parseFigmaUrl('https://www.figma.com/design/ABC123/MyFile?node-id=10-42')
  assert.equal(parsed.fileKey, 'ABC123')
  assert.equal(parsed.nodeId, '10:42')
})

test('buildScreenManifest creates stable routes', () => {
  const manifest = buildScreenManifest(
    { projectName: 'Trading Desk' },
    ['home.png', 'markets.png'],
    true
  )

  assert.equal(manifest.status, 'ready')
  assert.equal(manifest.sourceModes.includes('figma'), true)
  assert.equal(manifest.screens[0].route, '/')
  assert.equal(manifest.screens[1].route, '/screen-2')
  assert.equal(manifest.screens[0].component, 'TradingDeskHomeScreen')
})

test('buildTasksMarkdown includes figma tasks when configured', () => {
  const tasks = buildTasksMarkdown({
    screens: [{ route: '/', reference: 'reference/home.png', component: 'HomeScreen' }]
  }, true, true)

  assert.match(tasks, /skills\/figma-m3-variables\/SKILL\.md/)
  assert.match(tasks, /Storybook 10/)
  assert.match(tasks, /Ref -> Sys -> Comp/)
  assert.match(tasks, /ACCURACY_CONTRACT\.md/)
  assert.match(tasks, /single-image/)
  assert.match(tasks, /5-10 minute read/)
  assert.match(tasks, /Build `\/` from `reference\/home\.png` as `HomeScreen`/)
})

test('buildTasksMarkdown asks for figma pat or connector auth when figma is only partially configured', () => {
  const tasks = buildTasksMarkdown({
    screens: [{ route: '/', reference: 'reference/home.png', component: 'HomeScreen' }]
  }, true, false)

  assert.match(tasks, /Add `FIGMA_PAT` to `.env.local`, or set `FIGMA_AUTH_MODE=connector`/)
  assert.match(tasks, /Run `npm run workspace:check` to confirm Figma automation readiness/)
  assert.doesNotMatch(tasks, /skills\/figma-m3-variables\/SKILL\.md/)
})

test('figma automation is ready with connector auth mode', () => {
  assert.equal(getFigmaAuthMode({ FIGMA_AUTH_MODE: 'connector' }), 'connector')
  assert.equal(isFigmaAutomationReady({
    FIGMA_FILE_URL: 'https://www.figma.com/design/ABC123/MyFile?node-id=10-42',
    FIGMA_NODE_ID: '10:42',
    FIGMA_AUTH_MODE: 'connector'
  }), true)
})

test('getRequiredSkillPaths includes local and managed skills', () => {
  const skillPaths = getRequiredSkillPaths({
    managedSkills: [
      { name: 'design-system-governance' },
      { name: 'figma-m3-variables' },
      { name: 'ui-visual-parity' }
    ]
  })

  assert.deepEqual(skillPaths, [
    'skills/ui-screenshot-to-storybook-product/SKILL.md',
    'skills/design-system-governance/SKILL.md',
    'skills/figma-m3-variables/SKILL.md',
    'skills/ui-visual-parity/SKILL.md'
  ])
})

test('foundation paths include storybook docs templates', () => {
  const paths = getRequiredFoundationPaths()

  assert.equal(paths.includes('design/foundations/storybook-docs/overview.mdx'), true)
  assert.equal(paths.includes('design/foundations/storybook-docs/guides.mdx'), true)
  assert.equal(paths.includes('design/foundations/storybook-docs/component-story-template.tsx.txt'), true)
})

test('foundation entries include storybook docs templates', () => {
  const entries = getFoundationGuideEntries({ projectName: 'Workspace' })
  const templateEntry = entries.find(entry => entry.relativePath === 'design/foundations/storybook-docs/component-story-template.tsx.txt')
  const guidesEntry = entries.find(entry => entry.relativePath === 'design/foundations/storybook-docs/guides.mdx')
  const overviewEntry = entries.find(entry => entry.relativePath === 'design/foundations/storybook-docs/overview.mdx')
  const colorEntry = entries.find(entry => entry.relativePath === 'design/foundations/color.md')

  assert.ok(templateEntry)
  assert.ok(guidesEntry)
  assert.ok(overviewEntry)
  assert.ok(colorEntry)
  assert.match(guidesEntry.content, /Foundations`, `Styles`, and `Components`/)
  assert.match(guidesEntry.content, /Minimum Viable Foundation Page/)
  assert.match(guidesEntry.content, /Autodocs belongs to reusable components/)
  assert.match(overviewEntry.content, /Do Not Over-Document/)
  assert.match(overviewEntry.content, /editorial MDX pages/)
  assert.match(colorEntry.content, /## Minimum Deliverable/)
  assert.match(templateEntry.content, /tags: \['autodocs'\]/)
  assert.match(templateEntry.content, /argTypes:/)
  assert.match(templateEntry.content, /expanded: true/)
  assert.match(templateEntry.content, /state or accessibility caveats/)
})

test('storybook helper regexes detect autodocs and props docs settings', () => {
  const previewText = `
    const preview = {
      tags: ['autodocs'],
      parameters: {
        controls: {
          expanded: true
        }
      }
    }
  `
  const storyText = `
    const meta = {
      component: Button,
      tags: ['autodocs'],
      parameters: {
        controls: {
          expanded: true
        },
        docs: {
          description: {
            component: 'Button docs'
          }
        }
      },
      argTypes: {
        variant: {
          control: 'inline-radio'
        }
      }
    }
  `

  assert.equal(previewHasGlobalAutodocs(previewText), true)
  assert.equal(previewHasExpandedControls(previewText), true)
  assert.equal(storyHasLocalAutodocs(storyText), true)
  assert.equal(storyHasComponentDescription(storyText), true)
  assert.equal(storyHasArgTypes(storyText), true)
  assert.equal(storyHasExpandedControls(storyText), true)
})
