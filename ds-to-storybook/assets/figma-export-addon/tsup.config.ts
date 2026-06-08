import { copyFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
    preview: "src/preview.tsx",
    preset: "src/preset.ts",
    manager: "src/manager-entry.ts",
  },
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "storybook",
    "@storybook/icons",
    "storybook/internal/components",
    "storybook/manager-api",
  ],
  format: ["esm"],
  sourcemap: true,
  splitting: false,
  target: "es2022",
  tsconfig: "tsconfig.json",
  esbuildOptions(options) {
    options.plugins = options.plugins ?? [];
    options.plugins.push({
      name: "external-css",
      setup(build) {
        build.onResolve({ filter: /\.css$/ }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    });
  },
  onSuccess() {
    copyFileSync("src/figma-code-exporter.css", "dist/figma-code-exporter.css");
    for (const artifact of [
      "index.css",
      "preview.css",
      "index.css.map",
      "preview.css.map",
    ]) {
      try {
        unlinkSync(join("dist", artifact));
      } catch {
        // ignore missing artifacts
      }
    }
  },
});
