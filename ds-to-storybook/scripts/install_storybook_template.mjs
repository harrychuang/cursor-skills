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
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(scriptDir, "..");
const templateRoot = join(skillRoot, "storybook-template");
const excludedPathSegments = new Set([
  ".git",
  ".agents",
  ".claude",
  ".cursor",
  ".spectra",
  "node_modules",
  "storybook-static",
]);
const excludedFiles = new Set([".DS_Store", ".cursorrules", ".spectra.yaml"]);

function printUsage() {
  console.error(
    [
      "Usage: node <skill-root>/scripts/install_storybook_template.mjs <target-root> --name <project-name> --prefix <token-prefix> [--package-name <name>] [--figma-url <url>] [--keep-example] [--copy-only] [--dry-run] [--force]",
      "Copies the bundled storybook-template into target-root, refuses file collisions by default, then runs scripts/init-storybook-template.mjs unless --copy-only is set.",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const parsed = {
    copyOnly: false,
    dryRun: false,
    force: false,
    keepExample: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--copy-only") {
      parsed.copyOnly = true;
      continue;
    }

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      parsed.force = true;
      continue;
    }

    if (arg === "--keep-example") {
      parsed.keepExample = true;
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

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}.`);
    }

    positionals.push(arg);
  }

  if (positionals.length !== 1) {
    throw new Error("Expected exactly one target root.");
  }

  parsed.targetRoot = resolve(positionals[0]);
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
    excludedPathSegments.has(part)
  );
}

function collectFiles(currentRoot, files = []) {
  const entries = readdirSync(currentRoot, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = join(currentRoot, entry.name);
    const relativePath = relative(templateRoot, absolutePath);

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

function assertTemplateExists() {
  if (!existsSync(templateRoot)) {
    throw new Error(`Missing bundled template: ${templateRoot}`);
  }

  const packageJsonPath = join(templateRoot, "package.json");
  const initializerPath = join(
    templateRoot,
    "scripts/init-storybook-template.mjs",
  );
  if (!existsSync(packageJsonPath) || !existsSync(initializerPath)) {
    throw new Error(
      "Bundled storybook-template is incomplete: expected package.json and scripts/init-storybook-template.mjs.",
    );
  }
}

function copyTemplateFiles({ targetRoot, dryRun, force }) {
  const files = collectFiles(templateRoot);
  const collisions = files
    .map((file) => ({
      ...file,
      targetPath: join(targetRoot, file.relativePath),
    }))
    .filter((file) =>
      targetDiffersFromFile(file.absolutePath, file.targetPath)
    );

  if (collisions.length > 0 && !force) {
    const shown = collisions.slice(0, 40).map((file) => file.relativePath);
    const hiddenCount = collisions.length - shown.length;
    throw new Error(
      [
        `Refusing to overwrite ${collisions.length} existing file(s) in ${targetRoot}.`,
        ...shown.map((file) => `  - ${file}`),
        hiddenCount > 0 ? `  ...and ${hiddenCount} more` : "",
        "Choose a fresh target root/subfolder or re-run with --force only after explicit approval.",
      ].filter(Boolean).join("\n"),
    );
  }

  if (dryRun) {
    console.log(`Would copy ${files.length} template file(s) to ${targetRoot}.`);
    return;
  }

  mkdirSync(targetRoot, { recursive: true });
  for (const file of files) {
    const targetPath = join(targetRoot, file.relativePath);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(file.absolutePath, targetPath);
    chmodSync(targetPath, file.mode & 0o777);
  }

  console.log(`Copied ${files.length} template file(s) to ${targetRoot}.`);
}

function runInitializer(options) {
  if (options.copyOnly || options.dryRun) {
    return;
  }

  if (!options.name || !options.prefix) {
    throw new Error("--name and --prefix are required unless --copy-only is set.");
  }

  const initializerArgs = [
    join(options.targetRoot, "scripts/init-storybook-template.mjs"),
    "--name",
    options.name,
    "--prefix",
    options.prefix,
  ];

  if (options.packageName) {
    initializerArgs.push("--package-name", options.packageName);
  }

  if (options.figmaUrl) {
    initializerArgs.push("--figma-url", options.figmaUrl);
  }

  if (options.keepExample) {
    initializerArgs.push("--keep-example");
  }

  if (options.force) {
    initializerArgs.push("--force");
  }

  const result = spawnSync(process.execPath, initializerArgs, {
    cwd: options.targetRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `Template initializer failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  assertTemplateExists();
  copyTemplateFiles(options);
  runInitializer(options);
} catch (error) {
  printUsage();
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
