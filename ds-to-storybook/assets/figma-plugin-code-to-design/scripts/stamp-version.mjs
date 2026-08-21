#!/usr/bin/env node

// Stamps the package.json version into code.ts (PLUGIN_VERSION, with build
// date) and the ui.html fallback badge, so the version shown in the plugin UI
// can never drift from the released package version. Runs automatically via
// the prebuild hook; skips rewriting when the stamped version already matches
// so unchanged builds stay diff-free.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  readFileSync(path.join(pluginRoot, "package.json"), "utf8"),
);

if (!version) {
  console.error("[stamp-version] package.json has no version.");
  process.exit(1);
}

const codePath = path.join(pluginRoot, "code.ts");
const codeSource = readFileSync(codePath, "utf8");
const versionPattern = /const PLUGIN_VERSION = "([^"]*)";/;
const currentStamp = codeSource.match(versionPattern)?.[1];

if (currentStamp === undefined) {
  console.error(`[stamp-version] PLUGIN_VERSION constant not found in ${codePath}.`);
  process.exit(1);
}

if (currentStamp.startsWith(`${version} (`)) {
  console.log(`[stamp-version] code.ts already at ${currentStamp}; skipped.`);
} else {
  const stamp = `${version} (${new Date().toISOString().slice(0, 10)})`;
  writeFileSync(
    codePath,
    codeSource.replace(versionPattern, `const PLUGIN_VERSION = "${stamp}";`),
  );
  console.log(`[stamp-version] code.ts -> ${stamp}`);
}

const uiPath = path.join(pluginRoot, "ui.html");
const uiSource = readFileSync(uiPath, "utf8");
const badgePattern = /(id="plugin-version"[^>]*>)build [^<]*(<)/;

if (!badgePattern.test(uiSource)) {
  console.error(`[stamp-version] plugin-version badge not found in ${uiPath}.`);
  process.exit(1);
}

const nextUiSource = uiSource.replace(badgePattern, `$1build ${version}$2`);
if (nextUiSource === uiSource) {
  console.log(`[stamp-version] ui.html already at build ${version}; skipped.`);
} else {
  writeFileSync(uiPath, nextUiSource);
  console.log(`[stamp-version] ui.html -> build ${version}`);
}
