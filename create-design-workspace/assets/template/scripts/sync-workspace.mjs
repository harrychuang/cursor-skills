import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  buildReferenceInventoryMarkdown,
  getFoundationGuideEntries,
  buildScreenManifest,
  buildTasksMarkdown,
  getFigmaAuthMode,
  isFigmaAutomationReady,
  isFigmaConfigured,
  loadWorkspaceConfig,
  parseEnvText,
  scanReferenceScreens
} from './lib/workspace.js'

async function ensureFoundationGuides(rootDir, config) {
  const foundationDir = path.join(rootDir, 'design', 'foundations')
  const entries = getFoundationGuideEntries(config)
  let created = 0

  await mkdir(foundationDir, { recursive: true })

  for (const entry of entries) {
    const targetPath = path.join(rootDir, entry.relativePath)
    await mkdir(path.dirname(targetPath), { recursive: true })
    try {
      await access(targetPath)
    } catch {
      await writeFile(targetPath, entry.content + '\n', 'utf8')
      created += 1
    }
  }

  return created
}

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
const foundationsCreated = await ensureFoundationGuides(rootDir, config)

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

console.log(`Synced workspace: ${screens.length} reference screen(s), figmaConfigured=${figmaConfigured}, figmaAutomationReady=${figmaAutomationReady}, figmaAuthMode=${figmaAuthMode || 'none'}, foundationsCreated=${foundationsCreated}`)
