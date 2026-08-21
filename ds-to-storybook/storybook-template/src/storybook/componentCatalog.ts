export type ComponentStorybookCategory = "Examples";

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

export type ComponentDocumentationProvenance =
  | "extracted"
  | "implementation-derived";

type ComponentCatalogSeed = {
  id: string;
  name: string;
  category: ComponentStorybookCategory;
  compositionRole: ComponentCompositionRole;
  provenance: ComponentDocumentationProvenance;
  purpose: string;
  useWhen: readonly string[];
  avoidWhen?: readonly string[];
  dependencies?: readonly string[];
  usedBy?: readonly string[];
  keywords: readonly string[];
};

const componentCatalogSeed = [
  {
    id: "example-card",
    name: "Example Card",
    category: "Examples",
    compositionRole: "data-display",
    provenance: "implementation-derived",
    purpose:
      "Neutral starter card used to verify the template catalog, token wiring, and Storybook documentation path.",
    useWhen: [
      "A new project needs a small starter component before domain components are added.",
    ],
    keywords: ["starter", "example", "card", "template", "catalog"],
  },
] as const satisfies readonly ComponentCatalogSeed[];

export type ComponentCatalogId = string;

export type ComponentCatalogEntry = Omit<ComponentCatalogSeed, "id"> & {
  designSystemDoc: string;
  id: string;
  productPath: string;
  storyPath: string;
  storyTitle: string;
};

export const componentCategoryOrder = [
  "Examples",
] as const satisfies readonly ComponentStorybookCategory[];

function toPascalCase(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, "");
}

export const componentCatalogEntries = componentCatalogSeed.map((entry) => ({
  ...entry,
  designSystemDoc: `design-system/components/${entry.id}.md`,
  productPath: `src/components/${entry.id}`,
  storyPath: `src/components/${entry.id}/${toPascalCase(entry.name)}.stories.tsx`,
  storyTitle: `Components/${entry.category}/${entry.name}`,
})) satisfies readonly ComponentCatalogEntry[];

export const componentCatalog = componentCatalogEntries.reduce(
  (catalog, entry) => {
    catalog[entry.id] = entry;
    return catalog;
  },
  {} as Record<string, ComponentCatalogEntry>,
);

function toTitleCase(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function createFallbackCatalogEntry(id: string): ComponentCatalogEntry {
  const name = toTitleCase(id) || "Legacy Component";

  return {
    id,
    name,
    category: "Examples",
    compositionRole: "composite",
    provenance: "implementation-derived",
    purpose:
      "Compatibility metadata for a component story that is outside the neutral template catalog.",
    useWhen: [
      "A reference story remains in the repository but is not part of the default template surface.",
    ],
    keywords: [id, "reference"],
    designSystemDoc: `design-system/components/${id}.md`,
    productPath: `src/components/${id}`,
    storyPath: `src/components/${id}/${toPascalCase(name)}.stories.tsx`,
    storyTitle: `Components/Examples/${name}`,
  };
}

export function getComponentCatalogEntry(
  id: ComponentCatalogId,
): ComponentCatalogEntry {
  return componentCatalog[id] ?? createFallbackCatalogEntry(id);
}

export function getComponentStoryParameters(id: ComponentCatalogId) {
  const entry = getComponentCatalogEntry(id);

  return {
    ai: {
      componentId: entry.id,
      compositionRole: entry.compositionRole,
      dependencies: entry.dependencies ?? [],
      designSystemDoc: entry.designSystemDoc,
      keywords: entry.keywords,
      name: entry.name,
      productPath: entry.productPath,
      provenance: entry.provenance,
      purpose: entry.purpose,
      storyPath: entry.storyPath,
      storybookCategory: entry.category,
      storybookTitle: entry.storyTitle,
      useWhen: entry.useWhen,
      avoidWhen: entry.avoidWhen ?? [],
      usedBy: entry.usedBy ?? [],
    },
    componentCatalog: entry,
  };
}
