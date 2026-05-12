## ADDED Requirements

### Requirement: Foundation guides define the documentation architecture

The workspace SHALL provide a documentation architecture guide for Storybook that defines the primary design-system navigation groups and the standard sections required on component documentation pages.

#### Scenario: Storybook guide page defines the docs map

- **WHEN** a user opens the foundations guides template
- **THEN** the page describes the default navigation map with `Foundations`, `Styles`, and `Components`
- **AND** the page describes optional supporting groups such as patterns, templates, or resources

#### Scenario: Storybook guide page defines the component docs sections

- **WHEN** a user reads the foundations guides template
- **THEN** the page lists `Overview`, `Anatomy`, `States`, `Usage`, and `Tokens` as the standard component documentation sections
- **AND** each section includes a short explanation of the expected content

### Requirement: Foundation guides provide usage-first color, typography, and spacing guidance

The workspace SHALL provide foundation templates that explain when semantic colors, type roles, and spacing steps are used, not only which tokens exist.

#### Scenario: Color guidance explains semantic usage

- **WHEN** a user reads the color foundation template
- **THEN** the page explains when to use semantic roles such as primary, primary container, surface, and error
- **AND** the page distinguishes default semantic usage from component-level exceptions

##### Example: semantic roles are explained with concrete UI moments

| Role | Expected guidance |
| ---- | ----------------- |
| Primary | Main CTA, selected navigation, or strongest interactive emphasis |
| Primary Container | Large highlighted surfaces such as key summary cards or hero callouts |
| Surface | Default page and card backgrounds where content recedes behind hierarchy |
| Error | Validation errors, destructive alerts, and critical inline feedback only |

#### Scenario: Typography guidance explains role-based application

- **WHEN** a user reads the typography foundation template
- **THEN** the page explains where display, heading, body, and label roles belong
- **AND** the page states that hierarchy SHALL be established through size, weight, and spacing before extra color emphasis

##### Example: typography roles map to common documentation content

| Role | Expected usage |
| ---- | -------------- |
| Display | Landing page hero or major section opener |
| Heading | Section titles and card headings |
| Body | Paragraphs, guidelines, and explanatory copy |
| Label | Form labels, chips, key-value metadata, or compact UI text |

#### Scenario: Spacing guidance explains rhythm bands

- **WHEN** a user reads the spacing foundation template
- **THEN** the page explains compact, base, and spacious spacing bands
- **AND** the page maps those bands to typical uses such as internal gaps, component padding, section separation, and page gutters

##### Example: spacing bands map to layout intent

| Band | Expected usage |
| ---- | -------------- |
| Compact | icon and label gaps, segmented controls, small badges |
| Base | card padding, list row spacing, input padding |
| Spacious | section gaps, page gutters, panel-to-panel separation |

### Requirement: Foundation guides are reflected in workflow and generated workspace output

The workspace workflow and generated foundation files SHALL both require documentation architecture planning before reusable component documentation is expanded.

#### Scenario: Workflow instructions require docs planning first

- **WHEN** a user reads the kickstart, build plan, or tasks guidance
- **THEN** the workflow tells the user to define documentation IA and foundation usage rules before detailed component work

##### Example: workflow sequence is explicit

- **GIVEN** the workspace `start-here` documents
- **WHEN** the user scans the design-system setup steps
- **THEN** docs IA and foundation usage guidance appear before component-level Storybook work

#### Scenario: Generated workspace includes the guides template

- **WHEN** the workspace generator enumerates required foundation files
- **THEN** it includes the Storybook guides template alongside overview and other foundation docs
- **AND** the generated workspace entries include the same guides template content

##### Example: guides template is present in both lists

- **GIVEN** the generated foundation file inventory
- **WHEN** the user checks required paths and generated entries
- **THEN** `design/foundations/storybook-docs/guides.mdx` appears in both places
