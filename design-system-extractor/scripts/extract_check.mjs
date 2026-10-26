#!/usr/bin/env node

// One command for the extraction checkpoint: runs the three audits and (unless
// --audits-only) both HTML generators, prints every step's output under its own
// header, then one STEP | RESULT table. Every step runs even when an earlier one
// fails, so a single invocation reports the whole package state.
//
// The sibling scripts stay callable on their own; this file only spawns them.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_LOCALES = ["zh-Hant", "en", "ja"];
const DEFAULT_LOCALE = "zh-Hant";

const USAGE = `Usage: node <skill-root>/scripts/extract_check.mjs <target-root> [--starter] [--audits-only] [--locale <zh-Hant|en|ja>] [--json]

Runs, in order and regardless of earlier failures:
  audit_sources.mjs <target-root> --strict
  audit_tokens.mjs <target-root> --strict
  audit_components.mjs <target-root> --strict
  generate_docs_html.mjs <target-root> --locale <locale>
  generate_review_html.mjs <target-root>

Options:
  --starter       Run the audits without --strict (empty starter package only).
  --audits-only   Skip generate_docs_html.mjs and generate_review_html.mjs.
  --locale <tag>  UI locale for generate_docs_html.mjs: zh-Hant (default), en, ja.
  --json          Print only {mode, steps:[{script, exit, pass}], passed} on stdout.
  --help, -h      Print this message and exit 0.

Exit code: 1 if any audit or generator failed, 0 otherwise (2 for a usage error).`;

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

function usageError(message) {
  console.error(`extract_check: ${message}\n\n${USAGE}`);
  process.exit(2);
}

const rawArgs = process.argv.slice(2);
let starter = false;
let auditsOnly = false;
let jsonMode = false;
let locale = DEFAULT_LOCALE;
const positional = [];

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (arg === "--help" || arg === "-h") {
    console.log(USAGE);
    process.exit(0);
  } else if (arg === "--starter") {
    starter = true;
  } else if (arg === "--audits-only") {
    auditsOnly = true;
  } else if (arg === "--json") {
    jsonMode = true;
  } else if (arg === "--strict") {
    // Strict is the default; the flag is accepted silently so habits from the
    // individual audit scripts do not turn into usage errors.
  } else if (arg === "--locale") {
    locale = rawArgs[index + 1];
    index += 1;
    if (locale === undefined) usageError("--locale needs a value (zh-Hant, en or ja).");
  } else if (arg.startsWith("--locale=")) {
    locale = arg.slice("--locale=".length);
  } else if (arg.startsWith("-")) {
    usageError(`Unknown option "${arg}".`);
  } else {
    positional.push(arg);
  }
}

if (!positional.length) usageError("Missing <target-root>.");
if (positional.length > 1) usageError(`Expected one <target-root>, got ${positional.length}.`);
if (!SUPPORTED_LOCALES.includes(locale)) {
  usageError(`Unsupported --locale "${locale}". Supported values: ${SUPPORTED_LOCALES.join(", ")}.`);
}

const targetRoot = path.resolve(positional[0]);
const mode = starter ? "starter" : "strict";
const auditFlags = starter ? [] : ["--strict"];

const steps = [
  { script: "audit_sources.mjs", args: [targetRoot, ...auditFlags] },
  { script: "audit_tokens.mjs", args: [targetRoot, ...auditFlags] },
  { script: "audit_components.mjs", args: [targetRoot, ...auditFlags] },
];
if (!auditsOnly) {
  steps.push(
    { script: "generate_docs_html.mjs", args: [targetRoot, "--locale", locale] },
    { script: "generate_review_html.mjs", args: [targetRoot] },
  );
}

const results = [];
for (const step of steps) {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, step.script), ...step.args], {
    encoding: "utf8",
  });
  const exit = result.error ? 1 : result.status ?? 1;
  const stderr = result.error ? `${result.stderr || ""}${result.error.message}\n` : result.stderr || "";
  results.push({ script: step.script, exit, pass: exit === 0, stdout: result.stdout || "", stderr });
}

const passed = results.every((result) => result.pass);

if (jsonMode) {
  const payload = {
    mode,
    steps: results.map(({ script, exit, pass }) => ({ script, exit, pass })),
    passed,
  };
  console.log(JSON.stringify(payload, null, 2));
  process.exit(passed ? 0 : 1);
}

for (const result of results) {
  console.log(`== ${result.script} ==`);
  if (result.stdout) process.stdout.write(result.stdout.endsWith("\n") ? result.stdout : `${result.stdout}\n`);
  if (result.stderr) process.stdout.write(result.stderr.endsWith("\n") ? result.stderr : `${result.stderr}\n`);
  console.log("");
}

console.log(`Mode: ${mode}${auditsOnly ? " (audits only)" : ` (docs locale ${locale})`}`);
console.log("STEP | RESULT");
for (const result of results) {
  console.log(`${result.script} | ${result.pass ? "PASS" : `FAIL (exit ${result.exit})`}`);
}

const failedCount = results.filter((result) => !result.pass).length;
console.log("");
console.log(
  passed
    ? `extract_check passed (${results.length} steps).`
    : `extract_check failed: ${failedCount} of ${results.length} steps failed.`,
);
process.exit(passed ? 0 : 1);
