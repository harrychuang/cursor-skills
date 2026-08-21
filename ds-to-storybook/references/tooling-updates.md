# Tool Distribution And Updates

Use this reference when the user asks to update this skill or its bundled tools (the Figma export addon or the Storybook Code To Design importer), when `install_figma_export_addon.mjs --check` reports an update or a legacy layout, when a version badge looks stale, or when the user asks how tool updates work. Always end such a pass by telling the user what changed, in their language.

## Distribution Model

The two tools ship inside this skill but update on different layers. Keep the three layers separate when explaining or executing an update:

| Layer | What lives there | Update action | Frequency |
|---|---|---|---|
| Machine (skill + importer) | the skills repo checkout and the installed skill copy (for example `~/.claude/skills/design-system-to-storybook/`) | `git pull` the skills repo, then `install_agent_skill.mjs --agent <agent> --scope user --force` | each time a new tool version ships |
| Project (export addon + importer repo copy) | `.storybook/vendor/harrychuang-storybook-addon-figma-export-<version>.tgz` plus the `file:` devDependency; for team repos also the committed importer copy at `figma/storybook-code-to-design/` | re-run `install_figma_export_addon.mjs`; refresh the importer repo copy with `install_figma_import_plugin.mjs <repo> --copy-to figma/storybook-code-to-design --force`; commit | once per product repo per release |
| Figma (importer) | dev plugin loaded once per machine from a manifest — either the committed repo copy (`<repo>/figma/storybook-code-to-design/manifest.json`, team default) or the skill-folder manifest (`<skill-root>/assets/figma-plugin-code-to-design/manifest.json`, solo machines) | none after the first import — refreshing the files behind the imported path (`git pull` or skill reinstall) is enough because Figma re-reads the runtime on every run | Figma import happens once per machine, ever |

The export addon is a per-project dependency, so every product repo upgrades explicitly and the upgrade is visible in that repo's git history. The importer is machine-level Figma tooling with two distribution channels chosen by audience: a solo developer with the skill installed loads the skill-folder manifest (a hidden path — use `Cmd+Shift+G` in the Figma file dialog), while a team whose designers have no agent skill folder commits the repo copy so designers get the plugin via `git pull` from a visible, stable path (see the Figma Import Plugin Gate).

## Update Journey For An Existing Skill User

Run these in order when helping a developer catch up to the latest tools:

1. **Machine.** In the skills repo checkout: `git pull`, then refresh the installed skill copy:

   ```sh
   node design-system-to-storybook/scripts/install_agent_skill.mjs --agent claude --scope user --force
   ```

   Use the matching `--agent` value when the developer also uses Codex or Cursor. After this step the machine has the newest addon asset, importer runtime, and installers.

2. **Export addon, in each product repo that uses it.**

   ```sh
   node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root> --check
   node <skill-root>/scripts/install_figma_export_addon.mjs <product-repo-root>
   ```

   `--check` exit codes: 0 up to date, 2 not installed, 3 update available or legacy copied-directory layout. The plain run detects renderer/builder/major, upgrades the versioned tarball and `file:` spec, prunes old tarballs, migrates the legacy directory, and generates full React/Vue Vite or core-only renderer-neutral wiring according to the capability report. Then commit the tarball, `package.json`, lockfile, generated wiring, and changed Storybook config files — teammates and CI pick the upgrade up through `git pull` plus their normal package-manager install, with no skill required.

3. **Importer, per channel.**
   - **Team repos:** refresh the committed repo copy and commit it —

     ```sh
     node <skill-root>/scripts/install_figma_import_plugin.mjs <product-repo-root> --copy-to figma/storybook-code-to-design --force
     ```

     Designers `git pull`; the dev plugin re-reads its runtime on every run, so no re-import. If a designer machine has never loaded the plugin, import `<repo>/figma/storybook-code-to-design/manifest.json` once in Figma Desktop (`Plugins > Development > Import plugin from manifest...`).
   - **Solo machines:** the skill refresh in step 1 already updated the skill-folder manifest in place; nothing else to do. First-time setup imports `<skill-root>/assets/figma-plugin-code-to-design/manifest.json` — a hidden path, so press `Cmd+Shift+G` in the file dialog and paste it.
   - `install_figma_import_plugin.mjs [product-repo-root]` re-prints the version, manifest paths, setup steps, and whether an existing repo copy is current or needs the `--copy-to --force` refresh. Watch for stale registrations: dev plugin entries in Figma that point at deleted or outdated manifests keep producing manifest errors at load time until removed in `Plugins > Development`.

Template workspaces (created from the bundled `storybook-template`) are the exception: they stay self-contained. Their addon updates through the template's vendored copy plus `postinstall` patch script, and their bundled importer manifest stays valid.

## Compatibility When Updating

The payload contract stays at version 2 with optional fidelity fields, so the two tools never require lockstep updates. New capture capabilities always ship as fields older importers ignore (for example addon 0.5.0+ emits `textGrowHeight`, `styles.blurEffects`, and `styles.transformMatrix` instead of new enum values inside fields that older importers validate strictly):

| Payload from | Old importer (≤1.2.4) | Current importer |
|---|---|---|
| Old export addon | imports as before | imports with behavior identical to that importer |
| Current export addon | imports; newer fidelity fields (background image fills on frames, radial gradients, blur effects, dashed/dotted borders, fixed-width height growth) are ignored and degrade visually | full fidelity |

Data needs no migration: the importer keeps reading and writing the same plugin data keys (`storybookCssToken` plus the legacy `cmCssToken`), so variables in existing Figma files keep deduplicating, and previously downloaded `.sbfx.json` files stay importable.

API watchlist when upgrading a product repo from a pre-0.2.0 addon (standard README wiring is unaffected — these only matter when project code reached into addon internals):

- The `FigmaCodeExporter` React component no longer exists; the overlay is internal plain DOM driven by the standard decorator.
- `registerFigmaExportTool` is importable only from the `/manager` subpath, no longer re-exported from the package root.
- The `.sbfx-story-scope` wrapper element is gone; exports scope to the `storybook-root` preview element, so preview-only chrome belongs outside it.
- The preview and review entries import no React, React DOM, or Storybook icons. Vue 3 + Vite + Storybook 10 has the same verified Review, Visual Comments, persistence, report, and source-action workflow as React + Vite; other supported Storybook 10 renderers receive core export unless separately validated.

If the overlay badge still shows the old version after an upgrade, clear the Storybook prebundle cache and restart: `rm -rf node_modules/.cache/storybook`.

## Version Visibility

Point the user at these instead of guessing:

- **Export addon:** the Storybook overlay title shows a `v<version>` badge (visible even when collapsed) and the overlay root carries `data-version`; `--check` prints bundled vs installed versions.
- **Importer:** the plugin UI shows a `build <version>` badge; the importer script's default mode prints the package version and the runtime stamp and warns when they drift.
- Versions are stamped automatically — the addon's from its `package.json` via the tsup `define`, the importer's via its `prebuild` stamp script. Never hand-edit `PLUGIN_VERSION`, the UI badge, or a built `dist/` version string; bump the tool's `package.json` and rebuild instead.

## What To Tell The User After An Update

Report, in the user's language:

- which layers were touched and the version change per tool (for example "export addon 0.1.0 → 0.2.0, importer already at 1.2.1")
- per-project: that the tarball, `package.json`, lockfile, and (for team repos) the refreshed importer repo copy need to be committed, and that teammates only need `git pull` plus install
- machine: that other machines repeat the `git pull` + `install_agent_skill.mjs --force` step
- Figma: whether a one-time manifest import applies (first setup on a machine, or switching channels — for example from a hidden skill-folder manifest to the committed repo copy), and that stale dev plugin registrations pointing at deleted manifests must be removed in `Plugins > Development`
- how to self-check later: the version badges and `--check`

## Maintainer Release Flow

When shipping a new tool version through this skill:

1. Edit the tool under `assets/` (`figma-export-addon/src/` or `figma-plugin-code-to-design/`).
2. Bump that tool's `package.json` version — installers and stamps key off it; never ship changed `dist/` or runtime output without a bump.
3. Rebuild: `npm run build` in the tool directory (the addon injects its version via tsup; the importer's `prebuild` stamps `code.ts` and `ui.html`).
4. Run the addon's package, renderer-neutral, React/Vue fixture/parity, plugin-code, and visual-comment tests (`test/run-*.mjs`), or the importer's `test/verify-*.cjs` checks.
5. Sync the addon into `storybook-template/vendor/figma-export/` and `storybook-template/.storybook/vendor/figma-export-addon/`, then run `node design-system-to-storybook/scripts/check_figma_export_addon_mirrors.mjs`; sync the importer into `storybook-template/figma/storybook-code-to-design/` (`manifest.json`, built `code.js`, `ui.html`, `README.md`).
6. Commit and push the skills repo, then follow the update journey above on each machine.

If the company later gains Figma Organization private publishing, the importer's distribution can move there: publish the plugin to the organization, replace the central-manifest instructions with the organization install page, and keep everything else (version stamping, gates, addon flow) unchanged.
