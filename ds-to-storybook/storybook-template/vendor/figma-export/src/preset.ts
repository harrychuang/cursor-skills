import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));

export default {
  name: "@harrychuang/storybook-addon-figma-export",
  managerEntries: [join(packageDir, "manager.js")],
};
