/**
 * Component catalog — the Component Coverage Analyzer's source of truth about
 * this project's reusable components.
 *
 * GENERATED PER PROJECT by the storybook-tools skill: this file is
 * a skeleton, not a verbatim template. The installer scans the target
 * project's components and stories, replaces the example entries below with
 * real ones, and saves the result as `src/storybook/componentCatalog.ts`.
 * See references/catalog-authoring.md in the skill for entry-writing rules.
 *
 * Contract consumed by src/storybook/component-coverage/ — these exports must
 * keep their names and shapes:
 *   componentCatalog, componentCatalogEntries,
 *   ComponentCatalogId, ComponentDocumentationProvenance
 *
 * Parsing contract: the check scripts (scripts/check-component-catalog.mjs,
 * scripts/check-component-coverage-reports.mjs) parse this file with regexes.
 * Keep `id` as the FIRST field of every entry and keep the string fields
 * (`id`, `name`, `storyTitle`, `componentPath`) each on a single line.
 */

/**
 * Project-specific Storybook grouping. Replace with the target project's own
 * category union (6–12 categories works well; mirror how its stories are
 * already grouped in the sidebar).
 */
export type ComponentStorybookCategory = "Actions" | "Data Display" | "Feedback";

export type ComponentCompositionRole =
  | "action"
  | "asset"
  | "badge-label"
  | "composite"
  | "control"
  | "data-display"
  | "feedback"
  | "layout"
  | "navigation"
  | "overlay";

/**
 * Where the entry's knowledge comes from: `extracted` = documented from a
 * design source (Figma, spec, design-system doc); `implementation-derived` =
 * documented by reading the implementation because no design source exists.
 */
export type ComponentDocumentationProvenance =
  | "extracted"
  | "implementation-derived";

type ComponentCatalogSeed = {
  /** kebab-case identifier; unique across the catalog. Keep as the first field. */
  id: string;
  /** Human-readable component name as shown in Storybook. */
  name: string;
  category: ComponentStorybookCategory;
  compositionRole: ComponentCompositionRole;
  provenance: ComponentDocumentationProvenance;
  /**
   * The EXACT Storybook title of the component's main story file — copy it
   * from the story's `title:` (or its autotitle). The coverage tool uses it
   * to deep-link into Storybook, and coverage reports must echo it verbatim.
   */
  storyTitle: string;
  /** Repo-relative directory of the component's source. Must exist. */
  componentPath: string;
  /** Repo-relative path of the main story file (optional but recommended). */
  storyPath?: string;
  /** Repo-relative path of the component's design doc, if the project has one. */
  designSystemDoc?: string;
  /** One concrete sentence: what the component is and what it renders. */
  purpose: string;
  /** Situations where this component is the right choice (1–3 items). */
  useWhen: readonly string[];
  /** Situations where a different component should be used instead. */
  avoidWhen?: readonly string[];
  /** Catalog ids of components this one composes internally. */
  dependencies?: readonly string[];
  /** Catalog ids of components that compose this one. */
  usedBy?: readonly string[];
  /** 4–8 search terms incl. synonyms a designer/PM might use. */
  keywords: readonly string[];
};

const componentCatalogSeed = [
  // ────────────────────────────────────────────────────────────────────
  // EXAMPLE ENTRIES — replace every entry below with the target project's
  // real components. Keep the density: concrete purpose, situational
  // useWhen/avoidWhen, generous keywords. Shallow entries make coverage
  // analysis unreliable.
  // ────────────────────────────────────────────────────────────────────
  {
    id: "button",
    name: "Button",
    category: "Actions",
    compositionRole: "action",
    provenance: "implementation-derived",
    storyTitle: "Components/Actions/Button",
    componentPath: "src/components/button",
    storyPath: "src/components/button/Button.stories.tsx",
    purpose:
      "Primary fill and outline action primitive across sizes, states, and icon slots.",
    useWhen: [
      "A flow needs a reusable primary or secondary action that is not tied to a specific composite pattern.",
    ],
    avoidWhen: [
      "Use domain-specific action components when their contract owns different sizing, color, or layout.",
    ],
    keywords: ["button", "primary action", "outline", "fill", "disabled", "icon button"],
  },
  {
    id: "empty-state",
    name: "Empty State",
    category: "Feedback",
    compositionRole: "feedback",
    provenance: "implementation-derived",
    storyTitle: "Components/Feedback/Empty State",
    componentPath: "src/components/empty-state",
    purpose:
      "Full-surface no-content feedback with illustration slot, message, and optional action.",
    useWhen: [
      "A list, search result, or content surface can be empty and needs guidance toward the next step.",
    ],
    avoidWhen: ["Use an inline alert for errors inside an otherwise populated surface."],
    dependencies: ["button"],
    keywords: ["empty", "no data", "placeholder", "zero state", "no results"],
  },
] as const satisfies readonly ComponentCatalogSeed[];

export type ComponentCatalogId = (typeof componentCatalogSeed)[number]["id"];

export type ComponentCatalogEntry = Omit<ComponentCatalogSeed, "id"> & {
  id: ComponentCatalogId;
};

export const componentCatalogEntries =
  componentCatalogSeed satisfies readonly ComponentCatalogEntry[];

export const componentCatalog = componentCatalogEntries.reduce(
  (catalog, entry) => {
    catalog[entry.id] = entry;
    return catalog;
  },
  {} as Record<ComponentCatalogId, ComponentCatalogEntry>,
);

export function getComponentCatalogEntry(
  id: ComponentCatalogId,
): ComponentCatalogEntry {
  return componentCatalog[id];
}
