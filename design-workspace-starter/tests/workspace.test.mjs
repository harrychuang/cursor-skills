import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildScreenManifest,
  buildTasksMarkdown,
  getFigmaAuthMode,
  getRequiredSkillPaths,
  isFigmaAutomationReady,
  parseFigmaUrl
} from '../scripts/lib/workspace.js'

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
