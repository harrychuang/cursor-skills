import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte'])
const STORY_FILE_PATTERN = /\.(stories|story)\.(js|jsx|ts|tsx|mjs|cjs|mdx)$/
const PREVIEW_CANDIDATES = [
  '.storybook/preview.ts',
  '.storybook/preview.tsx',
  '.storybook/preview.js',
  '.storybook/preview.jsx',
  '.storybook/preview.mjs',
  '.storybook/preview.cjs'
]

async function listFilesRecursive(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(entryPath))
      continue
    }
    files.push(entryPath)
  }

  return files
}

async function readIfExists(targetPath) {
  try {
    return await readFile(targetPath, 'utf8')
  } catch {
    return ''
  }
}

function isExcludedSourceFile(filePath) {
  const base = path.basename(filePath)
  return (
    STORY_FILE_PATTERN.test(base) ||
    /\.test\./.test(base) ||
    /\.spec\./.test(base) ||
    base.endsWith('.d.ts') ||
    base.endsWith('.md') ||
    base.endsWith('.mdx') ||
    base.startsWith('index.')
  )
}

export function isComponentSourceFile(filePath) {
  const base = path.basename(filePath)
  const ext = path.extname(base)
  if (!SOURCE_EXTENSIONS.has(ext)) return false
  if (isExcludedSourceFile(filePath)) return false
  return /^[A-Z]/.test(base)
}

export function isStoryFile(filePath) {
  return STORY_FILE_PATTERN.test(path.basename(filePath))
}

export function previewHasGlobalAutodocs(text) {
  return /tags\s*:\s*\[[\s\S]*['"]autodocs['"][\s\S]*\]/.test(text)
}

export function previewHasExpandedControls(text) {
  return /controls\s*:\s*{[\s\S]*expanded\s*:\s*true/.test(text)
}

export function storyHasLocalAutodocs(text) {
  return /tags\s*:\s*\[[\s\S]*['"]autodocs['"][\s\S]*\]/.test(text)
}

export function storyHasComponentDescription(text) {
  return /docs\s*:\s*{[\s\S]*description\s*:\s*{[\s\S]*component\s*:\s*['"`]/.test(text)
}

export function storyHasArgTypes(text) {
  return /argTypes\s*:\s*{/.test(text)
}

export function storyHasExpandedControls(text) {
  return /controls\s*:\s*{[\s\S]*expanded\s*:\s*true/.test(text)
}

export function storyHasComponentMeta(text) {
  return /component\s*:/.test(text)
}

export async function validateStorybookDocs(rootDir, config) {
  const storybookDir = path.join(rootDir, config.storybookDir || 'src/components')

  let allFiles = []
  try {
    allFiles = await listFilesRecursive(storybookDir)
  } catch {
    return {
      status: 'skipped',
      reason: `storybook source directory not found: ${path.relative(rootDir, storybookDir)}`,
      componentCount: 0,
      storyCount: 0,
      issues: []
    }
  }

  const componentFiles = allFiles.filter(isComponentSourceFile)
  const storyFiles = allFiles.filter(isStoryFile)

  if (componentFiles.length === 0) {
    return {
      status: 'skipped',
      reason: `no component source files found under ${path.relative(rootDir, storybookDir)}`,
      componentCount: 0,
      storyCount: storyFiles.length,
      issues: []
    }
  }

  let previewText = ''
  for (const candidate of PREVIEW_CANDIDATES) {
    previewText = await readIfExists(path.join(rootDir, candidate))
    if (previewText) break
  }

  const hasGlobalAutodocs = previewHasGlobalAutodocs(previewText)
  const hasGlobalExpandedControls = previewHasExpandedControls(previewText)
  const issues = []
  const checkedStories = new Set()

  for (const componentFile of componentFiles) {
    const dirname = path.dirname(componentFile)
    const base = path.basename(componentFile, path.extname(componentFile))
    const matchingStories = storyFiles.filter(storyFile => {
      const storyDir = path.dirname(storyFile)
      const storyBase = path.basename(storyFile)
      return storyDir === dirname && (
        storyBase.startsWith(`${base}.stories.`) ||
        storyBase.startsWith(`${base}.story.`)
      )
    })

    if (matchingStories.length === 0) {
      issues.push(`${path.relative(rootDir, componentFile)} is missing a companion story file`)
      continue
    }

    for (const storyFile of matchingStories) {
      checkedStories.add(storyFile)
      const text = await readFile(storyFile, 'utf8')

      if (!storyHasComponentMeta(text)) {
        issues.push(`${path.relative(rootDir, storyFile)} is missing \`component\` metadata`)
      }
      if (!hasGlobalAutodocs && !storyHasLocalAutodocs(text)) {
        issues.push(`${path.relative(rootDir, storyFile)} is missing Autodocs tags`)
      }
      if (!storyHasComponentDescription(text)) {
        issues.push(`${path.relative(rootDir, storyFile)} is missing \`parameters.docs.description.component\``)
      }
      if (!storyHasArgTypes(text)) {
        issues.push(`${path.relative(rootDir, storyFile)} is missing \`argTypes\` for documented props`)
      }
      if (!hasGlobalExpandedControls && !storyHasExpandedControls(text)) {
        issues.push(`${path.relative(rootDir, storyFile)} is missing \`controls.expanded: true\``)
      }
    }
  }

  if (issues.length > 0) {
    return {
      status: 'failed',
      componentCount: componentFiles.length,
      storyCount: checkedStories.size,
      issues
    }
  }

  return {
    status: 'passed',
    componentCount: componentFiles.length,
    storyCount: checkedStories.size,
    issues: [],
    hasGlobalAutodocs,
    hasGlobalExpandedControls
  }
}
