import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  buildReferenceInventoryMarkdown,
  buildScreenManifest,
  buildTasksMarkdown,
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
const figmaConfigured = Boolean(env.FIGMA_FILE_URL && env.FIGMA_NODE_ID)
const screenManifest = buildScreenManifest(config, screens, figmaConfigured)

await writeFile(
  path.join(rootDir, 'product/SCREEN_MANIFEST.json'),
  JSON.stringify(screenManifest, null, 2) + '\n',
  'utf8'
)

await writeFile(
  path.join(rootDir, 'start-here/TASKS.md'),
  buildTasksMarkdown(screenManifest, figmaConfigured) + '\n',
  'utf8'
)

await writeFile(
  path.join(rootDir, 'start-here/REFERENCE_INVENTORY.md'),
  buildReferenceInventoryMarkdown(screens) + '\n',
  'utf8'
)

console.log(`Synced workspace: ${screens.length} reference screen(s), figmaConfigured=${figmaConfigured}`)
