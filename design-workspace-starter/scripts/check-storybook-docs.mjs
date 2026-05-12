import { loadWorkspaceConfig } from './lib/workspace.js'
import { validateStorybookDocs } from './lib/storybook.js'

const rootDir = process.cwd()
const config = await loadWorkspaceConfig(rootDir)
const result = await validateStorybookDocs(rootDir, config)

if (result.status === 'skipped') {
  console.log(`Storybook docs check skipped: ${result.reason}`)
  process.exit(0)
}

if (result.status === 'failed') {
  console.error('Storybook docs check failed.')
  for (const issue of result.issues) {
    console.error(`- ${issue}`)
  }
  process.exit(1)
}

console.log('Storybook docs check passed.')
console.log(`- components checked: ${result.componentCount}`)
console.log(`- stories checked: ${result.storyCount}`)
console.log(`- global autodocs: ${result.hasGlobalAutodocs ? 'yes' : 'no'}`)
console.log(`- global expanded controls: ${result.hasGlobalExpandedControls ? 'yes' : 'no'}`)
