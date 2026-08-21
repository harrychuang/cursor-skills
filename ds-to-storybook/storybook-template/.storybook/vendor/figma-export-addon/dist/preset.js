// src/preset.ts
import { dirname, join } from "path";
import { fileURLToPath } from "url";
var packageDir = dirname(fileURLToPath(import.meta.url));
var preset_default = {
  name: "@harrychuang/storybook-addon-figma-export",
  managerEntries: [join(packageDir, "manager.js")]
};
export {
  preset_default as default
};
//# sourceMappingURL=preset.js.map