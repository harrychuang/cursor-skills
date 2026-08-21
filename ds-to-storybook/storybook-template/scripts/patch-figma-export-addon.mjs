// Sync the vendored figma-export addon into node_modules.
//
// This replaces the previous needle-based patch pipeline (see git history:
// patch-figma-export-addon.mjs + patch-figma-export-component-import.mjs).
// The fully patched/fixed addon now lives in vendor/figma-export and is the
// single source of truth — see vendor/figma-export/VENDOR.md for the editing
// and rebuild workflow.

import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const vendorDir = join(root, "vendor/figma-export");
const addonRoot = join(root, "node_modules/storybook-addons");
const targetDir = join(addonRoot, "packages/figma-export");
const storybookCacheDir = join(root, "node_modules/.cache/storybook");

if (!existsSync(vendorDir)) {
  console.error(
    "[sync-figma-export-addon] vendor/figma-export is missing; cannot sync the addon.",
  );
  process.exit(1);
}

if (!existsSync(addonRoot)) {
  console.warn(
    "[sync-figma-export-addon] storybook-addons is not installed; skipped sync.",
  );
  process.exit(0);
}

const syncExclusions = new Set(["node_modules", ".DS_Store", "package-lock.json"]);

rmSync(targetDir, { force: true, recursive: true });
cpSync(vendorDir, targetDir, {
  filter: (source) => !syncExclusions.has(source.split("/").pop() ?? ""),
  recursive: true,
});
console.log(
  "[sync-figma-export-addon] synced vendor/figma-export -> node_modules/storybook-addons/packages/figma-export",
);

if (existsSync(storybookCacheDir)) {
  rmSync(storybookCacheDir, { force: true, recursive: true });
  console.log(
    "[sync-figma-export-addon] cleared node_modules/.cache/storybook so Storybook re-bundles the addon",
  );
}
