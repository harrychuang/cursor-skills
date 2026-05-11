import { cp, mkdtemp, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { getManagedSkills, loadWorkspaceConfig } from './lib/workspace.js'

const execFileAsync = promisify(execFile)

function readFlag(name) {
  const args = process.argv.slice(2)
  return args.includes(name)
}

function buildRepoUrl(repo) {
  return `https://github.com/${repo}.git`
}

async function cloneRepo(repoDir, repo, ref) {
  await execFileAsync('git', [
    'clone',
    '--depth', '1',
    '--branch', ref,
    '--filter=blob:none',
    '--sparse',
    buildRepoUrl(repo),
    repoDir
  ])
}

async function sparseCheckout(repoDir, skillPaths) {
  await execFileAsync('git', ['-C', repoDir, 'sparse-checkout', 'set', ...skillPaths])
}

async function ensureSourceDir(repoDir, relativePath) {
  const sourceDir = path.join(repoDir, relativePath)
  const sourceStat = await stat(sourceDir)
  if (!sourceStat.isDirectory()) {
    throw new Error(`Managed skill source is not a directory: ${relativePath}`)
  }
  return sourceDir
}

async function installManagedSkill(rootDir, repoDir, skill, force) {
  const sourceDir = await ensureSourceDir(repoDir, skill.path)
  const targetDir = path.join(rootDir, 'skills', skill.name)

  if (force) {
    await rm(targetDir, { recursive: true, force: true })
  }

  await cp(sourceDir, targetDir, {
    recursive: true,
    force: true
  })

  return targetDir
}

const rootDir = process.cwd()
const config = await loadWorkspaceConfig(rootDir)
const managedSkills = getManagedSkills(config)
const force = readFlag('--force')

if (managedSkills.length === 0) {
  console.log('No managed skills configured.')
  process.exit(0)
}

const groups = new Map()
for (const skill of managedSkills) {
  const key = `${skill.repo}#${skill.ref}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(skill)
}

const installed = []

for (const [key, skills] of groups.entries()) {
  const [{ repo, ref }] = skills
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'design-workspace-starter-'))
  const repoDir = path.join(tempDir, 'repo')
  try {
    await cloneRepo(repoDir, repo, ref)
    await sparseCheckout(repoDir, skills.map(skill => skill.path))

    for (const skill of skills) {
      const installedPath = await installManagedSkill(rootDir, repoDir, skill, force)
      installed.push({ name: skill.name, repo, ref, path: installedPath })
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }

  console.log(`Fetched ${skills.length} managed skill(s) from ${key}`)
}

for (const skill of installed) {
  console.log(`- installed ${skill.name} from ${skill.repo}@${skill.ref} -> ${path.relative(rootDir, skill.path)}`)
}
