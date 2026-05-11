import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  buildReferenceInventoryMarkdown,
  buildScreenManifest,
  buildTasksMarkdown,
  getFigmaAuthMode,
  isFigmaAutomationReady,
  isFigmaConfigured,
  loadWorkspaceConfig,
  parseEnvText,
  scanReferenceScreens
} from './lib/workspace.js'

const rootDir = process.cwd()
const config = await loadWorkspaceConfig(rootDir)
const screens = await scanReferenceScreens(rootDir)

let envText = ''
try {
  envText = await readFile(path.join(rootDir, '.env.local'), 'utf8')
} catch {
  envText = ''
}

const env = parseEnvText(envText)
const figmaConfigured = isFigmaConfigured(env)
const figmaAutomationReady = isFigmaAutomationReady(env)
const figmaAuthMode = getFigmaAuthMode(env)
const screenManifest = buildScreenManifest(config, screens, figmaConfigured)

await writeFile(
  path.join(rootDir, 'product/SCREEN_MANIFEST.json'),
  JSON.stringify(screenManifest, null, 2) + '\n',
  'utf8'
)

await writeFile(
  path.join(rootDir, 'start-here/TASKS.md'),
  buildTasksMarkdown(screenManifest, figmaConfigured, figmaAutomationReady) + '\n',
  'utf8'
)

await writeFile(
  path.join(rootDir, 'start-here/REFERENCE_INVENTORY.md'),
  buildReferenceInventoryMarkdown(screens) + '\n',
  'utf8'
)

console.log(`Synced workspace: ${screens.length} reference screen(s), figmaConfigured=${figmaConfigured}, figmaAutomationReady=${figmaAutomationReady}, figmaAuthMode=${figmaAuthMode || 'none'}`)
