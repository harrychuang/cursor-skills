## Purpose

Keep figma-m3-variables easy for agents to route and easy for designers to read by defining its intent routing, shared procedures, reference file layout, host-agnostic questions, trigger description, and a Traditional Chinese documentation page that stays in sync with the skill.

## ADDED Requirements

### Requirement: Intent routing table

SKILL.md SHALL present a routing table before the workflow sections that maps user intents to Workflows A to F and to an inventory-only path. The routing notes SHALL state that missing tokens discovered in Workflow A or Workflow E route to Workflow F unless the user wants a new token system, and that converting raw UI layers into components belongs to the `figma-componentize` skill, which calls Workflow F for its token step.

#### Scenario: Agent routes a tokenization request

- **WHEN** a designer shares a section URL and asks to turn its hardcoded styles into tokens
- **THEN** the routing table directs the agent to Workflow F

##### Example: Routing outcomes

| User intent | Workflow |
| --- | --- |
| Apply existing Variables to one node or the current selection | A |
| Create a new token system for a file that has none | B |
| Check naming, alias chains, scopes, or token coverage | C |
| Build a new component from existing tokens | D |
| Apply existing Variables to a page, many components, or component sets | E |
| Turn hardcoded values in an existing design into tokens | F |
| Ask which tokens exist without changing anything | Inventory only |

### Requirement: Shared procedures are defined once

SKILL.md SHALL define guideline discovery, token inventory, target anatomy inspection, binding, and validation as named shared procedures. Workflows SHALL reference these procedures by name instead of restating their steps or pointing at a step inside another workflow.

#### Scenario: Workflow B needs guideline discovery

- **WHEN** an agent follows Workflow B
- **THEN** its first step references the guideline discovery shared procedure rather than a step of Workflow D

### Requirement: Reference files have single responsibilities

The skill SHALL keep naming rules and token vocabularies in the token spec reference, Workflow F details in the value harvest reference, Plugin API scripts in the binding recipes reference, and audit rules in the audit rules reference. SKILL.md SHALL NOT embed any script longer than 15 lines. Every reference file and section that SKILL.md cites SHALL exist.

#### Scenario: Agent needs the binding code for typography

- **WHEN** SKILL.md instructs the agent to bind typography in Styles mode
- **THEN** it cites the binding recipes reference section that contains the Text Style script
- **AND** that section exists in the binding recipes reference

### Requirement: Questions work in any host

The skill SHALL instruct agents to ask questions with the host's structured question tool, naming `AskQuestion` for Cursor and `AskUserQuestion` for Claude Code, and SHALL instruct agents without such a tool to ask in plain text and wait for the answer before any write.

#### Scenario: Host without a question tool

- **WHEN** the agent runs in a host that has no structured question tool and needs the token prefix
- **THEN** the agent asks for the prefix in plain text and performs no write until the user answers

### Requirement: Trigger description covers the upgraded scope

The SKILL.md frontmatter description SHALL mention tokenizing hardcoded values, typography, elevation, stroke width, opacity, and token coverage audits, SHALL include Traditional Chinese trigger phrases, and SHALL stay within 1024 characters.

#### Scenario: Designer asks in Traditional Chinese

- **WHEN** a designer writes 「幫我把這個 section 寫死的顏色和字級 token 化」
- **THEN** the description contains trigger phrases that match this request to figma-m3-variables

### Requirement: Documentation page mirrors the skill

The documentation page SHALL present, in Traditional Chinese, the routing table, the change tiers, Workflows A to F, the near-value review board, the token vocabularies including typography and elevation, the state token order, audit rule types 1 to 18, and the skill responsibility matrix including `figma-componentize`. Its footer SHALL list the source files and the generation date.

#### Scenario: Designer reads about Workflow F

- **WHEN** a designer opens the documentation page
- **THEN** the page has a Workflow F entry in the navigation and a section that explains the near-value review board in Traditional Chinese
