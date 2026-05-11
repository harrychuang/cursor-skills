import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'])

export async function loadWorkspaceConfig(rootDir) {
  const file = path.join(rootDir, 'workspace.config.json')
  return JSON.parse(await readFile(file, 'utf8'))
}

export function getManagedSkills(config) {
  return Array.isArray(config.managedSkills) ? config.managedSkills : []
}

export function getRequiredSkillPaths(config) {
  const localSkills = ['ui-screenshot-to-storybook-product']
  const managedSkills = getManagedSkills(config).map(skill => skill.name)
  return [...localSkills, ...managedSkills].map(name => path.join('skills', name, 'SKILL.md'))
}

export function toPascalCase(input) {
  return String(input)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('')
}

export async function scanReferenceScreens(rootDir) {
  const referenceDir = path.join(rootDir, 'reference')
  const entries = await readdir(referenceDir, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
}

export function parseEnvText(text) {
  const env = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return env
}

export function parseFigmaUrl(input) {
  const url = new URL(input)
  if (url.hostname !== 'www.figma.com') {
    throw new Error('Only https://www.figma.com/design/... URLs are supported')
  }
  if (!url.pathname.startsWith('/design/')) {
    throw new Error('Only /design/ URLs are supported')
  }
  if (url.pathname.includes('/branch/')) {
    throw new Error('Branch URLs are not supported')
  }
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) {
    throw new Error('Missing Figma file key')
  }
  const fileKey = parts[1]
  const nodeIdRaw = url.searchParams.get('node-id')
  if (!nodeIdRaw) {
    throw new Error('Missing node-id query parameter')
  }
  return {
    fileKey,
    nodeId: nodeIdRaw.replace(/-/g, ':')
  }
}

export function buildScreenManifest(config, screenNames, figmaConfigured) {
  const projectName = config.projectName || 'Design Workspace Starter'
  const componentPrefix = toPascalCase(projectName) || 'Workspace'
  const screens = screenNames.map((name, index) => ({
    id: `screen-${index + 1}`,
    name,
    reference: `reference/${name}`,
    route: index === 0 ? '/' : `/screen-${index + 1}`,
    component: index === 0 ? `${componentPrefix}HomeScreen` : `${componentPrefix}Screen${index + 1}`
  }))
  return {
    schemaVersion: 1,
    status: screens.length > 0 || figmaConfigured ? 'ready' : 'needs-input',
    projectName,
    sourceModes: figmaConfigured ? ['reference', 'figma'] : ['reference'],
    screens
  }
}

export function buildTasksMarkdown(screenManifest, figmaConfigured) {
  const screenTasks = screenManifest.screens.length > 0
    ? screenManifest.screens.map(screen => `- [ ] Build \`${screen.route}\` from \`${screen.reference}\` as \`${screen.component}\``)
    : ['- [ ] Add one or more screenshots to `reference/` before screen implementation']

  const figmaLines = figmaConfigured
    ? [
      '- [ ] Run `skills/figma-m3-variables/SKILL.md` as Phase 0 before Phase A',
      '- [ ] Create or audit Figma variables in Ref -> Sys -> Comp order',
      '- [ ] Bind the agreed Figma variables to the key source components before code work',
      '- [ ] Use Figma as the source of truth during compare/parity work'
    ]
    : ['- [ ] Configure `.env.local` if you want Figma-first workflows and Phase 0 token binding']

  return [
    '# Tasks',
    '',
    '- [ ] Update `product/PRD.md` with the real product requirements',
    '- [ ] Run `npm run workspace:init` to install managed skills before agent work',
    '- [ ] Run `npm run workspace:sync` after changing input sources',
    ...figmaLines,
    '- [ ] Run Phase A visual inventory after Phase 0 is complete',
    '- [ ] Run Phase B component reuse gate',
    '- [ ] Build or extend Storybook components',
    '- [ ] Compose product screens',
    '- [ ] Run visual parity',
    '- [ ] Replace placeholder tokens and manifests',
    '',
    '## Screen Tasks',
    '',
    ...screenTasks
  ].join('\n')
}

export function buildReferenceInventoryMarkdown(screenNames) {
  return [
    '# Reference Inventory',
    '',
    screenNames.length === 0
      ? 'No screenshots found. Add images under `reference/` and run `npm run workspace:sync`.'
      : `Detected ${screenNames.length} screenshot(s):`,
    '',
    ...screenNames.map((name, index) => `${index + 1}. \`reference/${name}\``)
  ].join('\n')
}
