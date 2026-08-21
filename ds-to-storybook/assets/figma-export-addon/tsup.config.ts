import { copyFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  clean: true,
  define: {
    __SBFX_VERSION__: JSON.stringify(version),
  },
  dts: true,
  entry: {
    index: "src/index.ts",
    preview: "src/preview.ts",
    preset: "src/preset.ts",
    manager: "src/manager-entry.ts",
    review: "src/review.ts",
    "review-controller": "src/reviewController.ts",
    "review-server": "src/review-server.ts",
    source: "src/source.ts",
    "visual-comment-store": "src/visualCommentStore.ts",
    "visual-comment-report": "src/visualCommentReport.ts",
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
    copyFileSync("src/review.css", "dist/review.css");
    for (const artifact of [
      "index.css",
      "preview.css",
      "review.css.map",
      "review-server.js.map",
      "review.js.map",
      "index.css.map",
      "preview.css.map",
      "source.js.map",
    ]) {
      try {
        unlinkSync(join("dist", artifact));
      } catch {
        // ignore missing artifacts
      }
    }
  },
});
