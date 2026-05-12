import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'])
const FIGMA_CONNECTOR_AUTH_MODES = new Set(['connector', 'mcp'])

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

export function getFigmaAuthMode(env) {
  const raw = String(env?.FIGMA_AUTH_MODE ?? '').trim().toLowerCase()
  if (raw === 'pat') return 'pat'
  if (FIGMA_CONNECTOR_AUTH_MODES.has(raw)) return 'connector'
  return ''
}

export function isFigmaConfigured(env) {
  return Boolean(env?.FIGMA_FILE_URL && env?.FIGMA_NODE_ID)
}

export function isFigmaAutomationReady(env) {
  if (!isFigmaConfigured(env)) return false
  return Boolean(env.FIGMA_PAT || getFigmaAuthMode(env) === 'connector')
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

export function buildTasksMarkdown(screenManifest, figmaConfigured, figmaAutomationReady) {
  const screenTasks = screenManifest.screens.length > 0
    ? screenManifest.screens.map(screen => `- [ ] Build \`${screen.route}\` from \`${screen.reference}\` as \`${screen.component}\``)
    : ['- [ ] Add one or more screenshots to `reference/` before screen implementation']

  const figmaLines = figmaConfigured && figmaAutomationReady
    ? [
      '- [ ] Run `skills/figma-m3-variables/SKILL.md` as Phase 0 before Phase A',
      '- [ ] Use authenticated Figma connector/MCP access or `FIGMA_PAT` for Figma-first automation',
      '- [ ] Create or audit Figma variables in Ref -> Sys -> Comp order',
      '- [ ] Bind the agreed Figma variables to the key source components before code work',
      '- [ ] Use Figma as the source of truth during compare/parity work'
    ]
    : figmaConfigured
      ? [
        '- [ ] Add `FIGMA_PAT` to `.env.local`, or set `FIGMA_AUTH_MODE=connector` when your tool already has authenticated Figma MCP/connector access',
        '- [ ] Run `npm run workspace:sync` after updating `.env.local`',
        '- [ ] Run `npm run workspace:check` to confirm Figma automation readiness'
      ]
    : ['- [ ] Configure `.env.local` if you want Figma-first workflows and Phase 0 token binding']

  return [
    '# Tasks',
    '',
    '- [ ] Update `product/PRD.md` with the real product requirements',
    '- [ ] Run `npm run workspace:init` to install managed skills before agent work',
    '- [ ] Run `npm run workspace:sync` after changing input sources',
    '- [ ] Read `start-here/ACCURACY_CONTRACT.md` and classify the source mode as Figma-first, multi-reference screenshot, or single-image',
    '- [ ] For image-only work, record observed, inferred, and missing context before implementation',
    '- [ ] Analyze screenshot and/or Figma references for shared signals in color proportion, spacing feel, corner size, and typography weight',
    '- [ ] Summarize 5-7 evidence-backed design principles before component implementation',
    '- [ ] Define design elements for color, typography, corner, and spacing, then map them into tokens',
    '- [ ] Define the design-system documentation IA before component details; default to `Foundations`, `Styles`, and `Components`',
    '- [ ] Define the standard component docs sections: `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens`',
    '- [ ] Replace the placeholder guidance in `design/foundations/*.md` with project-specific design rules',
    '- [ ] Keep color, typography, spacing, and corner guidance aligned with `design/extracted-design-tokens/design-tokens.json`',
    '- [ ] Install or upgrade to the latest stable Storybook 10 before shared component work',
    ...figmaLines,
    '- [ ] Run Phase A design-system analysis after Phase 0 is complete',
    '- [ ] Run Phase B visual inventory',
    '- [ ] Run Phase C component reuse gate',
    '- [ ] Build or update `design/foundations/storybook-docs/guides.mdx` before expanding component docs',
    '- [ ] Build or update Storybook foundations pages with a design-led, bento-style layout when token work changes',
    '- [ ] Build or extend Storybook components with Autodocs enabled',
    '- [ ] Give every reusable component a companion story with `argTypes`, component description, and expanded controls',
    '- [ ] Run `npm run storybook:check-docs` before sign-off once reusable components exist',
    '- [ ] Add component descriptions to Storybook docs for each reusable component',
    '- [ ] Compose product screens',
    '- [ ] Run visual parity and record accepted, deferred, or blocked variance',
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

export function getRequiredFoundationPaths() {
  return [
    'design/foundations',
    'design/foundations/README.md',
    'design/foundations/design-principles.md',
    'design/foundations/color.md',
    'design/foundations/typography.md',
    'design/foundations/spacing.md',
    'design/foundations/corner.md',
    'design/foundations/design-token-usage.md',
    'design/foundations/storybook-docs',
    'design/foundations/storybook-docs/README.md',
    'design/foundations/storybook-docs/overview.mdx',
    'design/foundations/storybook-docs/guides.mdx',
    'design/foundations/storybook-docs/color.mdx',
    'design/foundations/storybook-docs/typography.mdx',
    'design/foundations/storybook-docs/spacing.mdx',
    'design/foundations/storybook-docs/corner.mdx',
    'design/foundations/storybook-docs/design-token-usage.mdx',
    'design/foundations/storybook-docs/component-story-template.tsx.txt',
    'src',
    'src/stories',
    'src/stories/foundations',
    'src/stories/foundations/README.md',
    'src/stories/foundations/overview.mdx',
    'src/stories/foundations/guides.mdx',
    'src/stories/foundations/color.mdx',
    'src/stories/foundations/typography.mdx',
    'src/stories/foundations/spacing.mdx',
    'src/stories/foundations/corner.mdx',
    'src/stories/foundations/design-token-usage.mdx'
  ]
}

function buildFoundationsReadme() {
  return [
    '# Foundations',
    '',
    'This folder is the operating manual for the workspace. Keep these guides aligned with `design/extracted-design-tokens/design-tokens.json`, Storybook foundations pages, and the shipped UI.',
    '',
    '## Bento Map',
    '',
    '| Principles | Color | Typography |',
    '| --- | --- | --- |',
    '| [Design Principles](design-principles.md) | [Color](color.md) | [Typography](typography.md) |',
    '| clarity, hierarchy, accessibility | semantic palette, states, contrast | scale, roles, rhythm |',
    '',
    '| Spacing | Corner | Token Usage |',
    '| --- | --- | --- |',
    '| [Spacing](spacing.md) | [Corner](corner.md) | [Token Usage](design-token-usage.md) |',
    '| layout rhythm, gutters, density | radius rules, containment, emphasis | naming, implementation, Storybook docs |',
    '',
    '## Operating Rules',
    '',
    '- Before reusable component work, derive the shared visual system from screenshot and/or Figma evidence.',
    '- Define the documentation site map before component details. Default docs IA: `Foundations`, `Styles`, `Components`, with optional `Patterns`, `Templates`, and `Resources`.',
    '- Standard component docs sections are `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens`. Add extra sections only when the component contract needs them.',
    '- Update these guides whenever token meaning, naming, or visual rules change.',
    '- Keep Storybook foundation pages visually intentional. Prefer editorial or bento-like layouts instead of plain spec dumps.',
    '- Treat `Ref -> Sys -> Comp` as the token layering model when Figma mode is active.',
    '- Do not ship screens with hardcoded foundation values that bypass the token layer.',
    '',
    '## Required Outputs',
    '',
    '- Evidence-backed design principles and decision rules that explain why the system looks and behaves this way.',
    '- A design analysis that separates observed source values from inferred system recommendations.',
    '- Fixed-schema tables for Signal Summary, Design Principles, Design Elements, and Observed vs Inferred.',
    '- A documentation architecture that tells teams where foundations stop and component docs begin.',
    '- Foundation specs for color, typography, spacing, and corner/radius.',
    '- Clear token usage guidance for code, CSS variables, component props, and Storybook docs.',
    '- A visible mapping between extracted tokens, semantic tokens, and component-level application.',
    '- Storybook foundations templates that can be turned into polished docs pages without starting from scratch.',
    '- Storybook pages that teach when to use a foundation role, not just what token name exists.',
    '',
    '## Maintenance Loop',
    '',
    '1. Update tokens or Figma variables.',
    '2. Update the relevant foundation guide in this folder.',
    '3. Update Storybook foundation pages when the change is user-visible.',
    '4. Re-check composed screens and visual parity.'
  ].join('\n')
}

function buildDesignPrinciplesMarkdown() {
  return [
    '# Design Principles',
    '',
    'Use these principles to explain the system before discussing component details.',
    'Derive them from repeated evidence in screenshots or Figma, not taste alone.',
    '',
    '## Analysis Workflow',
    '',
    '1. Observe recurring signals across the source: color proportion, spacing feel, corner size, typography weight, and hierarchy contrast.',
    '2. Separate `observed` facts from `inferred` system decisions. If a value is estimated, say so.',
    '3. Summarize 5-7 principles only after the pattern repeats across multiple regions, screens, or key Figma nodes.',
    '4. For each principle, explain the token impact and any intentional exceptions.',
    '',
    '## Required Table',
    '',
    '| Principle | Source evidence | Interpretation | Design rule | Token impact |',
    '| --- | --- | --- | --- | --- |',
    '| 1 |  |  |  |  |',
    '| 2 |  |  |  |  |',
    '| 3 |  |  |  |  |',
    '| 4 |  |  |  |  |',
    '| 5 |  |  |  |  |',
    '',
    'Add rows 6-7 only when the evidence supports them.',
    '',
    '## Bento Snapshot',
    '',
    '| Principle | Source evidence | Interpretation | Design rule | Token impact |',
    '| --- | --- | --- | --- | --- |',
    '| Clarity first | Neutral surfaces dominate and text hierarchy does most of the work | The interface prefers legibility over decorative layering | Remove decorative noise before adding new accents | Prefer semantic color roles and clear type hierarchy |',
    '| Structured emphasis | Accent color and heavier weight appear in a narrow set of key moments | Emphasis is scarce and therefore more effective | Emphasize with contrast, size, and spacing in that order | Reserve stronger tokens for true hierarchy shifts |',
    '| Rhythm over ornament | Repeated padding steps and aligned containers create polish | Layout consistency matters more than isolated visual flourishes | Reuse spacing steps and radius families across layouts | Keep layout tokens sparse and repeatable |',
    '| Accessible by default | Text, controls, and state changes remain legible under low-chroma surfaces | Readability and states are baseline quality, not extra work | Check contrast, focus, and state legibility before sign-off | Semantic tokens must encode accessible defaults |',
    '',
    '## Design Spec Expectations',
    '',
    '- Document the intended mood, target density, and hierarchy model for the product.',
    '- Describe the dominant color ratio, spacing density, radius tone, and text weight strategy in plain language.',
    '- Explain what should feel bold, quiet, premium, playful, or utilitarian.',
    '- If references disagree, document the dominant pattern and the exceptions instead of averaging everything together.',
    '- Note platform constraints such as responsive breakpoints, touch targets, or enterprise density needs.',
    '',
    '## Review Questions',
    '',
    '- Can a new designer or engineer tell which layer is primary, secondary, and supporting?',
    '- Are repeated patterns explained once here instead of re-decided in each component?',
    '- Do tokens encode the rule, or are teams relying on visual memory?',
    '- Is each principle traceable to visible evidence rather than subjective preference alone?'
  ].join('\n')
}

function buildColorMarkdown() {
  return [
    '# Color',
    '',
    'Translate observed color usage into a semantic system before assigning component-level exceptions.',
    '',
    '## Analysis Inputs',
    '',
    '- Approximate proportion of neutral, accent, and state colors across the source.',
    '- Where high saturation is reserved: primary CTA, data highlights, navigation, or illustration.',
    '- How surface layering, border contrast, and emphasis are achieved.',
    '',
    '## Required Table',
    '',
    '| Role | Recommendation | Observed source cue | Rationale | Token direction |',
    '| --- | --- | --- | --- | --- |',
    '| Primary color | `#` |  |  | `--sys-color-*` |',
    '| Secondary color | `#` |  |  | `--sys-color-*` |',
    '| Background/surface color | `#` |  |  | `--sys-color-*` |',
    '| Text primary | `#` |  |  | `--sys-color-text-*` |',
    '| Border/divider | `#` |  |  | `--sys-color-border-*` |',
    '',
    '## Bento Snapshot',
    '',
    '| Layer | Purpose | Typical examples | Rule |',
    '| --- | --- | --- | --- |',
    '| Ref | Raw palette source | blue-500, slate-900 | Do not use directly in screens |',
    '| Sys | Semantic meaning | surface, text, border, accent, danger | Default layer for product UI |',
    '| Comp | Controlled exceptions | badge-success-bg, table-row-hover | Only when a component truly needs local meaning |',
    '',
    '## Required Spec',
    '',
    '- Recommended primary, secondary, and background/surface colors with Hex values and rationale',
    '- Base surfaces: canvas, elevated surface, inverse surface',
    '- Text roles: primary, secondary, muted, inverse',
    '- Interactive roles: primary action, secondary action, focus, visited, disabled',
    '- Feedback roles: success, warning, danger, info',
    '- Notes on observed values versus normalized system choices',
    '',
    '## Usage Rules',
    '',
    '- Prefer semantic tokens in product code and stories.',
    '- Document the intended color ratio so accent usage does not sprawl over time.',
    '- Reserve raw palette references for token definition files only.',
    '- State colors must preserve contrast in default, hover, active, and disabled states.',
    '- If a component needs a custom color token, document the reason and owner here.',
    '',
    '## Usage Guidance',
    '',
    '### Primary',
    '',
    'Use `Primary` for the one element that deserves the strongest interactive emphasis in a local region: the main CTA, current selection, or focus-led highlight.',
    '',
    '### Primary Container',
    '',
    'Use `Primary Container` for larger highlighted surfaces that need brand presence without behaving like a button on every pixel.',
    '',
    '### Surface',
    '',
    'Use `Surface` for the default canvas, cards, and neutral containers where content hierarchy should do more work than color.',
    '',
    '### Surface Variant / Subtle',
    '',
    'Use subtle semantic roles for secondary panels, filter trays, or neutral chips that need separation without CTA energy.',
    '',
    '### Error and Other Feedback Roles',
    '',
    'Use `Error`, `Warning`, `Success`, and `Info` only when the UI is communicating state, validation, or consequence.',
    '',
    '## Storybook Expectations',
    '',
    '- Show core surface and text pairings on a foundations page.',
    '- Include key state ramps and contrast notes.',
    '- Use a composed layout that feels designed, not a raw token dump.'
  ].join('\n')
}

function buildTypographyMarkdown() {
  return [
    '# Typography',
    '',
    'Describe the reading system, hierarchy rules, and token naming for text.',
    '',
    '## Analysis Inputs',
    '',
    '- Dominant text weights and where they appear.',
    '- Relative contrast between headings, body, labels, and metadata.',
    '- Whether the source feels editorial, product-led, technical, or brand-forward.',
    '',
    '## Required Table',
    '',
    '| Role | Recommendation | Observed source cue | Rationale | Token direction |',
    '| --- | --- | --- | --- | --- |',
    '| Primary typeface |  |  |  | `--sys-font-*` |',
    '| Secondary typeface |  |  |  | `--sys-font-*` |',
    '| Heading weight |  |  |  | `--sys-font-weight-*` |',
    '| Body weight |  |  |  | `--sys-font-weight-*` |',
    '| Label/meta weight |  |  |  | `--sys-font-weight-*` |',
    '',
    '## Bento Snapshot',
    '',
    '| Role | Use case | Token fields | Notes |',
    '| --- | --- | --- | --- |',
    '| Display | Large hero moments | family, size, line-height, weight, tracking | Use sparingly and intentionally |',
    '| Heading | Section and card titles | family, size, line-height, weight | Defines hierarchy before color does |',
    '| Body | Default reading text | family, size, line-height, weight | Optimize for sustained reading |',
    '| Label | Controls, metadata, badges | family, size, line-height, weight, transform | Keep dense but readable |',
    '',
    '## Required Spec',
    '',
    '- One or two recommended open-source fonts, preferably from Google Fonts, with selection rationale',
    '- Type families and approved fallbacks',
    '- Size scale and line-height rhythm',
    '- Weight mapping and where each weight is allowed',
    '- Rules for caps, tracking, truncation, and long-form text',
    '',
    '## Usage Rules',
    '',
    '- Use type tokens for every reusable component story and screen.',
    '- Let weight, size, and spacing establish hierarchy before adding color emphasis.',
    '- Prefer role-driven names such as `body-md` or `title-lg` over page-specific names.',
    '- If responsive typography changes hierarchy, document the breakpoint behavior here.',
    '',
    '## Usage Guidance',
    '',
    '### Display',
    '',
    'Reserve `Display` for landing moments, empty states, hero panels, or a document front door.',
    '',
    '### H1 / H2 / H3',
    '',
    'Use headings to organize page, section, and card structure rather than attaching one-off sizes to single screens.',
    '',
    '### Body',
    '',
    'Use body styles for guidelines, explanations, helper text, and sustained reading.',
    '',
    '### Label',
    '',
    'Use labels for form controls, tabs, compact metadata, chips, and short descriptive text attached to another element.',
    '',
    '### Caption / Meta',
    '',
    'Use caption or meta text for timestamps, annotations, and supportive details that must stay secondary.',
    '',
    '## Storybook Expectations',
    '',
    '- Show the full type ladder with real sample content.',
    '- Demonstrate hierarchy inside a bento-style editorial layout, not isolated rows only.',
    '- Annotate where text should wrap, truncate, or remain single-line.'
  ].join('\n')
}

function buildSpacingMarkdown() {
  return [
    '# Spacing',
    '',
    'Spacing rules define rhythm, grouping, and density across the product.',
    '',
    '## Analysis Inputs',
    '',
    '- The dominant density mode: spacious immersive, balanced, or compact efficient.',
    '- Repeated gap, padding, and gutter relationships visible in the source.',
    '- Whether grouping is created more by whitespace, borders, or color containers.',
    '',
    '## Required Table',
    '',
    '| Layout element | Recommendation | Observed source cue | Rationale | Token direction |',
    '| --- | --- | --- | --- | --- |',
    '| Base grid | 4px / 8px / mixed |  |  | `--sys-space-*` |',
    '| Default component padding |  |  |  | `--sys-space-*` |',
    '| Section gap |  |  |  | `--sys-space-*` |',
    '| Page gutter |  |  |  | `--sys-space-*` |',
    '| Density mode | spacious / balanced / compact |  |  | spacing and layout tokens |',
    '',
    '## Bento Snapshot',
    '',
    '| Token band | Common use | Examples | Guardrail |',
    '| --- | --- | --- | --- |',
    '| Compact | tight internal gaps | icon-label, chip padding | Use for dense controls only |',
    '| Base | standard component padding | cards, inputs, list rows | Default starting point |',
    '| Spacious | section separation | panel gaps, page gutters | Use to signal hierarchy shifts |',
    '',
    '## Required Spec',
    '',
    '- Base spacing grid recommendation such as 4px or 8px, with reason',
    '- Core spacing scale and the intended step progression',
    '- Component padding defaults',
    '- Grid gutters, section spacing, and responsive layout margins',
    '- Density rules for mobile, desktop, and data-heavy views',
    '',
    '## Usage Rules',
    '',
    '- Reuse spacing tokens before adding one-off values.',
    '- Let spacing create hierarchy before adding more borders or colors.',
    '- Document when the chosen spacing grid is inferred from the source rather than explicitly observed.',
    '- When components feel crowded, fix the rhythm at the token or shared-component layer first.',
    '',
    '## Usage Guidance',
    '',
    '### `xs` to `sm`',
    '',
    'Use the smallest spacing steps for relationships inside a component: icon-to-label gaps, supporting text offsets, or segmented control padding.',
    '',
    '### `md`',
    '',
    'Use the base spacing step for default control padding and the most common gap between sibling elements inside a card or form block.',
    '',
    '### `lg`',
    '',
    'Use larger steps when a group needs to read as a separate module: stacked cards, panel headers, or grouped form sections.',
    '',
    '### `xl` and above',
    '',
    'Use the largest spacing steps for section gaps, page gutters, and layout-level rhythm.',
    '',
    '### Density Rule',
    '',
    'If a screen becomes dense, reduce spacing consistently by band rather than shrinking one-off gaps.',
    '',
    '## Storybook Expectations',
    '',
    '- Show layout rhythm examples for cards, forms, and stacked sections.',
    '- Explain which spacing steps are safe defaults for new components.',
    '- Present spacing references in grouped modules so the page reads like a guide, not a spreadsheet.'
  ].join('\n')
}

function buildCornerMarkdown() {
  return [
    '# Corner',
    '',
    'Corner and radius tokens help define the product tone from crisp to soft.',
    '',
    '## Analysis Inputs',
    '',
    '- The most common radius treatment across controls, cards, overlays, and media.',
    '- Where sharper or rounder shapes are used as exceptions.',
    '- Whether the overall tone feels technical, neutral, soft, or expressive.',
    '',
    '## Required Table',
    '',
    '| Role | Recommendation | Observed source cue | Rationale | Token direction |',
    '| --- | --- | --- | --- | --- |',
    '| Default control radius |  |  |  | `--sys-radius-*` |',
    '| Card/container radius |  |  |  | `--sys-radius-*` |',
    '| Overlay radius |  |  |  | `--sys-radius-*` |',
    '| Sharp-corner exception |  |  |  | component or layout exception |',
    '',
    '## Bento Snapshot',
    '',
    '| Token | Typical use | Visual effect | Rule |',
    '| --- | --- | --- | --- |',
    '| Sharp | tables, utility shells | technical, structured | Use when precision is part of the tone |',
    '| Subtle | inputs, buttons, cards | calm, modern | Default family for most UI |',
    '| Expressive | hero cards, promotional surfaces | softer, more branded | Use sparingly for emphasis |',
    '',
    '## Required Spec',
    '',
    '- Recommended default border-radius values and role names',
    '- Radius scale with named roles',
    '- Component defaults for controls, cards, overlays, and media containers',
    '- Rules for mixing sharp and soft shapes in the same view',
    '',
    '## Usage Rules',
    '',
    '- Pick one default radius family for the product and document exceptions.',
    '- Increase radius only when it supports the brand or interaction model.',
    '- If multiple radius families exist in the source, define which one is dominant and why.',
    '- When adjacent components touch, align their corner logic so seams feel intentional.',
    '',
    '## Storybook Expectations',
    '',
    '- Show radius tokens on real component silhouettes, not swatches alone.',
    '- Document where square corners are preferred for data-dense or utilitarian areas.',
    '- Use side-by-side modules to explain why each radius family exists.'
  ].join('\n')
}

function buildDesignTokenUsageMarkdown() {
  return [
    '# Design Token Usage',
    '',
    'Explain how tokens move from design source to implementation and docs.',
    '',
    '## Bento Snapshot',
    '',
    '| Stage | Output | Owner | Notes |',
    '| --- | --- | --- | --- |',
    '| Extract | `design/extracted-design-tokens/design-tokens.json` | design system or automation | Raw capture of the current source |',
    '| Normalize | semantic token files or theme layer | design system | Convert source values into stable roles |',
    '| Apply | components, layouts, stories | engineering | Consume semantic tokens, not raw literals |',
    '| Explain | Storybook foundations pages and these guides | design + engineering | Teach usage, exceptions, and review rules |',
    '',
    '## Naming Guidance',
    '',
    '- Prefer role-based names over page-specific names.',
    '- Keep token families shallow and predictable.',
    '- Reflect the layer in the name when needed: ref, sys, comp.',
    '- Preserve a record of `observed` values separately from the normalized token names when analysis involves estimation.',
    '',
    '## Required Mapping Table',
    '',
    '| Design dimension | Observed value | Normalized token | Consumer examples |',
    '| --- | --- | --- | --- |',
    '| Color |  |  |  |',
    '| Typography |  |  |  |',
    '| Spacing |  |  |  |',
    '| Corner |  |  |  |',
    '',
    '## Implementation Guidance',
    '',
    '```css',
    ':root {',
    '  --sys-color-surface: #ffffff;',
    '  --sys-space-md: 16px;',
    '  --sys-radius-md: 12px;',
    '}',
    '```',
    '',
    '```ts',
    'export const cardStyles = {',
    "  background: 'var(--sys-color-surface)',",
    "  padding: 'var(--sys-space-md)',",
    "  borderRadius: 'var(--sys-radius-md)'",
    '}',
    '```',
    '',
    '## Documentation Guidance',
    '',
    '- Each foundation page should explain when to use the token family, not just list values.',
    '- Record why a normalized token differs from an observed screenshot/Figma value when you intentionally simplify the system.',
    '- Component stories should reference the relevant foundation rules in their descriptions when the dependency is important.',
    '- If a token is deprecated, note the replacement and migration reason here before removing it.'
  ].join('\n')
}

function buildStorybookDocsReadme() {
  return [
    '# Storybook Docs Templates',
    '',
    'Use these templates when wiring the design foundations into Storybook.',
    'The discoverable copies that Storybook can load with its default `src/**/*.mdx` glob live under `src/stories/foundations/`.',
    '',
    '## Included Files',
    '',
    '- `overview.mdx`: landing page for the foundations section with a bento-style overview.',
    '- `guides.mdx`: documentation IA and component page contract for the design-system site.',
    '- `color.mdx`: semantic color and contrast guidance.',
    '- `typography.mdx`: type scale, hierarchy, and reading rhythm guidance.',
    '- `spacing.mdx`: layout rhythm and density guidance.',
    '- `corner.mdx`: radius system and shape language guidance.',
    '- `design-token-usage.mdx`: token pipeline and implementation guidance.',
    '- `component-story-template.tsx.txt`: baseline Autodocs story template with argTypes and props controls.',
    '',
    '## Usage',
    '',
    '1. Start with `guides.mdx` to define the documentation site map and the standard component page sections before writing component detail pages.',
    '2. Use `overview.mdx` as the front door for the foundations cluster.',
    '3. Replace placeholder copy with rules from `design/foundations/*.md`.',
    '4. Keep the discoverable `src/stories/foundations/*.mdx` pages aligned with this folder so a default Storybook install actually shows the guides.',
    '5. Keep the card-based or bento-like presentation instead of flattening everything into tables.',
    '6. Use the component story template for every reusable component, then tailor `args` and `argTypes` to the real props.',
    '',
    '## Validation',
    '',
    'Run `npm run storybook:check-docs` after adding reusable components. The check expects each component under `src/components` to have a companion story with Autodocs, a component description, and `argTypes`.'
  ].join('\n')
}

function buildStorybookFoundationsReadme() {
  return [
    '# Storybook Foundations Pages',
    '',
    'These files live under `src/stories/foundations/` so a default Storybook setup can discover the foundation guides without extra `stories` glob changes.',
    '',
    '## Source Of Truth',
    '',
    '- Treat `design/foundations/storybook-docs/` as the template source for these pages.',
    '- Keep the docs titles and IA consistent with the design guides under `design/foundations/*.md`.',
    '- When the token layer or usage rules change, update the visible Storybook pages here as part of the same change.',
    '',
    '## Included Pages',
    '',
    '- `overview.mdx`',
    '- `guides.mdx`',
    '- `color.mdx`',
    '- `typography.mdx`',
    '- `spacing.mdx`',
    '- `corner.mdx`',
    '- `design-token-usage.mdx`'
  ].join('\n')
}

function buildFoundationsOverviewMdx() {
  return [
    "import { Meta, Title, Subtitle, Description } from '@storybook/blocks'",
    '',
    '<Meta title="Foundations/Overview" parameters={{ layout: \'fullscreen\' }} />',
    '',
    '<Title>Foundations Overview</Title>',
    '<Subtitle>Use this as the design-system front door before component-level docs branch out.</Subtitle>',
    '<Description>',
    'This page should introduce the design-system reading order: start from documentation IA, then foundations, then component detail.',
    '</Description>',
    '',
    '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(12, minmax(0, 1fr))\', gap: 16, marginTop: 24 }}>',
    '  <section style={{ gridColumn: \'span 7\', padding: 28, borderRadius: 28, background: \'linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #334155 100%)\', color: \'#f8fafc\' }}>',
    '    <h2 style={{ marginTop: 0, marginBottom: 12 }}>Documentation First</h2>',
    '    <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.88 }}>Before component pages multiply, define the site map, the foundation logic, and the shared language for tokens and usage.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 5\', padding: 24, borderRadius: 28, background: \'#fff7ed\', border: \'1px solid #fdba74\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Default Docs Map</h2>',
    '    <p style={{ margin: 0 }}>Use `Foundations`, `Styles`, and `Components` as the primary navigation. Add `Patterns`, `Templates`, or `Resources` only when the system needs them.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#f8fafc\', border: \'1px solid #cbd5e1\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Guides</h3>',
    '    <p style={{ marginBottom: 0 }}>Define IA, page sections, and the difference between guidance pages and component reference pages.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#eff6ff\', border: \'1px solid #93c5fd\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Color</h3>',
    '    <p style={{ marginBottom: 0 }}>Document what each semantic role means before a component invents local exceptions.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#f0fdf4\', border: \'1px solid #86efac\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Typography</h3>',
    '    <p style={{ marginBottom: 0 }}>Define hierarchy through role, not one-off sizes attached to a single screen.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#fefce8\', border: \'1px solid #fde047\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Spacing</h3>',
    '    <p style={{ marginBottom: 0 }}>Explain rhythm bands and safe defaults before teams reach for local padding fixes.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 6\', padding: 20, borderRadius: 24, background: \'#faf5ff\', border: \'1px solid #d8b4fe\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Standard Component Page</h3>',
    '    <p style={{ marginBottom: 0 }}>Every component page starts from `Overview`, then shows `Anatomy`, `States`, `Usage`, and `Tokens`.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 6\', padding: 20, borderRadius: 24, background: \'#f8fafc\', border: \'1px solid #cbd5e1\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Token Layers</h3>',
    '    <p style={{ marginBottom: 0 }}>Explain how `Ref`, `Sys`, and `Comp` tokens relate before component implementation begins.</p>',
    '  </section>',
    '</div>'
  ].join('\n')
}

function buildGuidesMdx() {
  return [
    "import { Meta, Title, Subtitle, Description } from '@storybook/blocks'",
    '',
    '<Meta title="Foundations/Guides" parameters={{ layout: \'fullscreen\' }} />',
    '',
    '<Title>Documentation Guides</Title>',
    '<Subtitle>Plan the design-system site map and page contract before detailing components.</Subtitle>',
    '<Description>Use this page as the documentation architecture brief for the Storybook site. Foundations explain shared logic; component pages explain concrete implementation and states.</Description>',
    '',
    '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(12, minmax(0, 1fr))\', gap: 16, marginTop: 24 }}>',
    '  <section style={{ gridColumn: \'span 7\', padding: 28, borderRadius: 28, background: \'#111827\', color: \'#f9fafb\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Default Navigation Map</h2>',
    '    <p style={{ marginBottom: 0 }}>Use `Foundations`, `Styles`, and `Components` as the primary navigation. Add `Patterns`, `Templates`, or `Resources` only when the system genuinely needs them.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 5\', padding: 24, borderRadius: 28, background: \'#fef3c7\', border: \'1px solid #f59e0b\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Optional Layers</h2>',
    '    <p style={{ margin: 0 }}>Patterns cover multi-component flows, templates cover page blueprints, and resources cover contribution references.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 8\', padding: 24, borderRadius: 28, background: \'#eff6ff\', border: \'1px solid #93c5fd\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Standard Component Page</h2>',
    '    <p style={{ margin: 0 }}>The default section order is `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens`. Add more only when the component contract expands.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 24, borderRadius: 28, background: \'#ecfccb\', border: \'1px solid #84cc16\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Writing Rule</h2>',
    '    <p style={{ margin: 0 }}>Do not force component pages to re-explain foundation logic. Teach the shared rule once, then reference it.</p>',
    '  </section>',
    '</div>'
  ].join('\n')
}

function buildColorMdx() {
  return [
    "import { Meta, Title, Subtitle, Description } from '@storybook/blocks'",
    '',
    '<Meta title="Foundations/Color" parameters={{ layout: \'fullscreen\' }} />',
    '',
    '<Title>Color Foundation</Title>',
    '<Subtitle>Semantic color roles before component-level exceptions.</Subtitle>',
    '<Description>Use this page to explain what each semantic color role means in practice. Replace the sample labels with the active token names, but keep the decision rules explicit.</Description>',
    '',
    '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(12, minmax(0, 1fr))\', gap: 16, marginTop: 24 }}>',
    '  <section style={{ gridColumn: \'span 8\', padding: 24, borderRadius: 28, background: \'#111827\', color: \'#f9fafb\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Semantic Palette</h2>',
    '    <p>Document which role owns emphasis, containment, neutrality, and feedback before any component invents local color exceptions.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 24, borderRadius: 28, background: \'#f8fafc\', border: \'1px solid #cbd5e1\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Contrast Rules</h2>',
    '    <p>Call out minimum contrast expectations, inverse text pairings, and the failure cases where color alone is carrying meaning.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 6\', padding: 20, borderRadius: 24, background: \'#fff7ed\', border: \'1px solid #fdba74\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Feedback Roles</h3>',
    '    <p>Reserve error, warning, success, and info colors for actual state communication, not decoration.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 6\', padding: 20, borderRadius: 24, background: \'#eff6ff\', border: \'1px solid #93c5fd\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Component Exceptions</h3>',
    '    <p>List component-only tokens only when the semantic layer cannot express the behavior. Document why the exception exists.</p>',
    '  </section>',
    '</div>'
  ].join('\n')
}

function buildTypographyMdx() {
  return [
    "import { Meta, Title, Subtitle, Description } from '@storybook/blocks'",
    '',
    '<Meta title="Foundations/Typography" parameters={{ layout: \'fullscreen\' }} />',
    '',
    '<Title>Typography Foundation</Title>',
    '<Subtitle>Hierarchy, readability, and role-driven naming.</Subtitle>',
    '<Description>Mirror `design/foundations/typography.md`, but show the roles in real layout context and make the usage boundaries obvious.</Description>',
    '',
    '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(12, minmax(0, 1fr))\', gap: 16, marginTop: 24 }}>',
    '  <section style={{ gridColumn: \'span 7\', padding: 24, borderRadius: 28, background: \'#fafaf9\', border: \'1px solid #d6d3d1\' }}>',
    '    <h1 style={{ marginTop: 0, marginBottom: 12 }}>Design the rules before the pages design themselves.</h1>',
    '    <p style={{ margin: 0 }}>Use the largest text role for a front door, hero, or major section opener. If a routine settings card needs this much size, the system is over-signaling.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 5\', padding: 24, borderRadius: 28, background: \'#f5f3ff\', border: \'1px solid #c4b5fd\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Hierarchy Rules</h2>',
    '    <p>Size, weight, and spacing establish hierarchy first. Use color emphasis only after the text roles already read correctly in grayscale.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#f8fafc\', border: \'1px solid #cbd5e1\' }}>',
    '    <h3 style={{ marginTop: 0 }}>H1-H3</h3>',
    '    <p>Use headings for page, section, and module structure. Avoid skipping levels because a visual size feels convenient.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#eef2ff\', border: \'1px solid #a5b4fc\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Body</h3>',
    '    <p>Use for guideline copy, helper text, and long-form explanation. Body styles optimize sustained reading, not marketing drama.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#fff7ed\', border: \'1px solid #fdba74\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Label and Meta</h3>',
    '    <p>Use labels for controls and compact UI context. Use meta text for timestamps and annotations that must stay secondary.</p>',
    '  </section>',
    '</div>'
  ].join('\n')
}

function buildSpacingMdx() {
  return [
    "import { Meta, Title, Subtitle, Description } from '@storybook/blocks'",
    '',
    '<Meta title="Foundations/Spacing" parameters={{ layout: \'fullscreen\' }} />',
    '',
    '<Title>Spacing Foundation</Title>',
    '<Subtitle>Rhythm, density, and layout separation.</Subtitle>',
    '<Description>Translate `design/foundations/spacing.md` into a layout-first page that shows which spacing bands are safe defaults for new work.</Description>',
    '',
    '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(12, minmax(0, 1fr))\', gap: 16, marginTop: 24 }}>',
    '  <section style={{ gridColumn: \'span 6\', padding: 24, borderRadius: 28, background: \'#f0fdf4\', border: \'1px solid #86efac\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Compact to Spacious</h2>',
    '    <p>Document the spacing system as bands, not isolated numbers. Teams remember `compact`, `base`, and `spacious` more reliably than raw pixel tables.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 6\', padding: 24, borderRadius: 28, background: \'#ecfeff\', border: \'1px solid #67e8f9\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Density Modes</h2>',
    '    <p>Explain when the product is allowed to compress: mobile constraints, data-heavy screens, or utility views. Compression should happen by band, not random exception.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#f8fafc\', border: \'1px solid #cbd5e1\' }}>',
    '    <h3 style={{ marginTop: 0 }}>`xs-sm`</h3>',
    '    <p>Internal gaps: icon-label pairs, helper text offsets, pill padding, or tightly grouped metadata.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#fefce8\', border: \'1px solid #fde047\' }}>',
    '    <h3 style={{ marginTop: 0 }}>`md`</h3>',
    '    <p>Default component padding and the most common gap between sibling elements inside cards, forms, and list items.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 20, borderRadius: 24, background: \'#fff7ed\', border: \'1px solid #fdba74\' }}>',
    '    <h3 style={{ marginTop: 0 }}>`lg-xl+`</h3>',
    '    <p>Section gaps, panel spacing, and page gutters. Use these steps to signal structural change, not to patch weak composition.</p>',
    '  </section>',
    '</div>'
  ].join('\n')
}

function buildCornerMdx() {
  return [
    "import { Meta, Title, Subtitle, Description } from '@storybook/blocks'",
    '',
    '<Meta title="Foundations/Corner" parameters={{ layout: \'fullscreen\' }} />',
    '',
    '<Title>Corner Foundation</Title>',
    '<Subtitle>Shape language from crisp utility to expressive brand moments.</Subtitle>',
    '<Description>Use this page to show where the radius system should feel technical, neutral, or soft.</Description>',
    '',
    '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(12, minmax(0, 1fr))\', gap: 16, marginTop: 24 }}>',
    '  <section style={{ gridColumn: \'span 4\', padding: 24, borderRadius: 12, background: \'#f8fafc\', border: \'1px solid #cbd5e1\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Sharp</h2>',
    '    <p>Use for dense, technical, or structured areas like data tables and shells.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 24, borderRadius: 20, background: \'#eef2ff\', border: \'1px solid #a5b4fc\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Subtle</h2>',
    '    <p>Default family for buttons, inputs, cards, and common product surfaces.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 4\', padding: 24, borderRadius: 28, background: \'#fff7ed\', border: \'1px solid #fdba74\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Expressive</h2>',
    '    <p>Reserve for hero cards or branded moments where softness adds meaning.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 12\', padding: 24, borderRadius: 28, background: \'#0f172a\', color: \'#e2e8f0\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Combination Rules</h2>',
    '    <p style={{ marginBottom: 0 }}>Explain how adjacent surfaces should align their corner logic so seams feel intentional instead of accidental.</p>',
    '  </section>',
    '</div>'
  ].join('\n')
}

function buildDesignTokenUsageMdx() {
  return [
    "import { Meta, Title, Subtitle, Description } from '@storybook/blocks'",
    '',
    '<Meta title="Foundations/Design Token Usage" parameters={{ layout: \'fullscreen\' }} />',
    '',
    '<Title>Design Token Usage</Title>',
    '<Subtitle>From extracted values to semantic roles to component implementation.</Subtitle>',
    '<Description>Pair this page with `design/foundations/design-token-usage.md` so designers and engineers see the same source of truth.</Description>',
    '',
    '<div style={{ display: \'grid\', gridTemplateColumns: \'repeat(12, minmax(0, 1fr))\', gap: 16, marginTop: 24 }}>',
    '  <section style={{ gridColumn: \'span 3\', padding: 20, borderRadius: 24, background: \'#f8fafc\', border: \'1px solid #cbd5e1\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Extract</h3>',
    '    <p>Capture the current source values without overfitting component names.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 3\', padding: 20, borderRadius: 24, background: \'#eef2ff\', border: \'1px solid #a5b4fc\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Normalize</h3>',
    '    <p>Map raw values into semantic roles that can survive redesigns.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 3\', padding: 20, borderRadius: 24, background: \'#f0fdf4\', border: \'1px solid #86efac\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Apply</h3>',
    '    <p>Consume semantic tokens in components, layouts, and stories.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 3\', padding: 20, borderRadius: 24, background: \'#fff7ed\', border: \'1px solid #fdba74\' }}>',
    '    <h3 style={{ marginTop: 0 }}>Explain</h3>',
    '    <p>Document naming rules, exceptions, and migration notes here.</p>',
    '  </section>',
    '  <section style={{ gridColumn: \'span 12\', padding: 24, borderRadius: 28, background: \'#111827\', color: \'#f9fafb\' }}>',
    '    <h2 style={{ marginTop: 0 }}>Code Contract</h2>',
    '    <pre style={{ margin: 0, whiteSpace: \'pre-wrap\' }}>{`:root {\n  --sys-color-surface: #ffffff;\n  --sys-space-md: 16px;\n  --sys-radius-md: 12px;\n}`}</pre>',
    '  </section>',
    '</div>'
  ].join('\n')
}

function buildComponentStoryTemplate() {
  return [
    "import type { Meta, StoryObj } from '@storybook/your-framework'",
    "import { ExampleComponent } from './ExampleComponent'",
    '',
    'const meta = {',
    "  title: 'Components/ExampleComponent',",
    '  component: ExampleComponent,',
    "  tags: ['autodocs'],",
    '  parameters: {',
    '    controls: {',
    '      expanded: true,',
    "      sort: 'requiredFirst'",
    '    },',
    '    docs: {',
    '      description: {',
    "        component: 'Explain what this component is for, where it should be used, and which foundation rules matter most.'",
    '      }',
    '    }',
    '  },',
    '  argTypes: {',
    '    variant: {',
    "      description: 'Visual treatment that should map to a documented product role.',",
    "      control: 'inline-radio',",
    "      options: ['primary', 'secondary'],",
    '      table: {',
    "        type: { summary: \"'primary' | 'secondary'\" },",
    "        defaultValue: { summary: 'primary' }",
    '      }',
    '    },',
    '    disabled: {',
    "      description: 'Prevents interaction while preserving layout and label visibility.',",
    "      control: 'boolean',",
    '      table: {',
    "        type: { summary: 'boolean' },",
    "        defaultValue: { summary: 'false' }",
    '      }',
    '    }',
    '  },',
    '  args: {',
    "    variant: 'primary',",
    '    disabled: false',
    '  }',
    '} satisfies Meta<typeof ExampleComponent>',
    '',
    'export default meta',
    '',
    'type Story = StoryObj<typeof meta>',
    '',
    'export const Default: Story = {}',
    '',
    'export const Secondary: Story = {',
    '  args: {',
    "    variant: 'secondary'",
    '  }',
    '}',
    '',
    'export const Disabled: Story = {',
    '  args: {',
    '    disabled: true',
    '  }',
    '}'
  ].join('\n')
}

export function getFoundationGuideEntries(config) {
  return [
    {
      relativePath: 'design/foundations/README.md',
      content: buildFoundationsReadme()
    },
    {
      relativePath: 'design/foundations/design-principles.md',
      content: buildDesignPrinciplesMarkdown()
    },
    {
      relativePath: 'design/foundations/color.md',
      content: buildColorMarkdown()
    },
    {
      relativePath: 'design/foundations/typography.md',
      content: buildTypographyMarkdown()
    },
    {
      relativePath: 'design/foundations/spacing.md',
      content: buildSpacingMarkdown()
    },
    {
      relativePath: 'design/foundations/corner.md',
      content: buildCornerMarkdown()
    },
    {
      relativePath: 'design/foundations/design-token-usage.md',
      content: buildDesignTokenUsageMarkdown()
    },
    {
      relativePath: 'design/foundations/storybook-docs/README.md',
      content: buildStorybookDocsReadme()
    },
    {
      relativePath: 'design/foundations/storybook-docs/overview.mdx',
      content: buildFoundationsOverviewMdx()
    },
    {
      relativePath: 'design/foundations/storybook-docs/guides.mdx',
      content: buildGuidesMdx()
    },
    {
      relativePath: 'design/foundations/storybook-docs/color.mdx',
      content: buildColorMdx()
    },
    {
      relativePath: 'design/foundations/storybook-docs/typography.mdx',
      content: buildTypographyMdx()
    },
    {
      relativePath: 'design/foundations/storybook-docs/spacing.mdx',
      content: buildSpacingMdx()
    },
    {
      relativePath: 'design/foundations/storybook-docs/corner.mdx',
      content: buildCornerMdx()
    },
    {
      relativePath: 'design/foundations/storybook-docs/design-token-usage.mdx',
      content: buildDesignTokenUsageMdx()
    },
    {
      relativePath: 'design/foundations/storybook-docs/component-story-template.tsx.txt',
      content: buildComponentStoryTemplate()
    },
    {
      relativePath: 'src/stories/foundations/README.md',
      content: buildStorybookFoundationsReadme()
    },
    {
      relativePath: 'src/stories/foundations/overview.mdx',
      content: buildFoundationsOverviewMdx()
    },
    {
      relativePath: 'src/stories/foundations/guides.mdx',
      content: buildGuidesMdx()
    },
    {
      relativePath: 'src/stories/foundations/color.mdx',
      content: buildColorMdx()
    },
    {
      relativePath: 'src/stories/foundations/typography.mdx',
      content: buildTypographyMdx()
    },
    {
      relativePath: 'src/stories/foundations/spacing.mdx',
      content: buildSpacingMdx()
    },
    {
      relativePath: 'src/stories/foundations/corner.mdx',
      content: buildCornerMdx()
    },
    {
      relativePath: 'src/stories/foundations/design-token-usage.mdx',
      content: buildDesignTokenUsageMdx()
    }
  ]
}
