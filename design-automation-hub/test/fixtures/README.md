# Installer acceptance fixtures

The deterministic checker creates temporary repositories for template, install, update, conflict, rollback, companion-contract, host-adapter, and fake-runner smoke cases.

`manual-two-project-acceptance.json` is intentionally separate. It records the one acceptance step that filesystem tests cannot prove:

1. install the same release candidate into two repositories with different explicit project profiles;
2. start each local Coordinator;
3. in Figma Desktop, import the reported manifest identity once;
4. open one real Figma file for each profile;
5. confirm cleanup and workflow status are visible, review is hidden in standalone mode, and fixed Plugin copy contains neither project name.

The fixed Plugin connects to local port `8787`. Run the two standalone
Coordinators sequentially: finish project A, stop it, then start project B on
the same port. Do not treat a port collision from simultaneous Coordinators as
an acceptance failure.

Do not store real Figma file keys in the fixture. For each profile, set
`realFigmaFileKeyVerified` only after using a real key. Record the shared
manifest import once in the top-level `manifest` object; project entries record
profile, health, and context verification only.

Keep `status: "pending"` until a human completes every required boolean and
adds `completedBy` plus an ISO-8601 `completedAt`. Only then bump the template
and acceptance evidence to the next release version, rebuild the manifest, and
run the full acceptance commands documented by the skill.

The checker enforces this gate: `templateVersion` here must equal the template
manifest version, and once that version is a release version the checker fails
with `manual-two-project-acceptance-incomplete` unless every project boolean,
every entry in `checks`, `manifest.absolutePathVerified`,
`manifest.importedOnce`, `completedBy`, and a parseable `completedAt` are
present. Re-record acceptance for each new release version rather than carrying
an older record forward.
