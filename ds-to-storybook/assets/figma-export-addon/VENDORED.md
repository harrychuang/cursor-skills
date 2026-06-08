# Vendored Addon

This directory is a vendored copy of `@harrychuang/storybook-addon-figma-export` from:

```txt
https://github.com/harrychuang/storybook-addons/tree/main/packages/figma-export
```

The upstream commit is recorded in `VENDORED_COMMIT.txt`.

`ds-to-storybook` installs this package from the local skill folder:

```sh
npm install -D "file:<skill-root>/assets/figma-export-addon" @storybook/icons
```

Use the local `file:` dependency in this skill. Do not install from GitHub unless the user explicitly asks to refresh the vendored copy.
