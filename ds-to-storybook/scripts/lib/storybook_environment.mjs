import fs from "node:fs";
import path from "node:path";

export const supportedRenderers = [
  "react",
  "vue3",
  "angular",
  "svelte",
  "web-components",
];

const dependencySections = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const frameworkPackages = [
  { name: "@storybook/react-vite", renderer: "react", builder: "vite" },
  { name: "@storybook/react-webpack5", renderer: "react", builder: "webpack5" },
  { name: "@storybook/vue3-vite", renderer: "vue3", builder: "vite" },
  { name: "@storybook/vue3-webpack5", renderer: "vue3", builder: "webpack5" },
  { name: "@storybook/angular", renderer: "angular", builder: "webpack5" },
  { name: "@storybook/svelte-vite", renderer: "svelte", builder: "vite" },
  { name: "@storybook/svelte-webpack5", renderer: "svelte", builder: "webpack5" },
  { name: "@storybook/web-components-vite", renderer: "web-components", builder: "vite" },
  {
    name: "@storybook/web-components-webpack5",
    renderer: "web-components",
    builder: "webpack5",
  },
];

const builderPackages = [
  { name: "@storybook/builder-vite", builder: "vite" },
  { name: "@storybook/builder-webpack5", builder: "webpack5" },
];

const mainFileNames = [
  "main.js",
  "main.jsx",
  "main.ts",
  "main.tsx",
  "main.mjs",
  "main.cjs",
];

export function detectStorybookEnvironment({
  productRoot,
  rendererOverride,
}) {
  if (!productRoot) {
    throw new TypeError("detectStorybookEnvironment requires productRoot");
  }

  if (rendererOverride && !supportedRenderers.includes(rendererOverride)) {
    throw new TypeError(
      `Unsupported renderer override "${rendererOverride}". Valid values: ${supportedRenderers.join(", ")}`,
    );
  }

  const root = path.resolve(productRoot);
  const packageJsonPath = path.join(root, "package.json");
  const packageJson = readJson(packageJsonPath);
  const dependencies = collectDependencies(packageJson);
  const rendererSignals = [];
  const builderSignals = [];
  const versionCandidates = [];

  collectDependencySignals(
    dependencies,
    rendererSignals,
    builderSignals,
    versionCandidates,
  );
  collectMainConfigSignals(root, rendererSignals, builderSignals);

  const detectedRenderers = uniqueValues(rendererSignals.map((signal) => signal.value));
  const detectedBuilders = uniqueValues(builderSignals.map((signal) => signal.value));
  const renderer = rendererOverride
    ? rendererOverride
    : detectedRenderers.length === 1
      ? detectedRenderers[0]
      : "unknown";
  const builder = detectedBuilders.length === 1 ? detectedBuilders[0] : "unknown";
  const storybookMajor = resolveStorybookMajor(versionCandidates);
  const hasConflict =
    (!rendererOverride && detectedRenderers.length > 1) ||
    detectedBuilders.length > 1;
  const confidence = hasConflict || renderer === "unknown"
    ? "ambiguous"
    : builder !== "unknown" && storybookMajor !== null
      ? "exact"
      : "inferred";
  const signals = [
    ...rendererSignals.map(formatSignal),
    ...builderSignals.map(formatSignal),
  ];

  if (rendererOverride) {
    signals.push(`renderer override: ${rendererOverride}`);
  }
  if (storybookMajor !== null) {
    signals.push(`storybook major: ${storybookMajor}`);
  }

  return {
    renderer,
    builder,
    storybookMajor,
    confidence,
    signals: [...new Set(signals)].sort(),
    capabilities: resolveCapabilities({
      renderer,
      builder,
      storybookMajor,
      hasConflict,
    }),
  };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`No package.json found at ${file}`);
    }
    throw new Error(`Unable to read ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function collectDependencies(packageJson) {
  const dependencies = new Map();
  for (const sectionName of dependencySections) {
    const section = packageJson[sectionName];
    if (!section || typeof section !== "object") continue;
    for (const [name, version] of Object.entries(section)) {
      if (!dependencies.has(name)) dependencies.set(name, String(version));
    }
  }
  return dependencies;
}

function collectDependencySignals(
  dependencies,
  rendererSignals,
  builderSignals,
  versionCandidates,
) {
  for (const framework of frameworkPackages) {
    if (!dependencies.has(framework.name)) continue;
    rendererSignals.push({
      source: `package.json dependency ${framework.name}`,
      value: framework.renderer,
    });
    builderSignals.push({
      source: `package.json dependency ${framework.name}`,
      value: framework.builder,
    });
    versionCandidates.push(dependencies.get(framework.name));
  }

  for (const builder of builderPackages) {
    if (!dependencies.has(builder.name)) continue;
    builderSignals.push({
      source: `package.json dependency ${builder.name}`,
      value: builder.builder,
    });
    versionCandidates.push(dependencies.get(builder.name));
  }

  if (dependencies.has("storybook")) {
    versionCandidates.unshift(dependencies.get("storybook"));
  }
}

function collectMainConfigSignals(root, rendererSignals, builderSignals) {
  const storybookDir = path.join(root, ".storybook");
  for (const fileName of mainFileNames) {
    const file = path.join(storybookDir, fileName);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");

    for (const framework of frameworkPackages) {
      if (!content.includes(framework.name)) continue;
      rendererSignals.push({
        source: `.storybook/${fileName} reference ${framework.name}`,
        value: framework.renderer,
      });
      builderSignals.push({
        source: `.storybook/${fileName} reference ${framework.name}`,
        value: framework.builder,
      });
    }

    for (const builder of builderPackages) {
      if (!content.includes(builder.name)) continue;
      builderSignals.push({
        source: `.storybook/${fileName} reference ${builder.name}`,
        value: builder.builder,
      });
    }
  }
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function formatSignal(signal) {
  return `${signal.source}: ${signal.value}`;
}

function resolveStorybookMajor(versionCandidates) {
  for (const candidate of versionCandidates) {
    const match = String(candidate ?? "").match(/(?:^|[^\d])(\d+)(?:\.\d+)?/);
    if (match) return Number.parseInt(match[1], 10);
  }
  return null;
}

function resolveCapabilities({
  renderer,
  builder,
  storybookMajor,
  hasConflict,
}) {
  if (hasConflict || renderer === "unknown" || storybookMajor === null) {
    return capabilitySet("unverified", "unverified");
  }

  if (storybookMajor !== 10) {
    return capabilitySet("unverified", "unsupported");
  }

  const coreExport = supportedRenderers.includes(renderer)
    ? "supported"
    : "unsupported";
  const fullReviewSupported =
    builder === "vite" && (renderer === "react" || renderer === "vue3");

  return {
    coreExport,
    reviewWorkspace: fullReviewSupported ? "supported" : "unsupported",
    visualComments: fullReviewSupported ? "supported" : "unsupported",
    persistence: fullReviewSupported ? "supported" : "unsupported",
  };
}

function capabilitySet(coreExport, reviewState) {
  return {
    coreExport,
    reviewWorkspace: reviewState,
    visualComments: reviewState,
    persistence: reviewState,
  };
}
