#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MARKER = "__DESIGN_AUTOMATION_HOST_SMOKE__";
const installerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hostModulePath = path.join(
  installerRoot,
  "template/scripts/design-automation-hub/host.mjs",
);
const ALLOWED_CODES = new Set([
  "incomplete-review-adapter",
  "unsupported-host-contract",
  "invalid-host-adapter",
]);

function emit(value) {
  process.stdout.write(`${MARKER}${JSON.stringify(value)}\n`);
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!["--project-root", "--host-adapter"].includes(token)) {
      throw Object.assign(new Error("Unknown option."), { code: "invalid-host-adapter" });
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw Object.assign(new Error("Missing option value."), { code: "invalid-host-adapter" });
    }
    options[token === "--project-root" ? "projectRoot" : "hostAdapter"] = value;
    index += 1;
  }
  if (!options.projectRoot || !options.hostAdapter) {
    throw Object.assign(new Error("Required option is missing."), { code: "invalid-host-adapter" });
  }
  return options;
}

try {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = fs.realpathSync(options.projectRoot);
  if (fs.realpathSync(process.cwd()) !== projectRoot) {
    throw Object.assign(new Error("Smoke cwd must equal the project root."), {
      code: "invalid-host-adapter",
    });
  }
  const adapterPath = fs.realpathSync(options.hostAdapter);
  if (!inside(projectRoot, adapterPath)) {
    throw Object.assign(new Error("Adapter escaped the project root."), {
      code: "invalid-host-adapter",
    });
  }
  const adapterModule = await import(`${pathToFileURL(adapterPath).href}?smoke=${Date.now()}`);
  const hostModule = await import(pathToFileURL(hostModulePath).href);
  const descriptor = await hostModule.smokeHostAdapter(
    adapterModule.designAutomationHubHostAdapter,
  );
  emit({
    ok: true,
    descriptor: {
      contractVersion: descriptor.contractVersion,
      reviewEnabled: descriptor.reviewEnabled,
      reviewMethods: descriptor.reviewMethods,
    },
  });
} catch (error) {
  const code = error?.code === "ERR_ACCESS_DENIED"
    ? "host-adapter-smoke-wrote-files"
    : ALLOWED_CODES.has(error?.code)
      ? error.code
      : "invalid-host-adapter";
  emit({ ok: false, code });
  process.exitCode = 1;
}
