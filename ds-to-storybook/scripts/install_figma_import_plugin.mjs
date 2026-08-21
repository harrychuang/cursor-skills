#!/usr/bin/env node

import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { isIP } from "node:net";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDir, "..");
const bundledPluginRoot = join(skillRoot, "assets", "figma-plugin-code-to-design");
const repoCopyTarget = join("figma", "storybook-code-to-design");
const repoCheckoutHint =
  "design-system-to-storybook/assets/figma-plugin-code-to-design/manifest.json";
const excludedPathSegments = new Set([".git", "node_modules"]);
const excludedFiles = new Set([".DS_Store"]);
const expectedDevelopmentDomains = [
  "http://localhost:6006",
  "http://localhost:6007",
  "http://localhost:6008",
  "http://localhost:8080",
];

function printUsage() {
  console.error(
    [
      "Usage: node <skill-root>/scripts/install_figma_import_plugin.mjs [product-repo-root] [options]",
      "",
      "Skill-folder mode (default, solo machines): validates the bundled Storybook",
      "Code To Design importer, prints its version and the manifest path to load",
      "once per machine in Figma Desktop, plus the update flow. With a product repo",
      "root, also reports the state of a committed repo copy.",
      "",
      "Options:",
      "  --copy-to <dir>  Team distribution: copy the plugin into <dir> (resolved",
      "                   against the product repo root when relative; use",
      "                   figma/storybook-code-to-design by convention). Commit the",
      "                   copy so designers get the plugin via git pull without any",
      "                   agent skill install. Also for air-gapped or deliberately",
      "                   self-contained workspaces.",
      "  --target <dir>   Deprecated alias of --copy-to.",
      "  --dry-run        With --copy-to: list what would be copied without copying.",
      "  --force          With --copy-to: overwrite changed files after approval.",
      "  -h, --help       Show this help.",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const parsed = {
    copyTo: null,
    dryRun: false,
    force: false,
    productRoot: null,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      parsed.force = true;
      continue;
    }

    if (arg === "--copy-to" || arg === "--target") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}.`);
      }
      parsed.copyTo = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}.`);
    }

    positionals.push(arg);
  }

  if (positionals.length > 1) {
    throw new Error("Expected at most one product repo root.");
  }
  if (positionals.length === 1) {
    parsed.productRoot = resolve(positionals[0]);
  }

  if (parsed.copyTo) {
    if (isAbsolute(parsed.copyTo)) {
      parsed.copyTarget = resolve(parsed.copyTo);
    } else {
      if (!parsed.productRoot) {
        throw new Error("A product repo root is required when --copy-to is a relative path.");
      }
      parsed.copyTarget = resolve(parsed.productRoot, parsed.copyTo);
    }
  } else if (parsed.dryRun || parsed.force) {
    throw new Error("--dry-run and --force only apply to --copy-to fallback copies.");
  }

  return parsed;
}

function shouldExclude(relativePath) {
  if (!relativePath) {
    return false;
  }

  const basename = relativePath.split(sep).at(-1);
  if (excludedFiles.has(basename)) {
    return true;
  }

  return relativePath.split(sep).some((part) =>
    excludedPathSegments.has(part),
  );
}

function collectFiles(currentRoot, files = []) {
  const entries = readdirSync(currentRoot, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = join(currentRoot, entry.name);
    const relativePath = relative(bundledPluginRoot, absolutePath);

    if (shouldExclude(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      collectFiles(absolutePath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push({
        absolutePath,
        relativePath,
        mode: statSync(absolutePath).mode,
      });
    }
  }

  return files;
}

function targetDiffersFromFile(sourcePath, targetPath) {
  if (!existsSync(targetPath)) {
    return false;
  }

  if (!statSync(targetPath).isFile()) {
    return true;
  }

  return !readFileSync(sourcePath).equals(readFileSync(targetPath));
}

function assertProductRoot(productRoot) {
  if (!existsSync(productRoot)) {
    throw new Error(`Product repo root does not exist: ${productRoot}`);
  }
  if (!statSync(productRoot).isDirectory()) {
    throw new Error(`Product repo root is not a directory: ${productRoot}`);
  }
}

function assertBundledPlugin() {
  const requiredFiles = [
    "manifest.json",
    "code.js",
    "code.ts",
    "ui.html",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "README.md",
  ];

  if (!existsSync(bundledPluginRoot)) {
    throw new Error(`Missing bundled Figma importer plugin: ${bundledPluginRoot}`);
  }

  for (const file of requiredFiles) {
    const absolutePath = join(bundledPluginRoot, file);
    if (!existsSync(absolutePath)) {
      throw new Error(
        `Bundled Figma importer plugin is incomplete; missing ${absolutePath}`,
      );
    }
  }
}

export function assertValidDevelopmentDomains(manifest) {
  const domains = manifest?.networkAccess?.devAllowedDomains;
  if (!Array.isArray(domains)) {
    throw new Error(
      "Bundled Figma importer manifest must define networkAccess.devAllowedDomains.",
    );
  }

  for (const domain of domains) {
    if (typeof domain !== "string") {
      continue;
    }

    let hostname = "";
    try {
      hostname = new URL(domain).hostname.replace(/^\[|\]$/g, "");
    } catch {
      // The exact allowlist check below reports malformed and wildcard values.
    }
    if (isIP(hostname) !== 0) {
      throw new Error(
        `Invalid devAllowedDomains entry "${domain}": Figma local development domains must use localhost, not an IP literal.`,
      );
    }
  }

  if (
    domains.length !== expectedDevelopmentDomains.length ||
    domains.some((domain, index) => domain !== expectedDevelopmentDomains[index])
  ) {
    throw new Error(
      `Bundled Figma importer devAllowedDomains must exactly match: ${expectedDevelopmentDomains.join(", ")}.`,
    );
  }
}

function readBundledPluginInfo() {
  const packageJson = JSON.parse(
    readFileSync(join(bundledPluginRoot, "package.json"), "utf8"),
  );
  const manifest = JSON.parse(
    readFileSync(join(bundledPluginRoot, "manifest.json"), "utf8"),
  );
  assertValidDevelopmentDomains(manifest);
  const runtimeEntry = manifest.main || "code.js";
  const runtimePath = join(bundledPluginRoot, runtimeEntry);

  if (!existsSync(runtimePath)) {
    throw new Error(
      `Manifest main runtime is missing: ${runtimePath}. Rebuild the plugin with npm run build.`,
    );
  }

  const runtimeSource = readFileSync(runtimePath, "utf8");
  const stampedVersion = runtimeSource.match(/PLUGIN_VERSION = "([^"]*)"/)?.[1] ?? null;

  return {
    manifestPath: join(bundledPluginRoot, "manifest.json"),
    name: manifest.name || packageJson.name,
    runtimeEntry,
    stampedVersion,
    version: packageJson.version,
  };
}

function pathHasHiddenSegment(value) {
  return value
    .split(sep)
    .some((part) => part.startsWith(".") && part !== "." && part !== "..");
}

function reportCentral(info, productRoot) {
  console.log(`Figma importer plugin: ${info.name}`);
  console.log(`Version: ${info.version}${info.stampedVersion ? ` (runtime stamp: ${info.stampedVersion})` : ""}`);
  console.log(`Skill-folder manifest (this machine): ${info.manifestPath}`);
  console.log(`Canonical source: the skills repo checkout at ${repoCheckoutHint}`);

  if (info.stampedVersion && !info.stampedVersion.startsWith(`${info.version} (`)) {
    console.warn(
      `Warning: runtime stamp ${info.stampedVersion} does not match package.json ${info.version}; run npm run build in the plugin directory.`,
    );
  }

  console.log("");
  console.log("One-time setup per machine (Figma Desktop):");
  console.log("1. Open Figma Desktop.");
  console.log("2. Go to Plugins > Development > Import plugin from manifest...");
  console.log("3. Select the manifest above.");
  if (pathHasHiddenSegment(info.manifestPath)) {
    console.log(
      "   Note: the path is inside a hidden folder, so the file dialog will not",
    );
    console.log(
      "   show it. Press Cmd+Shift+G and paste the full path (or Cmd+Shift+. to",
    );
    console.log("   toggle hidden files).");
  }
  console.log("4. In Storybook, export JSON, then import it with Storybook Code To Design.");
  console.log("");
  console.log("Updates: refresh this skill copy (git pull the skills repo checkout, or");
  console.log("install_agent_skill.mjs --force for installed skill folders) — a dev");
  console.log("plugin re-reads its runtime on every run, so no re-import is needed.");
  console.log("");
  console.log("Team distribution: designer machines usually have no agent skill folder,");
  console.log("and hidden paths are hard to select in the Figma file dialog. Commit a");
  console.log(`repo copy instead: --copy-to ${toPosix(repoCopyTarget)} (see --help).`);

  if (!productRoot) return;

  const repoCopyDir = join(productRoot, repoCopyTarget);
  if (!existsSync(repoCopyDir)) return;

  const isTemplateWorkspace = existsSync(
    join(productRoot, "scripts", "patch-figma-export-addon.mjs"),
  );
  console.log("");
  if (isTemplateWorkspace) {
    console.log(
      `Note: ${toPosix(relative(productRoot, repoCopyDir))} belongs to the bundled template workspace and stays self-contained.`,
    );
    return;
  }

  const repoManifestPath = join(repoCopyDir, "manifest.json");
  const repoRuntimePath = join(repoCopyDir, info.runtimeEntry);
  const repoCopyCurrent =
    existsSync(repoManifestPath) &&
    existsSync(repoRuntimePath) &&
    !targetDiffersFromFile(join(bundledPluginRoot, "manifest.json"), repoManifestPath) &&
    !targetDiffersFromFile(join(bundledPluginRoot, info.runtimeEntry), repoRuntimePath);
  const repoCopyLabel = toPosix(relative(productRoot, repoCopyDir));
  if (repoCopyCurrent) {
    console.log(`Repo copy at ${repoCopyLabel} matches the bundled plugin (team channel is current).`);
  } else {
    console.log(`Repo copy at ${repoCopyLabel} is outdated or incomplete.`);
    console.log(
      `Refresh it with --copy-to ${toPosix(repoCopyTarget)} --force and commit, or delete it if this machine's designers load the skill-folder manifest instead.`,
    );
  }
}

function copyPluginFiles({ productRoot, copyTarget, dryRun, force }) {
  const displayRoot = productRoot ?? dirname(copyTarget);
  const files = collectFiles(bundledPluginRoot);
  const collisions = files
    .map((file) => ({
      ...file,
      targetPath: join(copyTarget, file.relativePath),
    }))
    .filter((file) =>
      targetDiffersFromFile(file.absolutePath, file.targetPath),
    );

  if (collisions.length > 0 && !force) {
    const shown = collisions.slice(0, 40).map((file) =>
      relative(displayRoot, file.targetPath),
    );
    const hiddenCount = collisions.length - shown.length;
    throw new Error(
      [
        `Refusing to overwrite ${collisions.length} existing file(s) in ${copyTarget}.`,
        ...shown.map((file) => `  - ${toPosix(file)}`),
        hiddenCount > 0 ? `  ...and ${hiddenCount} more` : "",
        "Choose a fresh --copy-to or re-run with --force only after explicit approval.",
      ].filter(Boolean).join("\n"),
    );
  }

  if (dryRun) {
    console.log(`Would copy ${files.length} Figma importer plugin file(s) to ${copyTarget}.`);
    printCopyNextSteps(displayRoot, copyTarget);
    return;
  }

  mkdirSync(copyTarget, { recursive: true });
  for (const file of files) {
    const targetPath = join(copyTarget, file.relativePath);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(file.absolutePath, targetPath);
    chmodSync(targetPath, file.mode & 0o777);
  }

  console.log(`Copied ${files.length} Figma importer plugin file(s) to ${copyTarget} (repo copy).`);
  console.log("Commit the copy so designers get the plugin via git pull; record the");
  console.log("distribution decision (repo copy vs skill-folder manifest) in the implementation map.");
  printCopyNextSteps(displayRoot, copyTarget);
}

function printCopyNextSteps(displayRoot, copyTarget) {
  const manifestPath = join(copyTarget, "manifest.json");
  const relativeManifestPath = toPosix(relative(displayRoot, manifestPath));

  console.log("");
  console.log("Figma Desktop setup (once per designer machine):");
  console.log("1. Open Figma Desktop.");
  console.log("2. Go to Plugins > Development > Import plugin from manifest...");
  console.log(`3. Select ${relativeManifestPath}`);
  console.log("4. In Storybook, export JSON, then import it with Storybook Code To Design.");
  console.log("");
  console.log("Updates: re-run this script with --copy-to and --force when the skill");
  console.log("bundles a newer plugin, then commit; designers just git pull — a dev");
  console.log("plugin re-reads its runtime on every run, so no re-import is needed.");
}

function toPosix(value) {
  return value.split(sep).join("/");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.productRoot) {
      assertProductRoot(options.productRoot);
    }
    assertBundledPlugin();
    const info = readBundledPluginInfo();

    if (options.copyTarget) {
      copyPluginFiles(options);
    } else {
      reportCentral(info, options.productRoot);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printUsage();
    process.exit(1);
  }
}
