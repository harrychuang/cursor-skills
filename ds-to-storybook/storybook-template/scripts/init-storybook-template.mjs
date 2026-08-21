import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const rootDir = process.cwd();
const projectConfigPath = join(rootDir, ".storybook/project.config.ts");
const packageJsonPath = join(rootDir, "package.json");
const acceptedPrefixRule =
  "Prefixes must start with a lowercase ASCII letter and contain only lowercase ASCII letters, digits, and single hyphens.";
const prefixPattern = /^[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*$/;
const starterRewriteRoots = [
  "tokens",
  "src/styles",
  ".storybook/prototype-inspector",
  "src/components/example-card",
  "src/pages/prototypes/example-prototype",
  "src/stories/_shared",
  "src/stories/foundations",
  "src/stories/governance",
  "src/storybook",
];
const starterRewriteExtensions = new Set([".css", ".md", ".ts", ".tsx"]);

function printUsage() {
  console.error(
    [
      "Usage: npm run init-template -- --name <project-name> --prefix <token-prefix> [--package-name <name>] [--figma-url <url>] [--keep-example] [--force]",
      acceptedPrefixRule,
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const parsed = {
    keepExample: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--keep-example") {
      parsed.keepExample = true;
      continue;
    }

    if (arg === "--force") {
      parsed.force = true;
      continue;
    }

    if (
      arg === "--name" ||
      arg === "--prefix" ||
      arg === "--package-name" ||
      arg === "--figma-url"
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}.`);
      }
      parsed[arg.slice(2).replace(/-([a-z])/g, (_, char) =>
        char.toUpperCase(),
      )] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}.`);
  }

  return parsed;
}

function toPackageName(projectName, prefix) {
  const packageName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return packageName || `${prefix}-storybook`;
}

function readTextIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function getConfiguredPrefix() {
  const configText = readTextIfExists(projectConfigPath);
  return configText.match(/"tokenPrefix":\s*"([^"]+)"/)?.[1] ??
    configText.match(/tokenPrefix:\s*"([^"]+)"/)?.[1] ??
    null;
}

function getDetectedTokenPrefix() {
  for (const relativePath of [
    "tokens/tokens-ref.css",
    "tokens/tokens-sys.css",
    "tokens/tokens-comp.css",
  ]) {
    const text = readTextIfExists(join(rootDir, relativePath));
    const match = text.match(/--([a-z][a-z0-9-]*)-(ref|sys|comp)-/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function collectStarterFiles(relativeRoot) {
  const absoluteRoot = join(rootDir, relativeRoot);
  if (!existsSync(absoluteRoot)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(absoluteRoot)) {
    const absolutePath = join(absoluteRoot, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(
        ...collectStarterFiles(join(relativeRoot, entry)),
      );
      continue;
    }

    if (starterRewriteExtensions.has(extname(absolutePath))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteStarterPrefixes(oldPrefixes, newPrefix) {
  const files = starterRewriteRoots.flatMap(collectStarterFiles);

  for (const filePath of files) {
    let text = readFileSync(filePath, "utf8");
    const originalText = text;

    for (const oldPrefix of oldPrefixes) {
      const escapedPrefix = escapeRegexLiteral(oldPrefix);
      text = text
        .replace(new RegExp(`--${escapedPrefix}-`, "g"), `--${newPrefix}-`)
        .replace(new RegExp(`\\b${escapedPrefix}-`, "g"), `${newPrefix}-`);
    }

    if (text !== originalText) {
      writeFileSync(filePath, text);
    }
  }
}

function writeProjectConfig({
  projectName,
  packageName,
  tokenPrefix,
  figmaUrl,
}) {
  const componentClassPrefix = `${tokenPrefix}-`;
  const config = {
    project: {
      projectName,
      packageName,
      tokenPrefix,
      componentClassPrefixes: [componentClassPrefix],
    },
    storybook: {
      stories: [
        "../src/stories/governance/*.stories.@(js|jsx|mjs|ts|tsx)",
        "../src/stories/foundations/TemplateFoundation.stories.@(js|jsx|mjs|ts|tsx)",
        "../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)",
        "../src/pages/prototypes/example-prototype/*.stories.@(js|jsx|mjs|ts|tsx)",
      ],
      staticDirs: ["../tokens", "../design-system"],
      themeDataAttribute: "storybookTemplateTheme",
      backgrounds: {
        dark: {
          name: "Dark theme",
          value: `var(--${tokenPrefix}-ref-color-neutral-12)`,
        },
        light: {
          name: "Light theme",
          value: `var(--${tokenPrefix}-ref-color-neutral-100)`,
        },
      },
      storySortOrder: [
        "Governance",
        ["Storybook Architecture", "Component Catalog"],
        "Foundations",
        "Components",
        ["Examples"],
        "Pages",
        ["Prototypes"],
      ],
    },
    figmaExport: {
      addon: {
        absoluteFidelityComponents: [],
        componentClassPrefixes: [componentClassPrefix],
        embeddedSvgByDataGraphic: {},
        // Top-level namespaces only: prefixes are matched with startsWith, so
        // a deeper prefix like "Components/Examples/" would silently exclude
        // sibling subcategories from the Figma export overlay.
        storyTitlePrefix: ["Components/", "Pages/"],
      },
      review: {
        apiPath: `/__${tokenPrefix}_figma_review_status`,
        enabled: true,
        pluginName: `${tokenPrefix}-figma-review-status-api`,
        statusFilePath: "design-system/figma-export-review-status.json",
      },
      source: {
        designSystemFileUrlFallback: figmaUrl,
        nodeOverrides: {},
      },
    },
    prototypeInspector: {
      addonName: "storybook-template/prototype-inspector",
      flowLayoutSchemaName: "storybook-template.prototype-flow-layout",
      previewHeightCssVariable:
        "--prototype-inspector-viewport-compact-height",
      routePreviewSelector: '[data-prototype-route-preview="true"]',
    },
    catalog: {
      componentStoriesRoot: "src/components",
    },
  };

  writeFileSync(
    projectConfigPath,
    `// Generated by scripts/init-storybook-template.mjs. Safe to regenerate.\nexport type StorybookTemplateProjectConfig = {\n  project: {\n    projectName: string;\n    packageName: string;\n    tokenPrefix: string;\n    componentClassPrefixes: string[];\n  };\n  storybook: {\n    stories: string[];\n    staticDirs: string[];\n    themeDataAttribute: string;\n    backgrounds: {\n      dark: {\n        name: string;\n        value: string;\n      };\n      light: {\n        name: string;\n        value: string;\n      };\n    };\n    storySortOrder: unknown[];\n  };\n  figmaExport: {\n    addon: {\n      absoluteFidelityComponents: string[];\n      componentClassPrefixes: string[];\n      embeddedSvgByDataGraphic: Record<string, string>;\n      storyTitlePrefix: string[] | false;\n    };\n    review: {\n      apiPath: string;\n      enabled: boolean;\n      pluginName: string;\n      statusFilePath: string;\n    };\n    source: {\n      designSystemFileUrlFallback: string;\n      nodeOverrides: Record<string, string>;\n    };\n  };\n  prototypeInspector: {\n    addonName: string;\n    flowLayoutSchemaName: string;\n    previewHeightCssVariable: string;\n    routePreviewSelector: string;\n  };\n  catalog: {\n    componentStoriesRoot: string;\n  };\n};\n\nexport function defineStorybookTemplateProjectConfig(\n  config: StorybookTemplateProjectConfig,\n): StorybookTemplateProjectConfig {\n  return config;\n}\n\nexport const storybookTemplateProjectConfig =\n  defineStorybookTemplateProjectConfig(${JSON.stringify(config, null, 2)});\n`,
  );
}

function writePackageName(packageName) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  packageJson.name = packageName;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function assertTemplateConfigCanBeUpdated(force) {
  if (!existsSync(projectConfigPath) || force) {
    return;
  }

  const configText = readFileSync(projectConfigPath, "utf8");
  if (!configText.includes("defineStorybookTemplateProjectConfig")) {
    throw new Error(
      "Existing .storybook/project.config.ts does not look like a template config. Re-run with --force to overwrite it.",
    );
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (!options.name || !options.prefix) {
    printUsage();
    process.exitCode = 1;
  } else if (!prefixPattern.test(options.prefix)) {
    console.error(acceptedPrefixRule);
    process.exitCode = 1;
  } else {
    assertTemplateConfigCanBeUpdated(options.force);

    const packageName = options.packageName ??
      toPackageName(options.name, options.prefix);
    const oldPrefixes = new Set(
      [getConfiguredPrefix(), getDetectedTokenPrefix()].filter(
        (prefix) => prefix && prefix !== options.prefix,
      ),
    );

    rewriteStarterPrefixes(oldPrefixes, options.prefix);
    writeProjectConfig({
      projectName: options.name,
      packageName,
      tokenPrefix: options.prefix,
      figmaUrl: options.figmaUrl ?? "",
    });
    writePackageName(packageName);

    console.log(
      `Initialized ${options.name} with token prefix ${options.prefix}.`,
    );
    if (!options.keepExample) {
      console.log(
        "The neutral example prototype remains available as starter reference content.",
      );
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
