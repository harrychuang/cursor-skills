import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { constants } from 'node:fs'
import {
  getRequiredSkillPaths,
  loadWorkspaceConfig,
  parseEnvText,
  scanReferenceScreens
} from './lib/workspace.js'

const rootDir = process.cwd()
const config = await loadWorkspaceConfig(rootDir)
const requiredPaths = [
  'reference',
  'product',
  'design',
  'skills',
  'start-here',
  'workspace.config.json'
]
const requiredSkillPaths = getRequiredSkillPaths(config)

const missing = []
for (const relativePath of requiredPaths) {
  try {
    await access(path.join(rootDir, relativePath), constants.F_OK)
  } catch {
    missing.push(relativePath)
  }
}

for (const relativePath of requiredSkillPaths) {
  try {
    await access(path.join(rootDir, relativePath), constants.F_OK)
  } catch {
    missing.push(relativePath)
  }
}

const screens = await scanReferenceScreens(rootDir)

let env = {}
try {
  env = parseEnvText(await readFile(path.join(rootDir, '.env.local'), 'utf8'))
} catch {
  env = {}
}

const figmaConfigured = Boolean(env.FIGMA_FILE_URL && env.FIGMA_NODE_ID)
const figmaAutomationReady = Boolean(figmaConfigured && env.FIGMA_PAT)

if (missing.length > 0) {
  console.error('Workspace check failed. Missing paths:')
  for (const item of missing) console.error(`- ${item}`)
  console.error('Run `npm run workspace:init` to install managed skills before agent work.')
  process.exit(1)
}

if (screens.length === 0 && !figmaConfigured) {
  console.error('Workspace check failed. Add screenshots under reference/ or configure Figma in .env.local.')
  process.exit(1)
}

if (figmaConfigured && !figmaAutomationReady) {
  console.error('Workspace check failed. FIGMA_PAT is required when Figma is configured in .env.local.')
  console.error('Add FIGMA_PAT to .env.local, then re-run `npm run workspace:sync` and `npm run workspace:check`.')
  process.exit(1)
}

console.log('Workspace check passed.')
console.log(`- reference screens: ${screens.length}`)
console.log(`- figma configured: ${figmaConfigured}`)
console.log(`- figma automation ready: ${figmaAutomationReady}`)
