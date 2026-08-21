## ADDED Requirements

### Requirement: Generated Project Configuration

The template SHALL provide an initialization command that generates a typed project configuration for a new Storybook design-system project.

#### Scenario: Initialize a new project

- **WHEN** an operator runs npm run init-template with project name Design Lab and prefix acme
- **THEN** the command creates or updates .storybook/project.config.ts with projectName set to Design Lab and tokenPrefix set to acme

#### Scenario: Initialize with Figma source

- **WHEN** an operator runs npm run init-template with project name Design Lab, prefix acme, and a Figma design URL
- **THEN** the generated project configuration stores the Figma design URL as the design-system source fallback used by Storybook export review

### Requirement: Token Prefix Validation

The initialization command MUST validate token prefixes before writing project configuration or generated token files.

#### Scenario: Accept valid prefix

- **WHEN** an operator initializes with prefix acme-ds1
- **THEN** the command accepts the prefix and generated token names use --acme-ds1-ref-*, --acme-ds1-sys-*, and --acme-ds1-comp-* patterns

#### Scenario: Reject invalid prefix

- **WHEN** an operator initializes with prefix Cm_DS
- **THEN** the command exits non-zero and reports that prefixes must start with a lowercase ASCII letter and contain only lowercase ASCII letters, digits, and single hyphens

##### Example: prefix validation

| Input | Expected Output | Notes |
| ----- | --------------- | ----- |
| acme | accepted | simple project prefix |
| acme-ds1 | accepted | digits and a single hyphen are valid |
| cm- | rejected | trailing hyphen is invalid |
| cm--lab | rejected | consecutive hyphens are invalid |
| Cm_DS | rejected | uppercase and underscore are invalid |

### Requirement: Project Config As Source Of Truth

Storybook runtime configuration, Figma export configuration, token checks, catalog checks, and prototype inspector settings SHALL read project-specific values from the generated project configuration instead of hardcoded project identifiers.

#### Scenario: Storybook reads generated config

- **WHEN** project configuration sets tokenPrefix to acme and componentClassPrefixes to acme-
- **THEN** Storybook preview and Figma export use acme token and class settings without requiring cm values

#### Scenario: Review middleware reads generated config

- **WHEN** project configuration sets review apiPath to /__acme_figma_review_status and statusFilePath to design-system/figma-export-review-status.json
- **THEN** Storybook main configuration registers the review middleware with those exact values

### Requirement: Generic Figma Importer Plugin

The local Figma importer plugin SHALL use importer code generated from the Storybook Figma export addon and SHALL remain project-neutral.

#### Scenario: Importer is generated from addon code

- **WHEN** the template Figma plugin main file is generated
- **THEN** scripts/build-figma-plugin.mjs imports @harrychuang/storybook-addon-figma-export/plugin-code and writes figma/storybook-code-to-design/main.js from createFigmaImporterPluginMainCode
- **AND** npm run check:figma-plugin fails if the checked-in main.js differs from the addon-generated output

#### Scenario: Importer remains project-neutral

- **WHEN** a Storybook Figma export payload from a generated project is imported into Figma
- **THEN** the plugin reads token collections, plugin data keys, component metadata, and page artifact metadata from the payload instead of assuming a fixed token prefix, component class prefix, story id, or domain

#### Scenario: Importer uses Figma runtime-compatible syntax

- **WHEN** figma/storybook-code-to-design/main.js is generated
- **THEN** the generated plugin runtime is valid JavaScript and contains no optional chaining, nullish coalescing, or optional catch binding syntax
- **AND** npm run check:figma-plugin fails if the generated runtime would include unsupported syntax

### Requirement: Prefix-Agnostic Token Inheritance Check

The token inheritance check SHALL validate ref, sys, and comp tokens using the configured token prefix.

#### Scenario: Validate configured token layers

- **WHEN** tokenPrefix is acme and tokens/tokens-sys.css declares --acme-sys-color-background: var(--acme-ref-color-neutral-0)
- **THEN** the token check accepts the sys token because it references the configured ref layer

#### Scenario: Reject cross-layer violation

- **WHEN** tokenPrefix is acme and tokens/tokens-comp.css declares --acme-comp-button-color: var(--acme-ref-color-neutral-0)
- **THEN** the token check exits non-zero and reports that a comp token referenced ref instead of sys

### Requirement: Template Core Identifier Neutrality

Template core files SHALL NOT require cm, ChipK, or inventory-prototype identifiers for runtime, build, check, or initialization behavior.

#### Scenario: Core files contain no required legacy identifiers

- **WHEN** an initialized template project is inspected after setup
- **THEN** runtime configuration, check scripts, and prototype inspector behavior execute without cm, ChipK, or inventory-prototype strings outside sample/reference content or migration documentation

### Requirement: Default Template Surface

A newly initialized project SHALL expose neutral starter content by default and SHALL NOT load ChipK domain-specific stories as the default Storybook surface.

#### Scenario: Default Storybook content after initialization

- **WHEN** an operator initializes a new project with prefix acme and starts Storybook
- **THEN** the default navigation contains generic governance, foundation, component starter, and example prototype stories instead of ChipK stock, inventory, broker, or portfolio stories

#### Scenario: Template source excludes legacy executable components

- **WHEN** the template source is inspected after generalization
- **THEN** src/components contains the neutral starter component example-card and no ChipK domain component source directories
- **AND** src/pages contains only neutral prototype infrastructure and example prototype source, with no inventory page or inventory prototype executable source
