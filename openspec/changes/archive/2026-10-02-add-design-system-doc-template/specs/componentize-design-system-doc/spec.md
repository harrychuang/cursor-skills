## MODIFIED Requirements

### Requirement: Generated root frame and section naming

All generated content SHALL live inside one frame named exactly `Design System — generated`: 1440 px wide, vertical auto layout, with the padding, child spacing, and fill of the fixed document template (120 px on every side, 64 px between children, Paper white). On a new page the frame SHALL be placed at the origin; on an existing page or inside the fallback Section it SHALL be placed 400 px to the right of the rightmost existing node, and the skill SHALL NOT move, rename, restyle, or delete any existing node. The frame SHALL start with the cover described in "Cover and contents", which includes a note that token changes require regenerating and that the designer's own notes belong outside the frame or in the component description field. Every direct child of the frame — the cover, the part headers, the sections, and the footer — SHALL have a name that starts with `DS / `; color collections SHALL be blocks named `DS collection / {collection name}` inside the single `DS / Color` section; and every item inside a section SHALL carry the ID of its source variable, style, or component in its name. These names SHALL be the only way generated content is recognised.

#### Scenario: Existing page with the designer's content

- **WHEN** the page "Foundations" already holds the designer's own frames
- **THEN** `Design System — generated` is placed 400 px to the right of the rightmost of them, and those frames keep their position, size, name, and content

#### Scenario: Root frame follows the template

- **WHEN** the document is generated for any project
- **THEN** the root frame is 1440 px wide with 120 px padding on every side, 64 px between its children, and a Paper white fill

### Requirement: Document language question

After the designer answers "yes" to the document question, and at the start of a document-only run before the inventory, the skill SHALL ask which language the document's headings and labels use, offering **English** (the default), **繁體中文**, and another language the designer names. When the designer states no preference, the document SHALL be in English. The question SHALL be asked in every run that generates the document, and the answer and the font SHALL be recorded in the ledger. Only text the skill itself produces SHALL follow the chosen language: section headings, field labels, the header notes, the link text, and notes such as "and N more". Token, collection, and mode names and values, component, variant, and property names and values, and the text of the component description field SHALL be shown exactly as they are in the file and SHALL NOT be translated. Layer names — the root frame name `Design System — generated`, section names starting with `DS / `, and item names — and the page or Section name `Design System` SHALL stay in English in every language, because generated content is recognised by them. All labels SHALL come from one table of label keys, with English and Traditional Chinese texts provided for every key the template uses, including the cover counts, the part headings, the contents label, and the footer; for another language the same keys SHALL be translated before the first write, and the scripts SHALL contain no heading or label text of their own.

The document font SHALL follow the language: Inter for English and other languages written in Latin, Cyrillic, or Greek script; Noto Sans TC for Traditional Chinese; Noto Sans SC for Simplified Chinese; Noto Sans JP for Japanese; Noto Sans KR for Korean; and a font the designer names for any other script. Before the first write the skill SHALL check, without writing anything, that the font can be loaded, and SHALL resolve the four weights the template uses — regular, medium, semibold, and bold — by trying candidate style names in order (semibold: Semi Bold, SemiBold, Semibold, Bold, Regular; bold: Bold, Semi Bold, SemiBold, Regular; medium: Medium, Regular); the font is unavailable only when Regular cannot be loaded. The template's letter spacing SHALL be applied only to text set in Inter; all other text, including text set in a covering font, SHALL have zero letter spacing. When it cannot, the skill SHALL write nothing and SHALL ask the designer to choose: English headings with the default font, another font, or skipping the document. Text taken from the file that contains characters the document font lacks SHALL be set in a font that covers them when one can be loaded (Noto Sans JP when it contains kana, Noto Sans KR when it contains hangul, otherwise Noto Sans TC for Han characters); when none can be loaded, the text SHALL still be written in the document font and the item SHALL be listed in the report.

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

#### Scenario: Font without a Semibold weight

- **WHEN** the document language is 繁體中文 and Noto Sans TC can be loaded in Regular, Medium, and Bold but in no Semibold style name
- **THEN** text the template sets in Semibold uses Bold, nothing is asked, and the Traditional Chinese headings have zero letter spacing

### Requirement: Foundations samples bound to tokens

The Foundations part SHALL show every local token of the inventory without reclassifying the file's own layers. All color variables SHALL be shown in one Color section that holds one block per collection, titled with the collection name and, when the collection has more than one mode, its mode names; within a section or a collection block, tokens SHALL be grouped by their group path. Swatches, rows, tiles, cards, and tables SHALL use the sizes, colors, radii, and spacing of the fixed document template. Each color variable SHALL be shown as a swatch whose fill is bound to that variable; when its collection has more than one mode, the swatch SHALL have one cell per mode, each rendered with that mode set explicitly, for at most four modes, with a note when there are more. Each Paint Style SHALL be shown as a swatch that uses the style. Each Text Style SHALL be shown as a text sample that uses the style, with its font, size, and line height. Number variables whose scopes include gap or width and height SHALL be shown as a bar whose width is bound to the variable when the value is at most 640, and as a name and value otherwise; number variables scoped to corner radius SHALL be shown as a shape whose corner radius is bound to the variable; each Effect Style SHALL be shown as a card that uses the style; all remaining variables SHALL be listed with name and value. Next to every sample the skill SHALL show the token name, the value per mode at generation time, and the alias target's name when the variable is an alias. The skill SHALL NOT fill a sample with a hardcoded value in place of a binding. A single item that fails (a font that cannot be loaded, a variable that cannot be bound, a style that cannot be applied) SHALL be skipped and recorded with its reason, and the rest of the section SHALL still be built; a Text Style whose font cannot be loaded SHALL be listed with its name and specifications in the document font.

#### Scenario: Semantic color with light and dark modes

- **WHEN** the collection "Brand · System" has the modes Light and Dark and the color variable `sys/color/primary` aliases `ref/primary/40` in Light and `ref/primary/80` in Dark
- **THEN** its swatch has two cells bound to `sys/color/primary`, one rendered in Light and one in Dark, and the text beside it shows both resolved values and both alias targets

#### Scenario: Text Style with an unavailable font

- **WHEN** the Text Style "Display/Large" uses the font "Brand Sans Bold", which cannot be loaded
- **THEN** the style is listed with its name, font, size, and line height in the document font, it appears in the skipped list with the reason, and the other Text Styles are shown as samples

#### Scenario: Two color collections

- **WHEN** the file has the collections "Brand · Reference" (one mode) and "Brand · System" (Light and Dark), both with color variables
- **THEN** the document has one Color section with two collection blocks, and only the "Brand · System" block shows the mode names Light and Dark

### Requirement: Component sections show facts only

For every non-icon component set and standalone component of the inventory, the document SHALL have one section that shows: the name, the kind, the number of variants, and the page; the text of the component's description field, omitted entirely when that field is empty; a line that links to the main component; one instance per variant with the variant name, for at most 30 variants, with the total when there are more; the component properties with name, type, default value, and options; and the names of the variables and styles bound on the main component (the default variant for a set), without duplicates, for at most 40 names, with the total. The section SHALL be laid out as the template's component block: the name, the details line, the description, and the link; the variant instances on a panel stage; and below the stage, the properties table and the token list in two columns. Samples of components SHALL be instances; the skill SHALL NOT clone a main component or a component set. The skill SHALL NOT write usage guidance, descriptions, or recommendations of its own. When the fonts of a component cannot be loaded, its section SHALL show the text information without instances and the component SHALL be recorded as skipped with the reason.

#### Scenario: Component with a description

- **WHEN** the component set `Button` has the description "Primary actions. One per view." and the variants `Style=Filled` and `Style=Outlined`
- **THEN** its section shows that description text, two labelled instances, the property list, the bound token names, and a link to the `Button` set

#### Scenario: Component without a description

- **WHEN** the component `Card` has an empty description field
- **THEN** its section has no description line and no text about how or when to use the component

### Requirement: Icon components are shown as a grid

Components classified as icons SHALL NOT get their own sections. They SHALL be shown together in one section as a grid of instances, each centered on a panel square of the template's icon size and labelled with the component name.

#### Scenario: Icon library in the file

- **WHEN** the file has 180 icon components and 12 other components
- **THEN** the document has one icon grid with 180 named instances and 12 component sections

### Requirement: Batched and resumable writes

The document SHALL be written in batches, one `use_figma` call per batch: at most 20 tokens or styles (for colors, from one collection), at most 40 icons, or one component section; the first call creates the root frame and its header. Before adding an item, the script SHALL check whether an item with the same name already exists in the section and SHALL skip it when it does, so that running a batch twice adds nothing. Every call SHALL return only IDs, counts, and skipped items with reasons, within 18,000 characters. The ledger SHALL record the designer's answers (whether to generate, the language, and the font), the page and root frame IDs, each section's status, item count, and next offset, the skipped items, and the inventory counts. After a failed call or a timeout, the skill SHALL read the ledger and the root frame and SHALL then continue with only the batches that are not complete; when timeouts repeat, it SHALL halve the batch size. After the last batch, a finishing call SHALL build the contents row of the cover and the footer; it SHALL be safe to run again, leaving exactly one contents row and one footer, and the ledger SHALL record whether it is done.

#### Scenario: A batch is run twice

- **WHEN** a call that adds 20 color swatches times out after the swatches were created, and the same batch is run again
- **THEN** the section still has 20 swatches and the second call reports 0 added and 20 existing

#### Scenario: Collection with 45 colors

- **WHEN** a collection has 45 color variables
- **THEN** its section is filled by three calls of 20, 20, and 5 items, and the ledger shows the section as complete after the third

#### Scenario: Finishing call run twice

- **WHEN** the finishing call times out after it built the contents row, and it is run again
- **THEN** the cover has exactly one contents row and the frame has exactly one footer

### Requirement: Guide and documentation for the document step

SKILL.md SHALL describe the document question and the language question in the first step, the document step after verification and before the report, the document-only run, and the tiers of generating and of replacing a document; SHALL no longer list documentation frames as out of scope; SHALL state that the skill writes no usage guidance of its own; SHALL include trigger phrases for a design system document in English and Traditional Chinese; and SHALL keep its description within 1024 characters, embed no script longer than 15 lines, and cite only reference sections that exist. The inventory, layout, section, batching, replacement, and verification rules and scripts, and the template definition, SHALL live in a documentation reference file, and SKILL.md SHALL name the finishing call in the document step and cite the template section. The Traditional Chinese documentation page and the README SHALL explain, in terms of what the designer sees, the questions at the start (whether to generate, and in which language), what the document contains, which text follows the chosen language, that descriptions come from the component description field, how to regenerate, that nothing in the file is changed apart from the added document, and that every document uses the same template, with a link to the template reference page. The root frame name, the page name, the section prefix, and the option names, including the language options, SHALL be the same in SKILL.md, the reference files, the documentation page, and the README.

#### Scenario: Designer reads about the document

- **WHEN** a designer opens the documentation page
- **THEN** the page has a navigation entry and a section that explains the question at the start, the contents of the document, and how to regenerate it

#### Scenario: Agent looks up the document recipe

- **WHEN** SKILL.md tells the agent to generate the design system document
- **THEN** it cites the documentation reference file and section that contain the scripts, and they exist

## ADDED Requirements

### Requirement: Fixed document template

The look of the generated document SHALL be defined once, in one template definition in the documentation reference file: the frame width (1440 px) and padding (120 px), the spacing between the frame's children (64 px), the seven colors (Paper #FFFFFF, Panel #F5F5F7, Line #D2D2D7, Ink #1D1D1F, Ink 2 #6E6E73, Ink 3 #86868B, Link #0066CC), the seven text levels, the radii, the spacing, and the sizes of every block. Every script that builds the document SHALL take these values from that definition, and no build script SHALL contain a color value or a font size of its own. The template SHALL NOT use the project's tokens; samples of the project's tokens, styles, and components SHALL still be bound to them, use them, or be instances. The template SHALL be the same for every project and every run, and SHALL NOT be stored as Figma components, a template file, or a library.

#### Scenario: Two projects

- **WHEN** documents are generated for two projects with different tokens and components
- **THEN** both root frames have the same width, padding, colors, text levels, and block sizes, and the documents differ only in their content

##### Example: Text levels

| Level | Size / line height | Weight | Letter spacing in Inter |
| --- | --- | --- | --- |
| Display | 80 / 84 | Bold | −2.5% |
| Title | 48 / 52 | Bold | −2% |
| Headline | 32 / 40 | Bold | −1.5% |
| Subhead | 24 / 32 | Semibold | −0.5% |
| Body | 19 / 28 | Regular | 0 |
| Callout | 15 / 22 | Regular; Semibold for names and headings | 0 |
| Caption | 12 / 18 | Regular; Medium for paths and tags | 0 |

### Requirement: Cover and contents

The cover SHALL show, in this order: the label for the design system, the file name in the Display level, the generation date, four counts with their labels — tokens (the number of local variables), styles (Text, Effect, and Paint Styles together), components (non-icon components), and icons — the two notes, and a contents row. The contents row SHALL hold one link per section present in the frame, in the frame's order, labelled with that section's heading text and linked to the section node. The counts and notes SHALL be written by the first call; the contents row SHALL be written by the finishing call.

#### Scenario: Contents follow the sections

- **WHEN** the frame holds the sections Color, Typography, Radius, Icons, and Button, in that order
- **THEN** the contents row has five links in that order, each labelled with the section's heading and linked to that section node

#### Scenario: Components only

- **WHEN** the designer chose to generate the Components only
- **THEN** the cover still shows all four counts, and the contents row links only to the icon grid and the component sections

### Requirement: Part headers, section headers, and footer

A part header SHALL be placed before the first Foundations section and before the first section of the Components part (the icon grid or a component section), showing the part title in the Title level and the part's counts on the right; a part header SHALL NOT be created for a part without sections. Part headers and the footer SHALL have 56 px of top padding, so that together with the frame's 64 px spacing they start 120 px after the content above them. Every section SHALL start with a section header: a 1 px Line hairline on top, the section title in the Headline level, and the section's count on the right. The footer SHALL be the last child of the frame and SHALL show the generator label with the generation date and the frame name; a section created while the footer exists SHALL be inserted before it.

#### Scenario: Order of the frame's children

- **WHEN** the file has colors, Text Styles, icons, and two components, and the finishing call has run
- **THEN** the frame's children are, in order: the cover, the Foundations part header, Color, Typography, the Components part header, Icons, the two component sections, and the footer

#### Scenario: No tokens

- **WHEN** the file has components but no variables and no styles
- **THEN** the frame has no Foundations part header, and the Components part header comes right after the cover

### Requirement: Template reference page

The skill SHALL include a standalone HTML template reference page that renders a sample document with the template and lists the template's values. The template values embedded in the page SHALL equal the template definition in the documentation reference file, and the page's color variables SHALL equal the template colors. The page SHALL let the reader switch the sample document between English and Traditional Chinese labels, and SHALL have no horizontal overflow at 500, 768, and 1280 px wide. The documentation reference file and the documentation page SHALL link to it.

#### Scenario: Values drift apart

- **WHEN** a template value is changed in the documentation reference file but not in the reference page
- **THEN** the consistency check reports the value that differs

