import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const manifestCandidates = [
  "outputs/storybook-tools/TEMPLATE_MANIFEST.json",
  "outputs/component-coverage/TEMPLATE_MANIFEST.json",
  "TEMPLATE_MANIFEST.json",
];
const manifestPath = manifestCandidates.find((candidate) => existsSync(candidate));

if (!manifestPath) {
  console.error(
    `Component coverage agent skill check failed:\n- Missing template manifest. Expected one of: ${manifestCandidates.join(", ")}.`,
  );
  process.exit(1);
}

let manifest;

try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.error(
    `Component coverage agent skill check failed:\n- Could not parse ${manifestPath}: ${error instanceof Error ? error.message : String(error)}.`,
  );
  process.exit(1);
}

const coverageManifest = manifest.tools ? manifest.tools["component-coverage"] : manifest;
const installTargets = coverageManifest?.installTargets;
const expectedHashes = coverageManifest?.skillContentSha256;
const issues = [];
let checkedCopies = 0;

function sha256(contents) {
  const normalizedContents = contents.toString("utf8").replace(/\r\n/g, "\n");

  return createHash("sha256").update(normalizedContents).digest("hex");
}

function collectImplementSkillContractIssues(contents, pathLabel) {
  const skill = contents.toString("utf8").replace(/\r\n/g, "\n");
  const requiredPhrases = [
    ["component-coverage-implement remains the orchestrator", "This skill remains the orchestrator"],
    ["design-system-to-storybook companion", "$design-system-to-storybook"],
    ["design-system governance companion", "$design-system-governance"],
    ["scoped Component pass", "`Component pass` only for the reviewed `extend` and `build-new` items"],
    ["reuse-only bypass", "A **reuse-only** work list"],
    ["reuse-only avoids Component pass", "does not load or execute the `Component pass`"],
    ["reuse-only preserves component APIs", "does not mutate shared component APIs"],
    ["companion gate precedes mutation", "before any component mutation"],
    ["missing companion is actionable", "must be installed or made discoverable"],
    ["extracted component spec precedence", "extracted component spec and its tokens are normative"],
    ["derived brief provenance", "`brief-derived` or `implementation-derived`"],
    ["derived review marker", "`needs-review`"],
    ["token-backed source completion", "token-backed source"],
    ["Autodocs completion", "co-located Autodocs story"],
    ["catalog completion", "catalog registration"],
    ["component document completion", "component document"],
    ["inventory completion", "inventory entry"],
    ["implementation map completion", "implementation-map decision"],
    ["queue completion", "updated queue row when a queue exists"],
    ["source URL completion", "best resolved story source URL"],
    ["explicit no-URL decision", "explicit no-URL decision"],
    ["immutable report", "MUST NOT modify the report"],
    ["Storybook build check", "available Storybook build check"],
  ];
  const drift = [];

  for (const [contract, phrase] of requiredPhrases) {
    if (!skill.includes(phrase)) {
      drift.push(`${pathLabel}: implement skill contract drift - missing ${contract}.`);
    }
  }

  if (!/conflicts with it,[\s\S]*stop the affected component work before mutation[\s\S]*keep the report unchanged/i.test(skill)) {
    drift.push(`${pathLabel}: implement skill contract drift - missing extracted-contract conflict gate.`);
  }
  if (!/must not bootstrap a Storybook template[\s\S]*replace the renderer or builder[\s\S]*install or upgrade[\s\S]*addon[\s\S]*importer/i.test(skill)) {
    drift.push(`${pathLabel}: implement skill contract drift - missing per-request setup prohibition.`);
  }

  return drift;
}

if (process.argv.includes("--fixture-missing-implement-contract")) {
  const fixtureIssues = collectImplementSkillContractIssues(
    "A confirmed report can directly create a component.",
    "in-memory/component-coverage-implement",
  );
  if (fixtureIssues.length === 0) {
    console.error("Component coverage agent skill check failed:\n- Semantic drift fixture unexpectedly passed.");
    process.exit(2);
  }
  console.error("Component coverage agent skill check failed:");
  for (const issue of fixtureIssues) console.error(`- ${issue}`);
  process.exit(1);
}

if (
  !installTargets ||
  typeof installTargets !== "object" ||
  Array.isArray(installTargets)
) {
  issues.push(`${manifestPath}: installTargets must be an object.`);
}

if (
  !expectedHashes ||
  typeof expectedHashes !== "object" ||
  Array.isArray(expectedHashes)
) {
  issues.push(`${manifestPath}: skillContentSha256 must be an object.`);
}

if (issues.length === 0) {
  for (const [source, targets] of Object.entries(installTargets)) {
    const expectedHash = expectedHashes[source];

    if (!Array.isArray(targets) || targets.length === 0) {
      issues.push(`${source}: installTargets must declare at least one target.`);
      continue;
    }

    if (new Set(targets).size !== targets.length) {
      issues.push(`${source}: installTargets contains duplicate target paths.`);
    }

    if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) {
      issues.push(`${source}: missing or invalid skillContentSha256 value.`);
      continue;
    }

    if (existsSync(source)) {
      const sourceHash = sha256(readFileSync(source));

      if (sourceHash !== expectedHash) {
        issues.push(
          `${source}: template source hash ${sourceHash} does not match manifest ${expectedHash}.`,
        );
      }
    }

    let canonicalContents = null;
    let canonicalPath = null;

    for (const target of targets) {
      if (typeof target !== "string" || target.length === 0) {
        issues.push(`${source}: installTargets contains an invalid target path.`);
        continue;
      }

      if (!existsSync(target)) {
        issues.push(`${source}: missing installed copy ${target}.`);
        continue;
      }

      const contents = readFileSync(target);
      const actualHash = sha256(contents);
      checkedCopies += 1;

      if (actualHash !== expectedHash) {
        issues.push(
          `${target}: normalized content hash ${actualHash} does not match manifest ${expectedHash}.`,
        );
      }

      if (canonicalContents && !canonicalContents.equals(contents)) {
        issues.push(`${target}: content drifted from ${canonicalPath}.`);
      } else if (!canonicalContents) {
        canonicalContents = contents;
        canonicalPath = target;
      }
    }

    if (source === "skills/component-coverage-implement/SKILL.md" && canonicalContents) {
      issues.push(...collectImplementSkillContractIssues(canonicalContents, canonicalPath));
    }
  }

  for (const source of Object.keys(expectedHashes)) {
    if (!(source in installTargets)) {
      issues.push(`${source}: skillContentSha256 has no installTargets entry.`);
    }
  }
}

if (issues.length > 0) {
  console.error("Component coverage agent skill check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  `Component coverage agent skill check passed: ${Object.keys(installTargets).length} skills and ${checkedCopies} installed copies match ${manifestPath}.`,
);
