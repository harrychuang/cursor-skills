import type { ReactNode } from "react";

/**
 * Component Timeline extras registry — the ONLY project-owned extension
 * point of the timeline page (adaptable; everything else in this folder is
 * copied verbatim and must not be edited).
 *
 * Contract consumed by ComponentTimeline.tsx: keep the exported accessor
 * name and signature. The page calls `getTimelineExtras()` once per render;
 * a `null`/`undefined` return (the default) renders no extras section, any
 * other ReactNode is rendered inside a panel above the timeline listing.
 *
 * Typical adaptations: a project-specific statistics panel (build pipeline
 * progress, design-sync status, …). Keep the content deterministic and
 * side-effect-free at module load: import project modules directly here —
 * never fetch remote data synchronously, and never read executable content
 * from user input.
 */
export function getTimelineExtras(): ReactNode {
  return null;
}
