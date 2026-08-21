// Shared collapse-preference persistence for the export and review overlays.
// Storage failures (sandboxed iframes, disabled third-party storage) fall back
// to the expanded default so the overlays keep working without persistence.

export const exporterCollapseStorageKey = "sbfx:exporter-collapsed";
export const reviewCollapseStorageKey = "sbfx:review-collapsed";

export function readCollapsePreference(storageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export function writeCollapsePreference(
  storageKey: string,
  collapsed: boolean,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
  } catch {
    // Preference persistence is best-effort only.
  }
}
