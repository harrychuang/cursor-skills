## Purpose

Let a designer opt in to a generated design system document inside the Figma file: one page that shows every local token and every local component of the file from facts only, with samples bound to the tokens, produced as the last optional step of figma-componentize or on its own, without creating or changing any token, style, component, or existing layer.

## ADDED Requirements

### Requirement: Opt-in question before detection

After the scope is confirmed and before detection starts, the skill SHALL ask the designer whether a design system document is to be generated at the end, with the options "yes" and "no". The answer SHALL be recorded in the ledger. When the answer is "no", the skill SHALL NOT inventory, write, or report anything for the document and SHALL NOT ask again during that run. When the answer is "yes", the componentization plan SHALL list the document step in its Tier 2 summary, and the document SHALL be generated even when the designer later declines the token step or answers "not now" to the replacement.

#### Scenario: Designer declines the document

- **WHEN** the designer answers "no" to the document question
- **THEN** the run proceeds exactly as it does without the document feature, no page, Section, or frame is added for a document, and the report has no document part

#### Scenario: Designer accepts, then postpones replacement

- **WHEN** the designer answers "yes" to the document question and later answers "not now" to the replacement confirmation
- **THEN** the originals stay untouched and the design system document is still generated from the components and tokens in the file

### Requirement: Document language question

After the designer answers "yes" to the document question, and at the start of a document-only run before the inventory, the skill SHALL ask which language the document's headings and labels use, offering **English** (the default), **繁體中文**, and another language the designer names. When the designer states no preference, the document SHALL be in English. The question SHALL be asked in every run that generates the document, and the answer and the font SHALL be recorded in the ledger. Only text the skill itself produces SHALL follow the chosen language: section headings, field labels, the header notes, the link text, and notes such as "and N more". Token, collection, and mode names and values, component, variant, and property names and values, and the text of the component description field SHALL be shown exactly as they are in the file and SHALL NOT be translated. Layer names — the root frame name `Design System — generated`, section names starting with `DS / `, and item names — and the page or Section name `Design System` SHALL stay in English in every language, because generated content is recognised by them. All labels SHALL come from one table of label keys, with English and Traditional Chinese texts provided; for another language the same keys SHALL be translated before the first write, and the scripts SHALL contain no heading or label text of their own.

The document font SHALL follow the language: Inter for English and other languages written in Latin, Cyrillic, or Greek script; Noto Sans TC for Traditional Chinese; Noto Sans SC for Simplified Chinese; Noto Sans JP for Japanese; Noto Sans KR for Korean; and a font the designer names for any other script. Before the first write the skill SHALL check, without writing anything, that the font can be loaded. When it cannot, the skill SHALL write nothing and SHALL ask the designer to choose: English headings with the default font, another font, or skipping the document. Text taken from the file that contains characters the document font lacks SHALL be set in a font that covers them when one can be loaded (Noto Sans JP when it contains kana, Noto Sans KR when it contains hangul, otherwise Noto Sans TC for Han characters); when none can be loaded, the text SHALL still be written in the document font and the item SHALL be listed in the report.

#### Scenario: Designer chooses Traditional Chinese

- **WHEN** the designer answers "yes" to the document question and then chooses 繁體中文
- **THEN** the section headings and field labels of the document are in Traditional Chinese, set in Noto Sans TC, while token names, component names, values, and the component descriptions appear exactly as in the file, and the root frame is still named `Design System — generated`

#### Scenario: Designer has no preference

- **WHEN** the designer answers the language question with "default"
- **THEN** the document's headings and labels are in English, set in Inter

#### Scenario: Font for the chosen language cannot be loaded

- **WHEN** the designer chose 繁體中文 and Noto Sans TC cannot be loaded
- **THEN** nothing is written, and the designer is asked to choose English headings with the default font, another font, or skipping the document

#### Scenario: Chinese description in an English document

- **WHEN** the document language is English and the component `Card` has the description "用於資訊摘要"
- **THEN** the labels of the `Card` section are in English, and the description shows "用於資訊摘要" unchanged, set in Noto Sans TC

##### Example: What follows the chosen language

| Text in the document | English | 繁體中文 |
| --- | --- | --- |
| Section heading for color tokens | Color | 顏色 |
| Field label for component properties | Properties | 屬性 |
| Token name `sys/color/primary` | `sys/color/primary` | `sys/color/primary` |
| Component name `Button` and variant `Style=Filled` | unchanged | unchanged |
| Description "Primary actions. One per view." | unchanged | unchanged |
| Layer name of the color section `DS / Color / Brand · System` | unchanged | unchanged |
| Root frame name `Design System — generated` | unchanged | unchanged |

##### Example: Document font by language

| Language | Document font |
| --- | --- |
| English | Inter |
| Français | Inter |
| 繁體中文 | Noto Sans TC |
| 简体中文 | Noto Sans SC |
| 日本語 | Noto Sans JP |
| 한국어 | Noto Sans KR |

### Requirement: Document-only run

When the designer asks only for the design system document to be generated or updated, the skill SHALL skip detection, grouping review, build, tokens, replacement, and verification. It SHALL check that a write-capable `use_figma` tool and the `figma-use` skill are available (figma-m3-variables Workflow F SHALL NOT be required), SHALL ask the designer to save a restore point and wait for the answer, SHALL then run the document step, and SHALL report. The request itself SHALL count as the opt-in, so the document question is not asked; the language question SHALL still be asked.

#### Scenario: Designer asks only for the document

- **WHEN** the designer writes "generate the design system document for this file" and shares no scope to componentize
- **THEN** the skill asks for the document language and for a restore point, inventories the file's tokens and components, generates the document, and creates no component and replaces no layer

### Requirement: Document page selection

The skill SHALL place the document on an existing page whose name, ignoring case, emoji, and other prefixes, contains "design system" or "設計系統"; when no such page exists, on an existing page whose name contains "foundation". When several pages qualify, the first in page order within the higher-priority rule SHALL be used. When no page qualifies, the skill SHALL create a page named `Design System` at the end of the page list as a Tier 2 change. When page creation fails with the plan's page-limit error, the skill SHALL ask the designer which existing page is to hold a Section named `Design System`, and SHALL write nothing for the document until the designer answers. When page creation fails for any other reason, the skill SHALL stop the document step, report the error, and leave the results of the earlier steps as they are.

#### Scenario: File without a design system page

- **WHEN** the file's pages are "Cover", "Components", and "Home", and page creation succeeds
- **THEN** a page named `Design System` is added after "Home" and the document is generated there

#### Scenario: Starter file with three pages

- **WHEN** the file already has three pages, none of which qualifies, and page creation fails with the page-limit error
- **THEN** the skill asks which page is to hold the `Design System` Section and writes nothing for the document until the designer answers

##### Example: Page selection

| Existing pages (in order) | Page creation | Outcome |
| --- | --- | --- |
| Cover, Components, Home | succeeds | New page `Design System`, last in the list |
| Cover, 🎨 Design System, Components | not attempted | Uses "🎨 Design System" |
| Foundations, Components | not attempted | Uses "Foundations" |
| 設計系統, Components | not attempted | Uses "設計系統" |
| Foundations, Design System Document, Components | not attempted | Uses "Design System Document" ("design system" has priority over "foundation") |
| Home, Components, Archive | page-limit error | Asks for a page; a Section `Design System` is created on the chosen page |

### Requirement: Generated root frame and section naming

All generated content SHALL live inside one frame named exactly `Design System — generated`: 1440 px wide, vertical auto layout, 80 px padding, 80 px between sections, with a white fill. On a new page the frame SHALL be placed at the origin; on an existing page or inside the fallback Section it SHALL be placed 400 px to the right of the rightmost existing node, and the skill SHALL NOT move, rename, restyle, or delete any existing node. The frame SHALL start with a header that shows the file name, the generation date, the counts of tokens and components, and a note that token changes require regenerating and that the designer's own notes belong outside the frame or in the component description field. Every direct child section SHALL have a name that starts with `DS / `, and every item inside a section SHALL carry the ID of its source variable, style, or component in its name. These names SHALL be the only way generated content is recognised.

#### Scenario: Existing page with the designer's content

- **WHEN** the page "Foundations" already holds the designer's own frames
- **THEN** `Design System — generated` is placed 400 px to the right of the rightmost of them, and those frames keep their position, size, name, and content

### Requirement: Complete inventory before writing

Before any write for the document, the skill SHALL take a read-only inventory of the whole file: every local variable collection with its modes and its variables (name, type, scopes, and the value or alias target per mode), every local Text Style, Effect Style, and Paint Style, and, one page per `use_figma` call, every local component set and standalone component (name, page, number of variants, and whether it is an icon). A component SHALL be classified as an icon when every variant is at most 48 px wide and 48 px tall and is either square (width and height differ by less than 1 px) or has a name containing "icon". Components located inside a frame named `Design System — generated` SHALL NOT be listed. Every inventory result SHALL be paged within 18,000 characters and SHALL report `nextOffset` until it is `null`. When the file has neither tokens nor components, the skill SHALL create nothing and SHALL report that there is nothing to document; when it has only one of the two, the other part of the document SHALL be omitted and the report SHALL say so.

#### Scenario: Components on several pages

- **WHEN** local components exist on the pages "Components" and "Home"
- **THEN** the inventory lists the components of both pages, each with its page name, from one call per page

#### Scenario: File with tokens but no components

- **WHEN** the file has 120 variables and no local component
- **THEN** the document has the Foundations sections only, and the report states that there were no components to document

##### Example: Inventory classification

| Node | Listed as |
| --- | --- |
| Component set `Button`, variants 96 × 40 | Component (set), `icon` false |
| Component `Icon/Star`, 24 × 24 | Icon |
| Component `Avatar`, 40 × 40 | Icon (square, not larger than 48 px) |
| Component set `Badge`, variants 32 × 20 and 44 × 20 | Component (set), `icon` false (not square, name has no "icon") |
| Component `icon-button`, 56 × 56 | Component, `icon` false (larger than 48 px) |
| Component placed inside `Design System — generated` | Not listed |

### Requirement: Scale confirmation

After the inventory the skill SHALL tell the designer the number of tokens, styles, components, and icons and the estimated number of write calls. When the tokens (variables plus styles) exceed 300, the non-icon components exceed 40, or the estimated write calls exceed 60, the skill SHALL ask before writing, offering: generate everything, generate the Foundations only, generate the Components only, or skip the document. When none of the thresholds is exceeded, the skill SHALL proceed without this question.

#### Scenario: Large library

- **WHEN** the inventory finds 520 variables and 75 non-icon components
- **THEN** the skill reports the counts and the estimated number of write calls and asks which of the four options the designer wants before writing anything

#### Scenario: Small file

- **WHEN** the inventory finds 60 variables, 4 Text Styles, and 6 components
- **THEN** the skill reports the counts and proceeds to generate the whole document without the scale question

### Requirement: Foundations samples bound to tokens

The Foundations part SHALL show every local token of the inventory, grouped by collection and by the token's group path, without reclassifying the file's own layers. Each color variable SHALL be shown as a swatch whose fill is bound to that variable; when its collection has more than one mode, the swatch SHALL have one cell per mode, each rendered with that mode set explicitly, for at most four modes, with a note when there are more. Each Paint Style SHALL be shown as a swatch that uses the style. Each Text Style SHALL be shown as a text sample that uses the style, with its font, size, and line height. Number variables whose scopes include gap or width and height SHALL be shown as a bar whose width is bound to the variable when the value is at most 640, and as a name and value otherwise; number variables scoped to corner radius SHALL be shown as a shape whose corner radius is bound to the variable; each Effect Style SHALL be shown as a card that uses the style; all remaining variables SHALL be listed with name and value. Next to every sample the skill SHALL show the token name, the value per mode at generation time, and the alias target's name when the variable is an alias. The skill SHALL NOT fill a sample with a hardcoded value in place of a binding. A single item that fails (a font that cannot be loaded, a variable that cannot be bound, a style that cannot be applied) SHALL be skipped and recorded with its reason, and the rest of the section SHALL still be built; a Text Style whose font cannot be loaded SHALL be listed with its name and specifications in the document font.

#### Scenario: Semantic color with light and dark modes

- **WHEN** the collection "Brand · System" has the modes Light and Dark and the color variable `sys/color/primary` aliases `ref/primary/40` in Light and `ref/primary/80` in Dark
- **THEN** its swatch has two cells bound to `sys/color/primary`, one rendered in Light and one in Dark, and the text beside it shows both resolved values and both alias targets

#### Scenario: Text Style with an unavailable font

- **WHEN** the Text Style "Display/Large" uses the font "Brand Sans Bold", which cannot be loaded
- **THEN** the style is listed with its name, font, size, and line height in the document font, it appears in the skipped list with the reason, and the other Text Styles are shown as samples

### Requirement: Component sections show facts only

For every non-icon component set and standalone component of the inventory, the document SHALL have one section that shows: the name, the kind, the number of variants, and the page; the text of the component's description field, omitted entirely when that field is empty; a line that links to the main component; one instance per variant with the variant name, for at most 30 variants, with the total when there are more; the component properties with name, type, default value, and options; and the names of the variables and styles bound on the main component (the default variant for a set), without duplicates, for at most 40 names, with the total. Samples of components SHALL be instances; the skill SHALL NOT clone a main component or a component set. The skill SHALL NOT write usage guidance, descriptions, or recommendations of its own. When the fonts of a component cannot be loaded, its section SHALL show the text information without instances and the component SHALL be recorded as skipped with the reason.

#### Scenario: Component with a description

- **WHEN** the component set `Button` has the description "Primary actions. One per view." and the variants `Style=Filled` and `Style=Outlined`
- **THEN** its section shows that description text, two labelled instances, the property list, the bound token names, and a link to the `Button` set

#### Scenario: Component without a description

- **WHEN** the component `Card` has an empty description field
- **THEN** its section has no description line and no text about how or when to use the component

### Requirement: Icon components are shown as a grid

Components classified as icons SHALL NOT get their own sections. They SHALL be shown together in one section as a grid of instances, each with the component name.

#### Scenario: Icon library in the file

- **WHEN** the file has 180 icon components and 12 other components
- **THEN** the document has one icon grid with 180 named instances and 12 component sections

### Requirement: Batched and resumable writes

The document SHALL be written in batches, one `use_figma` call per batch: at most 20 tokens or styles, at most 40 icons, or one component section; the first call creates the root frame and its header. Before adding an item, the script SHALL check whether an item with the same name already exists in the section and SHALL skip it when it does, so that running a batch twice adds nothing. Every call SHALL return only IDs, counts, and skipped items with reasons, within 18,000 characters. The ledger SHALL record the designer's answers (whether to generate, the language, and the font), the page and root frame IDs, each section's status, item count, and next offset, the skipped items, and the inventory counts. After a failed call or a timeout, the skill SHALL read the ledger and the root frame and SHALL then continue with only the batches that are not complete; when timeouts repeat, it SHALL halve the batch size.

#### Scenario: A batch is run twice

- **WHEN** a call that adds 20 color swatches times out after the swatches were created, and the same batch is run again
- **THEN** the section still has 20 swatches and the second call reports 0 added and 20 existing

#### Scenario: Collection with 45 colors

- **WHEN** a collection has 45 color variables
- **THEN** its section is filled by three calls of 20, 20, and 5 items, and the ledger shows the section as complete after the third

### Requirement: Replacing an existing generated document

When the document page already holds a frame named `Design System — generated`, the skill SHALL ask before generating: replace it, keep it and generate a new one beside it, or skip the document. Replacing SHALL be a Tier 3 change that is confirmed every time, with the statement that changes made inside the old frame will be lost, and no blanket auto-apply instruction SHALL waive it. To replace, the skill SHALL first build and verify the new frame beside the old one, and only then delete the old frame and move the new frame to the old frame's position; when the new frame cannot be completed, the skill SHALL keep the old frame, remove the incomplete new frame, and report the reason. When several frames with that name exist, the skill SHALL list them and ask which one to replace. Nodes outside the frame being replaced, and frames the designer renamed, SHALL NOT be changed.

#### Scenario: Designer replaces the old document

- **WHEN** the page holds one `Design System — generated` frame and the designer's own notes frame beside it, and the designer chooses to replace and confirms
- **THEN** the page ends with exactly one `Design System — generated` frame at the old frame's position, and the notes frame keeps its position and content

#### Scenario: New document fails while replacing

- **WHEN** the designer chose to replace and the new frame cannot be completed
- **THEN** the old frame is still on the page unchanged, the incomplete new frame is removed, and the report gives the reason

#### Scenario: Designer renamed the old document

- **WHEN** the only earlier document on the page was renamed by the designer to "DS v1"
- **THEN** no question about replacing is asked, a new `Design System — generated` frame is built beside the existing content, and "DS v1" is unchanged

### Requirement: Additive-only step and verification

Creating the document page or Section, the root frame, and its sections SHALL be a Tier 2 change authorised by the opt-in answer together with the plan confirmation, or by the request itself in a document-only run. The document step SHALL NOT create, edit, or delete any variable, collection, style, or main component, and SHALL NOT change any node outside the frame it generates, except for deleting an earlier generated frame under "Replacing an existing generated document". After generating, the skill SHALL verify that the sections in the root frame match the ledger and that the numbers of local components, variables, Text Styles, Effect Styles, and Paint Styles equal the inventory counts taken before writing; it SHALL report any difference without correcting it, and SHALL capture a screenshot of the root frame and give its link.

#### Scenario: Counts are unchanged

- **WHEN** the inventory counted 34 components, 210 variables, 9 Text Styles, 3 Effect Styles, and 0 Paint Styles before writing
- **THEN** the verification after generating counts the same five numbers, and the report states that the document step created no component, variable, or style

### Requirement: Document step in the plan and report

When the designer opted in, the componentization plan SHALL list the document step with its target page in the Tier 2 summary. The final report SHALL include a design system document part with the links to the page and the root frame, the document language and font, the number of items per section, the skipped items with reasons, the items whose text the available fonts do not cover, whether an earlier document was replaced, and the omitted parts when the file had no tokens or no components.

#### Scenario: Report after a run with the document

- **WHEN** the document was generated with 210 tokens, 12 component sections, 180 icons, and one Text Style skipped for a font that could not be loaded
- **THEN** the report's document part shows the page and frame links, those counts per section, and the skipped Text Style with its reason

### Requirement: Guide and documentation for the document step

SKILL.md SHALL describe the document question and the language question in the first step, the document step after verification and before the report, the document-only run, and the tiers of generating and of replacing a document; SHALL no longer list documentation frames as out of scope; SHALL state that the skill writes no usage guidance of its own; SHALL include trigger phrases for a design system document in English and Traditional Chinese; and SHALL keep its description within 1024 characters, embed no script longer than 15 lines, and cite only reference sections that exist. The inventory, layout, section, batching, replacement, and verification rules and scripts SHALL live in a documentation reference file. The Traditional Chinese documentation page and the README SHALL explain, in terms of what the designer sees, the questions at the start (whether to generate, and in which language), what the document contains, which text follows the chosen language, that descriptions come from the component description field, how to regenerate, and that nothing in the file is changed apart from the added document. The root frame name, the page name, the section prefix, and the option names, including the language options, SHALL be the same in SKILL.md, the reference files, the documentation page, and the README.

#### Scenario: Designer reads about the document

- **WHEN** a designer opens the documentation page
- **THEN** the page has a navigation entry and a section that explains the question at the start, the contents of the document, and how to regenerate it

#### Scenario: Agent looks up the document recipe

- **WHEN** SKILL.md tells the agent to generate the design system document
- **THEN** it cites the documentation reference file and section that contain the scripts, and they exist
