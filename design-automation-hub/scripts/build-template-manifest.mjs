#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const installerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(installerRoot, "template");
const manifestPath = path.join(templateRoot, "TEMPLATE_MANIFEST.json");

const targetFor = (source) => {
  if (source.startsWith("figma/")) return source;
  if (source.startsWith("scripts/")) return source;
  if (source.startsWith("skills/figma-design-automation/")) {
    return `.agents/${source}`;
  }
  if (source === "project-profile.example.json") return ".design-automation/project.json";
  if (source === "agent-automation-task.fragment.json") return ".agent-automation/config.json";
  if (source === "gitignore.fragment") return ".gitignore";
  throw new Error(`No manifest target mapping for ${source}`);
};

const ownershipFor = (source) => {
  if (source === "project-profile.example.json") return "generated";
  if (source === "agent-automation-task.fragment.json" || source === "gitignore.fragment") return "merge";
  return "managed";
};

const TASK_BOARD_DISPATCH_SOURCES = new Set([
  "scripts/design-automation-hub/dispatch.mjs",
  "scripts/design-automation-hub/task-board-binding.mjs",
  "scripts/design-automation-hub/task-board-client.mjs",
]);

// Deterministic module membership: entries without a module field are core.
const moduleFor = (source) => (TASK_BOARD_DISPATCH_SOURCES.has(source) ? "task-board-dispatch" : null);

const files = [];
const visit = (directory, prefix = "") => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (relativePath === "TEMPLATE_MANIFEST.json") continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolutePath, relativePath);
    else if (entry.isFile()) {
      const module = moduleFor(relativePath);
      files.push({
        source: relativePath,
        target: targetFor(relativePath),
        ownership: ownershipFor(relativePath),
        ...(module ? { module } : {}),
        sha256: crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex"),
      });
    } else {
      throw new Error(`Template contains unsupported entry: ${relativePath}`);
    }
  }
};
visit(templateRoot);

const sourceSync = [
  "figma/design-automation-hub/manifest.json",
  "figma/design-automation-hub/main.js",
  "figma/design-automation-hub/ui.html",
].map((templatePath) => ({
  templatePath,
  productPath: templatePath,
  sha256: files.find((entry) => entry.source === templatePath).sha256,
}));

const manifest = {
  schemaVersion: 1,
  templateVersion: "1.1.0",
  minimumAgentAutomationVersion: "1.0.0",
  modules: {
    "task-board-dispatch": { optional: true },
  },
  files,
  manualActions: [
    {
      code: "import-figma-manifest",
      ownership: "manual",
      target: "figma/design-automation-hub/manifest.json",
      completed: false,
    },
  ],
  sourceSync: {
    contractVersion: 1,
    files: sourceSync,
  },
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${manifestPath}\n`);
