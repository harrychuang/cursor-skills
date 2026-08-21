#!/usr/bin/env python3
"""Scan a repo for reusable components and design tokens before composing a prototype.

Emits a markdown inventory covering design-system packages, components (from the
Storybook index or story files), design-token namespaces, and theme loading, so
the agent can fill the Component Map and Token Binding sections in UI_SPEC.md
from evidence instead of guesses.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

EXCLUDED_DIRS = {
    ".git",
    ".next",
    ".storybook-cache",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "storybook-static",
}

UI_DEP_HINT = re.compile(r"ui|design|component|token|theme|radix|chakra|mantine|antd|mui", re.IGNORECASE)
STORY_GLOBS = ("*.stories.tsx", "*.stories.ts", "*.stories.jsx", "*.stories.js")
CSS_FILE_CAP = 300
STORY_FILE_CAP = 400

TITLE_PATTERN = re.compile(r"\btitle\s*:\s*['\"]([^'\"]+)['\"]")
COMPONENT_PATTERN = re.compile(r"\bcomponent\s*:\s*([A-Za-z_][A-Za-z0-9_.]*)")
STORY_EXPORT_PATTERN = re.compile(r"^export\s+const\s+([A-Z][A-Za-z0-9_]*)", re.MULTILINE)
BARREL_EXPORT_PATTERN = re.compile(
    r"export\s+(?:\{([^}]+)\}|(?:default\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*))"
)
CUSTOM_PROPERTY_PATTERN = re.compile(r"^\s*(--[a-z][a-z0-9-]*)\s*:", re.MULTILINE)
PREVIEW_IMPORT_PATTERN = re.compile(r"^import\s+[^;]*['\"]([^'\"]+)['\"]", re.MULTILINE)


def iter_files(root: Path, patterns: tuple[str, ...], cap: int) -> list[Path]:
    found: list[Path] = []
    for path in sorted(root.rglob("*")):
        if len(found) >= cap:
            break
        if not path.is_file():
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        if any(path.match(pattern) for pattern in patterns):
            found.append(path)
    return found


def read(path: Path) -> str:
    try:
        return path.read_text(errors="replace")
    except OSError:
        return ""


def token_prefix(name: str) -> str:
    parts = name.lstrip("-").split("-")
    return f"--{parts[0]}" if parts else name


def scan_packages(root: Path) -> list[str]:
    lines: list[str] = []
    manifests = [root / "package.json"]
    workspace_dirs = [root / "packages", root / "apps"]
    for workspace in workspace_dirs:
        if workspace.is_dir():
            manifests.extend(sorted(workspace.glob("*/package.json")))
    for manifest in manifests:
        if not manifest.is_file():
            continue
        try:
            data = json.loads(read(manifest))
        except json.JSONDecodeError:
            continue
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        hits = sorted(name for name in deps if UI_DEP_HINT.search(name))
        if hits:
            rel = manifest.relative_to(root)
            lines.append(f"- `{rel}`: {', '.join(f'`{name}`' for name in hits)}")
    return lines


def scan_storybook_index(root: Path, index_path: Path | None) -> list[str]:
    candidates = [index_path] if index_path else [
        root / "storybook-static" / "index.json",
        root / "storybook-static" / "stories.json",
    ]
    for candidate in candidates:
        if candidate is None or not candidate.is_file():
            continue
        try:
            data = json.loads(read(candidate))
        except json.JSONDecodeError:
            continue
        entries = data.get("entries") or data.get("stories") or {}
        by_title: dict[str, str] = {}
        for entry in entries.values():
            title = entry.get("title")
            if title and title not in by_title:
                by_title[title] = entry.get("importPath", "")
        return [
            f"- `{title}` — `{import_path}`" if import_path else f"- `{title}`"
            for title, import_path in sorted(by_title.items())
        ]
    return []


def scan_story_files(root: Path) -> list[str]:
    lines: list[str] = []
    for path in iter_files(root, STORY_GLOBS, STORY_FILE_CAP):
        text = read(path)
        title_match = TITLE_PATTERN.search(text)
        component_match = COMPONENT_PATTERN.search(text)
        exports = [name for name in STORY_EXPORT_PATTERN.findall(text) if name != "default"]
        rel = path.relative_to(root)
        details: list[str] = []
        if component_match:
            details.append(f"component `{component_match.group(1)}`")
        if exports:
            details.append(f"stories: {', '.join(exports[:6])}")
        label = title_match.group(1) if title_match else str(rel)
        suffix = f" — {'; '.join(details)}" if details else ""
        lines.append(f"- `{label}` (`{rel}`){suffix}")
    return lines


def scan_barrels(root: Path) -> list[str]:
    lines: list[str] = []
    for base in ("src/components", "src/ui", "packages/ui/src", "packages/components/src"):
        for name in ("index.ts", "index.tsx", "index.js"):
            barrel = root / base / name
            if not barrel.is_file():
                continue
            names: set[str] = set()
            for grouped, single in BARREL_EXPORT_PATTERN.findall(read(barrel)):
                if single:
                    names.add(single)
                for piece in grouped.split(","):
                    identifier = piece.split(" as ")[-1].strip()
                    if re.fullmatch(r"[A-Z][A-Za-z0-9_]*", identifier):
                        names.add(identifier)
            if names:
                lines.append(f"- `{base}/{name}`: {', '.join(f'`{n}`' for n in sorted(names)[:20])}")
    return lines


def scan_tokens(root: Path) -> list[str]:
    groups: dict[str, set[str]] = defaultdict(set)
    files_by_prefix: dict[str, set[str]] = defaultdict(set)
    for path in iter_files(root, ("*.css", "*.scss"), CSS_FILE_CAP):
        text = read(path)
        for name in CUSTOM_PROPERTY_PATTERN.findall(text):
            prefix = token_prefix(name)
            groups[prefix].add(name)
            files_by_prefix[prefix].add(str(path.relative_to(root)))
    lines = []
    for prefix, names in sorted(groups.items(), key=lambda item: -len(item[1])):
        sources = sorted(files_by_prefix[prefix])
        shown = ", ".join(f"`{s}`" for s in sources[:3])
        more = f" (+{len(sources) - 3} more files)" if len(sources) > 3 else ""
        lines.append(f"- `{prefix}-*`: {len(names)} tokens in {shown}{more}")
    return lines


def scan_theme_loading(root: Path) -> list[str]:
    lines: list[str] = []
    storybook_dir = root / ".storybook"
    if storybook_dir.is_dir():
        for preview in sorted(storybook_dir.glob("preview.*")):
            imports = PREVIEW_IMPORT_PATTERN.findall(read(preview))
            css_imports = [imp for imp in imports if imp.endswith((".css", ".scss"))]
            if css_imports:
                lines.append(
                    f"- `{preview.relative_to(root)}` imports: "
                    + ", ".join(f"`{imp}`" for imp in css_imports)
                )
    for name in ("tailwind.config.js", "tailwind.config.ts", "tailwind.config.cjs"):
        if (root / name).is_file():
            lines.append(f"- Tailwind config present: `{name}`")
    return lines


def section(title: str, lines: list[str], empty_note: str) -> str:
    body = "\n".join(lines) if lines else f"- {empty_note}"
    return f"## {title}\n\n{body}\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo_root", help="Path to the target repo root.")
    parser.add_argument("--storybook-index", type=Path, default=None,
                        help="Explicit path to a Storybook index.json.")
    parser.add_argument("--out", type=Path, default=None,
                        help="Write the markdown inventory to a file instead of stdout.")
    args = parser.parse_args()

    root = Path(args.repo_root).resolve()
    if not root.is_dir():
        parser.error(f"{root} is not a directory")

    parts = ["# Component And Token Inventory\n"]

    tier1 = root / "design-system" / "COMPONENT_INVENTORY.md"
    if tier1.is_file():
        parts.append(
            "## Authoritative Source\n\n"
            f"- `{tier1.relative_to(root)}` exists — use it as the Tier 1 Component Map "
            "source instead of the scan results below.\n"
        )

    parts.append(section("Design System Packages", scan_packages(root),
                         "No design-system-like dependencies found."))
    index_lines = scan_storybook_index(root, args.storybook_index)
    story_lines = index_lines or scan_story_files(root)
    source_note = "Storybook index" if index_lines else "story files"
    parts.append(section(f"Components ({source_note})", story_lines,
                         "No Storybook index or story files found."))
    parts.append(section("Barrel Exports", scan_barrels(root),
                         "No component barrel exports found."))
    parts.append(section("Design Tokens", scan_tokens(root),
                         "No CSS custom-property definitions found."))
    parts.append(section("Theme Loading", scan_theme_loading(root),
                         "No .storybook/preview.* CSS imports or Tailwind config found."))

    if not any([story_lines, scan_barrels(root)]):
        parts.append(
            "## No Design-System Sources Found\n\n"
            "- Record `- No reusable components: <this scan>` in UI_SPEC.md Component Gaps.\n"
        )

    output = "\n".join(parts)
    if args.out:
        args.out.write_text(output)
        print(f"Wrote inventory to {args.out}")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
