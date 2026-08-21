// Addon version shown in the overlay UIs. __SBFX_VERSION__ is injected from
// package.json by the tsup build; ad hoc bundles (test fixtures) fall back to
// "dev" so the overlays never crash on a missing define.
declare const __SBFX_VERSION__: string;

export function getAddonVersion(): string {
  return typeof __SBFX_VERSION__ === "string" ? __SBFX_VERSION__ : "dev";
}
