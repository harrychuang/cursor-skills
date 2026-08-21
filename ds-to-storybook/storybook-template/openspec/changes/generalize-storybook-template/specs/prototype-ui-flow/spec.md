## ADDED Requirements

### Requirement: Prototype Metadata Contract

The template SHALL define parameters.prototype as the portable metadata contract for product prototypes.

#### Scenario: Story exposes prototype metadata

- **WHEN** a Storybook story defines parameters.prototype with id, title, description, docs, flow, and data
- **THEN** the prototype inspector reads that metadata without requiring project-specific component names or token prefixes

#### Scenario: Missing prototype metadata

- **WHEN** a Storybook story does not define parameters.prototype
- **THEN** Story mode renders the original story and prototype-specific review modes display no prototype surface

### Requirement: Prototype Review Modes

The prototype inspector SHALL provide Story, Docs, UI Flow, and Data modes for stories that expose parameters.prototype.

#### Scenario: Story mode

- **WHEN** the prototype toolbar is set to Story
- **THEN** the original story renders without prototype inspector replacement content

#### Scenario: Docs mode

- **WHEN** the prototype toolbar is set to Docs and parameters.prototype.docs contains PRD, UI Spec, Flow Spec, Data Spec, Acceptance, and Implementation Guide markdown
- **THEN** the inspector renders document tabs for each available document and displays the selected markdown document

#### Scenario: Data mode

- **WHEN** the prototype toolbar is set to Data and parameters.prototype.data contains overview, apiContracts, dataSources, schemas, routeDataRequirements, stateRules, and fixtures
- **THEN** the inspector renders structured data sections plus a raw payload section

### Requirement: UI Flow Canvas

The prototype inspector SHALL render a UI Flow canvas from parameters.prototype.flow routes, nodes, and transitions.

#### Scenario: Render route cards and flow nodes

- **WHEN** flow.routes contains two route records and flow.nodes contains one decision node
- **THEN** UI Flow mode renders two route preview cards and one flow-only node on the canvas

#### Scenario: Render key transition edges

- **WHEN** flow.transitions contains three transitions and two transitions set flowLine to key
- **THEN** UI Flow mode renders visible edges only for the two key transitions and keeps the third transition out of the canvas edge layer

##### Example: key transition filtering

| Transition | flowLine | Visible Edge |
| ---------- | -------- | ------------ |
| overview to detail | key | yes |
| detail to form | key | yes |
| form to detail | reference | no |

### Requirement: UI Flow Layout Persistence

The prototype inspector SHALL support draggable route and node positions, fit/manual zoom, layout export, and layout import using a generic schema.

#### Scenario: Export layout

- **WHEN** a reviewer drags a route card and clicks Export Layout
- **THEN** the downloaded JSON contains schema, version, prototypeId, exportedAt, and positions fields

#### Scenario: Import matching layout

- **WHEN** a reviewer imports a layout JSON whose positions match route or node ids in the current prototype
- **THEN** UI Flow mode applies the imported positions to the matching canvas items

#### Scenario: Reject non-matching layout

- **WHEN** a reviewer imports a layout JSON with no positions matching the current prototype routes or nodes
- **THEN** UI Flow mode keeps the current layout and reports that no matching UI Flow positions were found

### Requirement: Route Preview Measurement

The prototype inspector SHALL measure iframe route previews through generic prototype preview markers and Storybook fallbacks, not through project-specific component selectors.

#### Scenario: Route preview opts into measurement

- **WHEN** a route iframe contains an element with data-prototype-route-preview set to true
- **THEN** UI Flow mode uses that element width and height as the route preview size

#### Scenario: Route preview has no marker

- **WHEN** a route iframe has no data-prototype-route-preview marker
- **THEN** UI Flow mode measures the Storybook root or document body width and height without querying inventory-prototype selectors

### Requirement: Static Flow Export

A prototype SHALL be able to expose a sibling static flow story for Figma export when its metadata includes a flow export story id.

#### Scenario: Open static flow story

- **WHEN** parameters.prototype includes a flow export story id and the reviewer clicks Open Static Flow
- **THEN** Storybook opens the sibling static flow story with Figma export enabled and prototype mode set to Story

#### Scenario: No static flow story

- **WHEN** parameters.prototype has no flow export story id
- **THEN** UI Flow mode omits the Open Static Flow control

#### Scenario: Static flow uses saved UI Flow layout

- **WHEN** a reviewer drags route cards or flow nodes in UI Flow and opens the sibling Static Flow story on the same origin
- **THEN** Static Flow reads the generic `prototype-inspector:flow-layout:<prototype id>` positions before falling back to metadata positions

#### Scenario: Static flow matches route preview sizing

- **WHEN** a static flow route card renders the same route UI used by UI Flow iframe previews
- **THEN** the static preview reserves the same route UI width and height, with headers and borders treated as outer chrome

#### Scenario: Static flow matches UI Flow visual conventions

- **WHEN** the sibling Static Flow story renders route cards, flow-only nodes, visible edges, arrows, and edge labels
- **THEN** it uses the same canvas background, route card chrome, flow-node shape rules, dashed orthogonal edge style, color variants, arrowheads, and label pill conventions as UI Flow mode

### Requirement: Neutral Example Prototype

The template SHALL include one neutral example prototype that demonstrates the complete Prototype UI Flow contract without ChipK domain language.

#### Scenario: Example prototype covers required artifacts

- **WHEN** the initialized template is inspected
- **THEN** src/pages/prototypes/example-prototype contains an interactive story, static flow export story, flow metadata, fixture data, prototype meta object, scoped CSS, PRD, UI Spec, Flow Spec, Data Spec, Acceptance, and Implementation Guide

#### Scenario: Example prototype verifies all review modes

- **WHEN** the example prototype story is opened in Storybook
- **THEN** Story, Docs, UI Flow, and Data modes each render meaningful content from the example prototype metadata
