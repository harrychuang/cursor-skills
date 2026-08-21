#!/usr/bin/env python3
"""Scaffold a PRD-led Storybook product prototype and frontend handoff."""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


TOKEN_FILES = {
    "FeaturePrototypeFlowExport.tsx.template": "__FEATURE_PASCAL__FlowExport.tsx",
    "FeaturePrototypeFlowExport.stories.tsx.template": "__FEATURE_PASCAL__FlowExport.stories.tsx",
    "FeaturePrototype.tsx.template": "__FEATURE_PASCAL__.tsx",
    "FeaturePrototype.stories.tsx.template": "__FEATURE_PASCAL__.stories.tsx",
    "featurePrototypeFlow.ts.template": "__FEATURE_CAMEL__Flow.ts",
    "featurePrototypeData.ts.template": "__FEATURE_CAMEL__Data.ts",
    "featurePrototypeMeta.ts.template": "__FEATURE_CAMEL__Meta.ts",
    "feature-prototype.css.template": "__FEATURE_KEBAB__.css",
}


def split_words(value: str) -> list[str]:
    cleaned = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", value.strip())
    words = re.findall(r"[A-Za-z0-9]+", cleaned)
    if not words:
        raise ValueError("feature name must contain at least one letter or digit")
    return words


def to_kebab(words: list[str]) -> str:
    return "-".join(word.lower() for word in words)


def to_pascal(words: list[str]) -> str:
    return "".join(word[:1].upper() + word[1:] for word in words)


def to_camel(words: list[str]) -> str:
    pascal = to_pascal(words)
    return pascal[:1].lower() + pascal[1:]


def to_title(words: list[str]) -> str:
    return " ".join(word[:1].upper() + word[1:] for word in words)


def to_storybook_id(value: str) -> str:
    story_id = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return story_id or "prototype"


def copy_template_file(source: Path, target: Path, replacements: dict[str, str]) -> None:
    text = source.read_text()
    for token, value in replacements.items():
        text = text.replace(token, value)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)


def copy_flow_layout_helper(skill_root: Path, target_root: Path, force: bool) -> None:
    source = skill_root / "assets" / "prototype-flow-layout" / "prototypeFlowLayout.ts"
    target = target_root / "prototypeFlowLayout.ts"

    if target.exists() and not force:
        return

    if not source.is_file():
        raise FileNotFoundError(f"missing prototype flow layout helper: {source}")

    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)


def scaffold(args: argparse.Namespace) -> Path:
    words = split_words(args.feature_name)
    feature_kebab = args.kebab or to_kebab(words)
    feature_pascal = args.pascal or f"{to_pascal(words)}Prototype"
    feature_camel = args.camel or f"{to_camel(words)}Prototype"
    feature_title = args.title or f"{to_title(words)} Prototype"
    entry_route = args.entry_route or to_kebab(words)
    css_class = args.css_class or f"{args.css_prefix}-{feature_kebab}-prototype"

    skill_root = Path(__file__).resolve().parents[1]
    template_root = skill_root / "assets" / "prototype-template"
    target_root = Path(args.target_root).resolve()
    prototype_dir = target_root / f"{feature_kebab}-prototype"
    story_id_base = to_storybook_id(f"Pages/Prototypes/{feature_title}")

    if prototype_dir.exists():
        if not args.force:
            raise FileExistsError(
                f"{prototype_dir} already exists. Pass --force to overwrite template files."
            )
    else:
        prototype_dir.mkdir(parents=True)

    replacements = {
        "__ENTRY_ROUTE_ID__": entry_route,
        "__FEATURE_CAMEL__": feature_camel,
        "__FEATURE_CSS_CLASS__": css_class,
        "__FEATURE_KEBAB__": f"{feature_kebab}-prototype",
        "__FEATURE_PASCAL__": feature_pascal,
        "__FEATURE_STORY_ID__": f"{story_id_base}--static-flow",
        "__FEATURE_TITLE__": feature_title,
        "__OWNER__": args.owner,
    }

    copy_flow_layout_helper(skill_root, target_root, args.force)

    for source in template_root.rglob("*"):
        if source.is_dir():
            continue

        relative = source.relative_to(template_root)
        mapped_name = TOKEN_FILES.get(source.name, source.name)
        for token, value in replacements.items():
            mapped_name = mapped_name.replace(token, value)

        target = prototype_dir / relative.parent / mapped_name
        if target.exists() and not args.force:
            raise FileExistsError(f"{target} already exists. Pass --force to overwrite.")
        copy_template_file(source, target, replacements)

    return prototype_dir


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("feature_name", help="Human feature name, e.g. 'Portfolio Alerts'")
    parser.add_argument(
        "--target-root",
        default="src/pages/prototypes",
        help="Prototype root directory in the target repo.",
    )
    parser.add_argument("--title", help="Human story title. Defaults to '<Feature> Prototype'.")
    parser.add_argument("--owner", default="Product Team", help="Prototype owner label.")
    parser.add_argument("--entry-route", help="Initial route id. Defaults to feature kebab name.")
    parser.add_argument("--kebab", help="Override feature kebab base name.")
    parser.add_argument("--pascal", help="Override component PascalCase name.")
    parser.add_argument("--camel", help="Override module camelCase base name.")
    parser.add_argument("--css-class", help="Override prototype root CSS class.")
    parser.add_argument("--css-prefix", default="cm", help="CSS class prefix.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing template files.")
    args = parser.parse_args()

    prototype_dir = scaffold(args)
    print(prototype_dir)


if __name__ == "__main__":
    main()
