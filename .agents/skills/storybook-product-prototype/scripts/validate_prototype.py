#!/usr/bin/env python3
"""Validate the folder contract for a Storybook product prototype."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REQUIRED_DOCS = [
    "PRD.md",
    "FLOW_SPEC.md",
    "UI_SPEC.md",
    "DATA_SPEC.md",
    "ACCEPTANCE.md",
    "IMPLEMENTATION_GUIDE.md",
]

REQUIRED_DOC_HEADINGS = {
    "PRD.md": ["Product Summary", "Problem", "Users", "Goals", "Non-Goals", "Core Journeys"],
    "FLOW_SPEC.md": ["Source Of Truth", "Route Map", "Transitions"],
    "UI_SPEC.md": ["Design Principle", "Interaction", "Accessibility"],
    "DATA_SPEC.md": ["Source Of Truth", "Fixture Inventory", "API Replacement Points"],
    "ACCEPTANCE.md": ["Storybook", "Interaction", "Engineering"],
    "IMPLEMENTATION_GUIDE.md": ["Implementation Order", "Required Verification"],
}


def find_one(folder: Path, pattern: str) -> Path | None:
    matches = sorted(folder.glob(pattern))
    return matches[0] if matches else None


def check(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def read(path: Path) -> str:
    return path.read_text(errors="replace")


def validate_docs(folder: Path, errors: list[str]) -> None:
    docs_dir = folder / "docs"
    check(docs_dir.is_dir(), "missing docs/ directory", errors)
    if not docs_dir.is_dir():
        return

    for doc_name in REQUIRED_DOCS:
        doc_path = docs_dir / doc_name
        check(doc_path.is_file(), f"missing docs/{doc_name}", errors)
        if not doc_path.is_file():
            continue
        text = read(doc_path)
        for heading in REQUIRED_DOC_HEADINGS.get(doc_name, []):
            check(
                re.search(rf"^#+\s+{re.escape(heading)}\s*$", text, re.MULTILINE)
                is not None,
                f"docs/{doc_name} missing heading '{heading}'",
                errors,
            )


def validate_files(folder: Path, errors: list[str]) -> dict[str, Path | None]:
    files = {
        "component": find_one(folder, "*Prototype.tsx"),
        "story": find_one(folder, "*Prototype.stories.tsx"),
        "flow": find_one(folder, "*PrototypeFlow.ts"),
        "data": find_one(folder, "*PrototypeData.ts"),
        "meta": find_one(folder, "*PrototypeMeta.ts"),
        "css": find_one(folder, "*-prototype.css"),
        "index": folder / "index.ts",
    }

    for label, path in files.items():
        check(path is not None and path.is_file(), f"missing {label} file", errors)

    return files


def validate_story(path: Path | None, errors: list[str]) -> None:
    if path is None or not path.is_file():
        return
    text = read(path)
    check("parameters" in text, "story missing parameters", errors)
    check("prototype:" in text, "story missing parameters.prototype", errors)
    check('layout: "fullscreen"' in text or "layout: 'fullscreen'" in text, "story should use fullscreen layout", errors)


def validate_meta(path: Path | None, errors: list[str]) -> None:
    if path is None or not path.is_file():
        return
    text = read(path)
    for doc_name in ["ACCEPTANCE", "DATA_SPEC", "FLOW_SPEC", "IMPLEMENTATION_GUIDE", "PRD", "UI_SPEC"]:
        check(doc_name in text, f"meta missing raw import for docs/{doc_name}.md", errors)
    check("flow:" in text, "meta missing flow field", errors)
    check("data:" in text, "meta missing data field", errors)
    check("docs:" in text, "meta missing docs field", errors)


def validate_flow(path: Path | None, errors: list[str]) -> None:
    if path is None or not path.is_file():
        return
    text = read(path)
    check("RouteIds" in text, "flow file missing route id array", errors)
    check("Routes" in text, "flow file missing routes metadata", errors)
    check("Transitions" in text, "flow file missing transitions metadata", errors)
    route_ids = re.findall(r'"([a-z0-9][a-z0-9-]*)"', text)
    check(bool(route_ids), "flow file should include at least one stable route id string", errors)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prototype_folder", help="Path to a generated prototype folder.")
    args = parser.parse_args()

    folder = Path(args.prototype_folder).resolve()
    errors: list[str] = []

    check(folder.is_dir(), f"{folder} is not a directory", errors)
    if folder.is_dir():
        validate_docs(folder, errors)
        files = validate_files(folder, errors)
        validate_story(files["story"], errors)
        validate_meta(files["meta"], errors)
        validate_flow(files["flow"], errors)

    if errors:
        print("Prototype validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Prototype validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
