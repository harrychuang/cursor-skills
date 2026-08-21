#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(testDir, "..");
const skillRoot = path.resolve(pluginRoot, "..", "..");
const templatePluginRoot = path.join(
  skillRoot,
  "storybook-template",
  "figma",
  "storybook-code-to-design",
);
const installerPath = path.join(skillRoot, "scripts", "install_figma_import_plugin.mjs");
const { assertValidDevelopmentDomains } = await import(pathToFileURL(installerPath));

const expectedDevelopmentDomains = [
  "http://localhost:6006",
  "http://localhost:6007",
  "http://localhost:6008",
  "http://localhost:8080",
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readDevelopmentDomains(root) {
  return readJson(path.join(root, "manifest.json")).networkAccess?.devAllowedDomains;
}

const canonicalDomains = readDevelopmentDomains(pluginRoot);
const templateDomains = readDevelopmentDomains(templatePluginRoot);
const packageJson = readJson(path.join(pluginRoot, "package.json"));
const packageLock = readJson(path.join(pluginRoot, "package-lock.json"));

assert.deepEqual(
  canonicalDomains,
  expectedDevelopmentDomains,
  "canonical manifest uses the exact localhost-only development allowlist",
);
assert.deepEqual(
  templateDomains,
  expectedDevelopmentDomains,
  "template manifest uses the exact localhost-only development allowlist",
);
assert.deepEqual(
  templateDomains,
  canonicalDomains,
  "template and canonical manifests stay in sync",
);
assert.doesNotThrow(
  () => assertValidDevelopmentDomains({ networkAccess: { devAllowedDomains: canonicalDomains } }),
  "installer accepts the canonical localhost-only allowlist",
);
assert.throws(
  () =>
    assertValidDevelopmentDomains({
      networkAccess: {
        devAllowedDomains: [...expectedDevelopmentDomains, "http://127.0.0.1:6006"],
      },
    }),
  /127\.0\.0\.1.*localhost/i,
  "installer rejects IPv4 literals with localhost guidance",
);
assert.throws(
  () =>
    assertValidDevelopmentDomains({
      networkAccess: {
        devAllowedDomains: [...expectedDevelopmentDomains, "http://[::1]:6006"],
      },
    }),
  /\[::1\].*localhost/i,
  "installer rejects IPv6 literals with localhost guidance",
);
assert.throws(
  () =>
    assertValidDevelopmentDomains({
      networkAccess: { devAllowedDomains: ["http://localhost:*"] },
    }),
  /must exactly match/i,
  "installer rejects wildcard or incomplete allowlists",
);

assert.equal(packageJson.version, "1.9.0", "canonical package uses release version 1.9.0");
assert.equal(packageLock.version, packageJson.version, "lockfile version matches package version");
assert.equal(
  packageLock.packages?.[""]?.version,
  packageJson.version,
  "lockfile root package version matches package version",
);

const codeTs = readFileSync(path.join(pluginRoot, "code.ts"), "utf8");
const codeJs = readFileSync(path.join(pluginRoot, "code.js"), "utf8");
const uiHtml = readFileSync(path.join(pluginRoot, "ui.html"), "utf8");
assert.match(
  codeTs,
  new RegExp(`const PLUGIN_VERSION = "${packageJson.version} \\(\\d{4}-\\d{2}-\\d{2}\\)";`),
  "TypeScript source carries the package version and build date",
);
assert.match(
  codeJs,
  new RegExp(`var PLUGIN_VERSION = "${packageJson.version} \\(\\d{4}-\\d{2}-\\d{2}\\)";`),
  "generated runtime carries the package version and build date",
);
assert.match(
  uiHtml,
  new RegExp(`id="plugin-version"[^>]*>build ${packageJson.version}<`),
  "plugin UI badge matches the package version",
);

for (const file of ["manifest.json", "code.js", "ui.html", "README.md"]) {
  assert.equal(
    readFileSync(path.join(templatePluginRoot, file), "utf8"),
    readFileSync(path.join(pluginRoot, file), "utf8"),
    `template ${file} matches the canonical release file`,
  );
}

for (const root of [pluginRoot, templatePluginRoot]) {
  const ui = readFileSync(path.join(root, "ui.html"), "utf8");
  const readme = readFileSync(path.join(root, "README.md"), "utf8");

  assert.match(
    ui,
    /value="http:\/\/localhost:6006"/,
    `${root} UI defaults to the supported localhost URL`,
  );
  assert.doesNotMatch(
    readme,
    /127\.0\.0\.1/,
    `${root} README does not advertise an IP-literal development origin`,
  );
}

console.log("verify-manifest: all assertions passed");
