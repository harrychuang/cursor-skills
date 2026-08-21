import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = mkdtempSync(join(tmpdir(), "figma-export-config-"));

try {
  mkdirSync(join(fixture, "design-system"), { recursive: true });
  mkdirSync(join(fixture, ".storybook"), { recursive: true });
  writeFileSync(
    join(fixture, "design-system", "COMPONENT_INVENTORY.md"),
    "# Inventory\n\n| Component | Category |\n| --- | --- |\n| Button | component |\n",
  );
  writeFileSync(
    join(fixture, ".storybook", "figma-export.config.ts"),
    `export const figmaExportProjectConfig = {
  addon: { storyTitlePrefix: false, embeddedSvgByDataGraphic: { logo: "<svg></svg>" } },
  review: {
    apiPath: "/custom-status",
    commentsApiPath: "/custom-comments",
    commentsDir: "reviews/comments",
    commentsEnabled: false,
    visualComments: {
      enabled: false,
      apiPath: "/custom-comments",
      captureSelector: "body",
      authorStorageKey: "custom-author",
    },
  },
};\n`,
  );
  const output = execFileSync(
    process.execPath,
    [
      join(skillRoot, "scripts", "generate_figma_export_config.mjs"),
      fixture,
      "--product-root",
      fixture,
      "--json",
    ],
    { encoding: "utf8" },
  );
  const { config } = JSON.parse(output);
  assert.equal(config.review.apiPath, "/custom-status");
  assert.equal(config.review.commentsApiPath, "/custom-comments");
  assert.equal(config.review.commentsDir, "reviews/comments");
  assert.equal(config.review.commentsEnabled, false);
  assert.deepEqual(config.addon.embeddedSvgByDataGraphic, { logo: "<svg></svg>" });
  assert.deepEqual(config.review.visualComments, {
    enabled: false,
    apiPath: "/custom-comments",
    captureSelector: "body",
    authorStorageKey: "custom-author",
  });
  const templateMain = readFileSync(
    join(skillRoot, "storybook-template", ".storybook", "main.ts"),
    "utf8",
  );
  const templatePreview = readFileSync(
    join(skillRoot, "storybook-template", ".storybook", "preview.ts"),
    "utf8",
  );
  assert.match(templateMain, /import \{ figmaExportProjectConfig \} from "\.\/figma-export\.config\.ts"/);
  assert.match(templatePreview, /import \{ figmaExportProjectConfig \} from "\.\/figma-export\.config\.ts"/);
  assert.doesNotMatch(templateMain, /storybookTemplateProjectConfig\.figmaExport/);
  assert.doesNotMatch(templatePreview, /storybookTemplateProjectConfig\.figmaExport/);

  writeFileSync(
    join(fixture, ".storybook", "figma-export.config.ts"),
    `export const figmaExportProjectConfig = {
  addon: {},
  review: {
    apiPath: "/custom-status",
    commentsApiPath: "/server-comments",
    commentsEnabled: true,
    visualComments: { enabled: true, apiPath: "/preview-comments" },
  },
  source: {},
};\n`,
  );
  assert.throws(
    () => execFileSync(
      process.execPath,
      [
        join(skillRoot, "scripts", "generate_figma_export_config.mjs"),
        fixture,
        "--product-root",
        fixture,
        "--json",
      ],
      { encoding: "utf8", stdio: "pipe" },
    ),
    (error) =>
      String(error.stderr).includes("/preview-comments") &&
      String(error.stderr).includes("/server-comments"),
    "split preview/server comments paths must fail with both endpoints",
  );
  console.log("figma export config generator fixture passed");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
