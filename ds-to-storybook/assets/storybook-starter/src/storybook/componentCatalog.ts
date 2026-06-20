export type ComponentStorybookCategory =
  | "Actions"
  | "Assets"
  | "Controls"
  | "Data Display"
  | "Feedback"
  | "Layout"
  | "Navigation"
  | "Overlays";

export type ComponentCompositionRole =
  | "action"
  | "asset"
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

const componentCatalogSeed: ComponentCatalogSeed[] = [];

export const componentCatalog = componentCatalogSeed;

export function getComponentStoryParameters(componentId: string) {
  const entry = componentCatalog.find((item) => item.id === componentId);
  if (!entry) {
    return {};
  }

  return {
    docs: {
      description: {
        component: entry.purpose,
      },
    },
  };
}
