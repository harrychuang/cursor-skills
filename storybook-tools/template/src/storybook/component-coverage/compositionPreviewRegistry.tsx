import type { ReactNode } from "react";

import type { ComponentCatalogId } from "../componentCatalog";

export type CompositionPreviewRenderer = () => ReactNode;

/**
 * Trusted project-owned preview fixtures. Install binding: add direct imports
 * for reusable components that can render deterministically, then register a
 * zero-argument renderer keyed by its catalog id. Never accept props, imports,
 * children, CSS, or executable content from a coverage report.
 */
export const compositionPreviewRegistry: Partial<
  Record<ComponentCatalogId, CompositionPreviewRenderer>
> = {};

export function getCompositionPreviewRenderer(
  componentId: string,
): CompositionPreviewRenderer | undefined {
  return compositionPreviewRegistry[componentId as ComponentCatalogId];
}

/**
 * Optional exact Storybook story id for a trusted renderer's preview variant.
 * The verbatim preview code depends only on this accessor pair, so a project
 * may evolve the registry into richer entries (renderer + story id) as long
 * as both accessors keep their signatures. The scaffold declares no variants:
 * trusted renderers fall back to the component's documentation link, and
 * catalog components without a trusted renderer resolve through the story
 * title index.
 */
export function getCompositionPreviewStoryId(
  componentId: string,
): string | undefined {
  void componentId;
  return undefined;
}
