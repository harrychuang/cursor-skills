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
    "PRODUCTION_HANDOFF.md",
    "ACCEPTANCE.md",
    "IMPLEMENTATION_GUIDE.md",
]

REQUIRED_DOC_HEADINGS = {
    "PRD.md": ["Product Summary", "Problem", "Users", "Goals", "Non-Goals", "Core Journeys"],
    "FLOW_SPEC.md": ["Source Of Truth", "Route Map", "Transitions"],
    "UI_SPEC.md": ["Design Principle", "Interaction", "Accessibility"],
    "DATA_SPEC.md": ["Source Of Truth", "Fixture Inventory", "API Replacement Points"],
    "PRODUCTION_HANDOFF.md": [
        "Target Surfaces",
        "Prototype To Frontend Map",
        "Web Implementation Notes",
        "App Implementation Notes",
        "API And Data Contracts",
        "Frontend Handoff Acceptance",
        "Integration Ownership",
        "Storybook-Only Boundaries",
    ],
    "ACCEPTANCE.md": ["Storybook", "Interaction", "Frontend Handoff", "Engineering"],
    "IMPLEMENTATION_GUIDE.md": [
        "Implementation Order",
        "Frontend Transfer Checklist",
        "Required Verification",
    ],
}

# Any bracketed span is unresolved scaffold guidance, except markdown links
# ("](" follows), task-list markers, and spans inside code (stripped before
# matching in validate_docs).
PLACEHOLDER_PATTERN = re.compile(r"\[(?!(?:x|X| )?\])[^\]\n]+\](?!\()")

# Headings the current contract expects but older prototypes may predate.
# Missing ones are warnings by default and errors under --strict-style, so
# prototypes created before this contract keep validating.
NEW_DOC_HEADINGS = {
    "UI_SPEC.md": ["Component Map", "Component Gaps", "Token Binding"],
    "PRODUCTION_HANDOFF.md": [
        "Design System Continuity",
        "Shared Domain And UI State Model",
        "Open Product Decisions",
        "Review Status",
    ],
    "DATA_SPEC.md": ["Data Schemas", "State And Branch Fixtures"],
    "ACCEPTANCE.md": ["Data"],
}

# Doc↔code cross-checks only trust ids written as top-level list-item leaders
# (`- `id`:` at column 0) so inline code in prose and nested explanation
# bullets cannot false-positive.
DOC_ID_BULLET_PATTERN = re.compile(r"^[-*]\s*`([a-z0-9][a-z0-9-]*)`\s*:", re.MULTILINE)
FIXTURE_BULLET_PATTERN = re.compile(r"^[-*]\s*`([A-Za-z_$][\w$]*)`\s*:", re.MULTILINE)
TABLE_FIRST_CELL_PATTERN = re.compile(r"^\s*\|\s*`([^`|]+)`\s*\|", re.MULTILINE)
EXPORT_CONST_PATTERN = re.compile(r"export\s+const\s+([A-Za-z_$][\w$]*)")

COMPONENT_NAME_PATTERN = re.compile(r"`([A-Z][A-Za-z0-9]+)`")
IMPORT_PATTERN = re.compile(r"import\s+(?:[^'\"]*?from\s+)?['\"]([^'\"]+)['\"]")
IMPORT_CLAUSE_PATTERN = re.compile(
    r"import\s+([^'\"]*?)\s+from\s+['\"][^'\"]+['\"]", re.DOTALL
)
NO_REUSABLE_PATTERN = re.compile(r"^\s*[-*]\s*No reusable components:", re.MULTILINE)
COLOR_LITERAL_PATTERN = re.compile(r"#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(")
VAR_FALLBACK_PATTERN = re.compile(
    r"var\((--[A-Za-z0-9-]+)\s*,\s*(?:[^()]|\([^()]*\))*\)"
)


def find_one(folder: Path, pattern: str) -> Path | None:
    matches = sorted(folder.glob(pattern))
    return matches[0] if matches else None


def check(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def read(path: Path) -> str:
    return path.read_text(errors="replace")


def unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def quoted_strings(value: str) -> list[str]:
    return [match[0] or match[1] for match in re.findall(r'"([^"]+)"|\'([^\']+)\'', value)]


def extract_const_string_array(text: str, suffix: str) -> list[str]:
    match = re.search(
        rf"export\s+const\s+\w+{re.escape(suffix)}\s*=\s*\[(.*?)\]\s*as\s+const",
        text,
        re.DOTALL,
    )
    return quoted_strings(match.group(1)) if match else []


def extract_transition_objects(text: str) -> list[str]:
    match = re.search(
        r"export\s+const\s+\w+Transitions\s*=\s*\[(.*?)\]\s*satisfies",
        text,
        re.DOTALL,
    )
    if not match:
        return []
    return re.findall(r"\{(.*?)\}", match.group(1), re.DOTALL)


def extract_string_property(object_text: str, key: str) -> str | None:
    match = re.search(rf"\b{re.escape(key)}\s*:\s*(['\"])(.*?)\1", object_text)
    return match.group(2) if match else None


def validate_docs(
    folder: Path,
    errors: list[str],
    warnings: list[str],
    handoff_ready: bool = False,
) -> None:
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
        for heading in NEW_DOC_HEADINGS.get(doc_name, []):
            check(
                re.search(rf"^#+\s+{re.escape(heading)}\s*$", text, re.MULTILINE)
                is not None,
                f"docs/{doc_name} missing heading '{heading}'",
                warnings,
            )
        if handoff_ready:
            prose = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
            prose = re.sub(r"`[^`\n]*`", "", prose)
            placeholders = PLACEHOLDER_PATTERN.findall(prose)
            check(
                not placeholders,
                f"docs/{doc_name} still has unresolved bracket placeholder text",
                errors,
            )
            if doc_name == "PRODUCTION_HANDOFF.md":
                validate_review_status(text, errors, warnings)


def validate_review_status(
    handoff_text: str, errors: list[str], warnings: list[str]
) -> None:
    """Handoff docs must carry a team-confirmed Review Status before handoff."""
    review_section = extract_doc_section(handoff_text, "Review Status")
    if not review_section:
        warnings.append(
            "docs/PRODUCTION_HANDOFF.md has no Review Status section, so team "
            "confirmation of the Storybook demo cannot be verified"
        )
        return
    status_match = re.search(
        r"^\s*[-*]\s*Status\s*:\s*(.+)$", review_section, re.MULTILINE
    )
    check(
        status_match is not None,
        "docs/PRODUCTION_HANDOFF.md Review Status has no 'Status:' line",
        errors,
    )
    if status_match:
        status_value = status_match.group(1).strip().strip("`").lower()
        check(
            re.match(r"confirmed\b", status_value) is not None,
            "docs/PRODUCTION_HANDOFF.md Review Status is not confirmed; the team "
            "must confirm the Storybook demo before handoff",
            errors,
        )


def mask_code_fences(text: str) -> str:
    """Blank fenced code lines (same length, newlines kept) so `#` comments
    inside fences are never mistaken for markdown headings."""
    masked: list[str] = []
    in_fence = False
    for line in text.splitlines(keepends=True):
        is_fence_marker = line.lstrip().startswith(("```", "~~~"))
        if is_fence_marker or in_fence:
            masked.append(re.sub(r"[^\n]", " ", line))
        else:
            masked.append(line)
        if is_fence_marker:
            in_fence = not in_fence
    return "".join(masked)


def extract_doc_section(text: str, heading: str) -> str:
    scan_text = mask_code_fences(text)
    opener = re.search(rf"^(#+)\s+{re.escape(heading)}\s*$", scan_text, re.MULTILINE)
    if not opener:
        return ""
    level = len(opener.group(1))
    closer = re.search(
        rf"^#{{1,{level}}}\s", scan_text[opener.end():], re.MULTILINE
    )
    end = opener.end() + closer.start() if closer else len(text)
    return text[opener.end():end]


def validate_doc_code_consistency(
    folder: Path,
    files: dict[str, Path | None],
    errors: list[str],
    warnings: list[str],
) -> None:
    """Cross-check doc contracts against the flow and data source files.

    Runs only with --handoff-ready: drafts may legitimately drift while the
    prototype is still being shaped, but handed-off docs may not.
    """
    docs_dir = folder / "docs"
    flow_path = files.get("flow")
    data_path = files.get("data")
    flow_spec = docs_dir / "FLOW_SPEC.md"
    handoff = docs_dir / "PRODUCTION_HANDOFF.md"
    data_spec = docs_dir / "DATA_SPEC.md"

    route_ids: list[str] = []
    flow_node_ids: list[str] = []
    if flow_path is not None and flow_path.is_file():
        flow_text = read(flow_path)
        route_ids = extract_const_string_array(flow_text, "RouteIds")
        flow_node_ids = extract_const_string_array(flow_text, "FlowNodeIds")
    all_ids = set(route_ids + flow_node_ids)

    if flow_spec.is_file() and all_ids:
        spec_text = read(flow_spec)
        route_map = extract_doc_section(spec_text, "Route Map")
        node_map = extract_doc_section(spec_text, "Flow Node Map")
        for route_id in route_ids:
            check(
                f"`{route_id}`" in route_map,
                f"FLOW_SPEC.md Route Map does not document flow route `{route_id}`",
                errors,
            )
        for node_id in flow_node_ids:
            check(
                f"`{node_id}`" in node_map,
                f"FLOW_SPEC.md Flow Node Map does not document flow node `{node_id}`",
                warnings,
            )
        for section_name, section in (
            ("Route Map", route_map),
            ("Flow Node Map", node_map),
        ):
            for doc_id in DOC_ID_BULLET_PATTERN.findall(section):
                check(
                    doc_id in all_ids,
                    f"FLOW_SPEC.md {section_name} documents `{doc_id}` but "
                    "*PrototypeFlow.ts does not define it",
                    errors,
                )

    if handoff.is_file() and route_ids:
        frontend_map = extract_doc_section(read(handoff), "Prototype To Frontend Map")
        for route_id in route_ids:
            check(
                f"`{route_id}`" in frontend_map,
                "PRODUCTION_HANDOFF.md Prototype To Frontend Map does not map "
                f"flow route `{route_id}`",
                errors,
            )
        for node_id in flow_node_ids:
            check(
                f"`{node_id}`" in frontend_map,
                "PRODUCTION_HANDOFF.md Prototype To Frontend Map does not mention "
                f"flow node `{node_id}`",
                warnings,
            )

    if data_path is not None and data_path.is_file():
        data_exports = set(EXPORT_CONST_PATTERN.findall(read(data_path)))
        if data_exports:
            references: list[tuple[str, str]] = []
            if data_spec.is_file():
                inventory = extract_doc_section(read(data_spec), "Fixture Inventory")
                references.extend(
                    ("DATA_SPEC.md Fixture Inventory", name)
                    for name in FIXTURE_BULLET_PATTERN.findall(inventory)
                )
            if handoff.is_file():
                contracts = extract_doc_section(
                    read(handoff), "API And Data Contracts"
                )
                references.extend(
                    ("PRODUCTION_HANDOFF.md API And Data Contracts", name.strip())
                    for name in TABLE_FIRST_CELL_PATTERN.findall(contracts)
                )
            for source, name in references:
                check(
                    name in data_exports,
                    f"{source} references fixture group `{name}` but "
                    "*PrototypeData.ts does not export it",
                    errors,
                )


def validate_component_usage(
    folder: Path, files: dict[str, Path | None], warnings: list[str]
) -> None:
    ui_spec = folder / "docs" / "UI_SPEC.md"
    component_path = files.get("component")
    if not ui_spec.is_file() or component_path is None or not component_path.is_file():
        return

    spec_text = read(ui_spec)
    map_section = extract_doc_section(spec_text, "Component Map")
    gaps_section = extract_doc_section(spec_text, "Component Gaps")
    if not map_section and not gaps_section:
        return

    # Bracketed spans are unresolved scaffold guidance, not real mappings.
    resolved_map = re.sub(r"\[[^\]\n]*\]", "", map_section)
    mapped_names = unique(COMPONENT_NAME_PATTERN.findall(resolved_map))

    component_text = read(component_path)
    # Type-only imports carry no value binding, so they never satisfy a
    # Component Map entry.
    value_import_text = re.sub(r"import\s+type\b[^;]*;", "", component_text)
    imported_clauses = " ".join(IMPORT_CLAUSE_PATTERN.findall(value_import_text))
    import_specifiers = IMPORT_PATTERN.findall(value_import_text)
    for name in mapped_names:
        name_pattern = rf"\b{re.escape(name)}\b"
        imported = re.search(name_pattern, imported_clauses) is not None or any(
            re.search(name_pattern, specifier.rsplit("/", 1)[-1])
            for specifier in import_specifiers
        )
        check(
            imported,
            f"UI_SPEC Component Map names `{name}` but *Prototype.tsx never imports it",
            warnings,
        )
        check(
            re.search(rf"<(?:\w+\.)?{re.escape(name)}[\s/>]", component_text)
            is not None,
            f"UI_SPEC Component Map names `{name}` but *Prototype.tsx never renders it",
            warnings,
        )

    has_no_reusable_marker = NO_REUSABLE_PATTERN.search(gaps_section) is not None

    def is_design_system_import(specifier: str) -> bool:
        if specifier.endswith(".css"):
            return False
        if not specifier.startswith("."):
            if specifier in {"react", "react-dom", "clsx", "classnames"}:
                return False
            return not specifier.startswith(("@storybook", "react/", "react-dom/"))
        if "prototypeFlowLayout" in specifier:
            return False
        return "/components/" in specifier or "/ui/" in specifier or specifier.startswith("../..")

    has_design_system_import = any(
        is_design_system_import(specifier)
        for specifier in IMPORT_PATTERN.findall(component_text)
    )

    check(
        bool(mapped_names) or has_no_reusable_marker,
        "UI_SPEC Component Map has no resolved component mappings and Component Gaps "
        "lacks a '- No reusable components: <evidence>' line",
        warnings,
    )
    check(
        has_design_system_import or has_no_reusable_marker,
        "*Prototype.tsx has no design-system import and Component Gaps lacks a "
        "'- No reusable components: <evidence>' line",
        warnings,
    )


def validate_css(files: dict[str, Path | None], warnings: list[str]) -> None:
    css_path = files.get("css")
    if css_path is None or not css_path.is_file():
        return

    text = read(css_path)

    # Collapse var() fallbacks (innermost first) so raw values are legal only
    # in fallback position; anything left is a hardcoded style. Comments are
    # replaced newline-for-newline so warning line numbers stay accurate.
    collapsed = re.sub(
        r"/\*.*?\*/",
        lambda match: "\n" * match.group(0).count("\n"),
        text,
        flags=re.DOTALL,
    )
    while True:
        reduced = VAR_FALLBACK_PATTERN.sub(r"var(\1)", collapsed)
        if reduced == collapsed:
            break
        collapsed = reduced

    for line_number, line in enumerate(collapsed.splitlines(), start=1):
        if COLOR_LITERAL_PATTERN.search(line):
            warnings.append(
                f"{css_path.name}:{line_number} hardcoded color outside a var() "
                "token fallback"
            )

    selectors: list[str] = []
    selector_buffer = ""
    keyframes_depth = 0
    pending_keyframes = False
    for raw_line in collapsed.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if pending_keyframes:
            if "{" in line:
                pending_keyframes = False
                keyframes_depth = max(line.count("{") - line.count("}"), 0)
            continue
        if keyframes_depth > 0:
            keyframes_depth = max(
                keyframes_depth + line.count("{") - line.count("}"), 0
            )
            continue
        if line.startswith("@keyframes"):
            if "{" in line:
                keyframes_depth = max(line.count("{") - line.count("}"), 0)
            else:
                pending_keyframes = True
            continue
        if line.startswith("@"):
            continue
        if "{" in line:
            selector_list = (selector_buffer + " " + line.split("{", 1)[0]).strip()
            selector_buffer = ""
            selectors.extend(
                selector.strip()
                for selector in selector_list.split(",")
                if selector.strip()
            )
        elif ";" in line or "}" in line:
            selector_buffer = ""
        elif line.endswith(",") or line.startswith((".", "[", ":", "&")):
            selector_buffer += " " + line
        else:
            selector_buffer = ""

    # Every selector must be scoped under one of the file's feature root blocks
    # (a leading class stripped of its BEM __element / --modifier suffixes).
    root_blocks: list[str] = []
    for selector in selectors:
        leading_class = re.match(r"\.([A-Za-z][A-Za-z0-9_-]*)", selector)
        if leading_class:
            block = re.split(r"__|--", leading_class.group(1))[0]
            if block and f".{block}" not in root_blocks:
                root_blocks.append(f".{block}")
    root_hint = root_blocks[0] if root_blocks else f".{css_path.stem}"

    for selector in selectors:
        if not selector.startswith(tuple(root_blocks) or (root_hint,)):
            warnings.append(
                f"{css_path.name} selector '{selector}' is not scoped under a "
                f"feature root class such as '{root_hint}'"
            )


def validate_files(folder: Path, errors: list[str]) -> dict[str, Path | None]:
    files = {
        "component": find_one(folder, "*Prototype.tsx"),
        "story": find_one(folder, "*Prototype.stories.tsx"),
        "static flow export": find_one(folder, "*PrototypeFlowExport.tsx"),
        "static flow story": find_one(folder, "*PrototypeFlowExport.stories.tsx"),
        "flow": find_one(folder, "*PrototypeFlow.ts"),
        "data": find_one(folder, "*PrototypeData.ts"),
        "meta": find_one(folder, "*PrototypeMeta.ts"),
        "css": find_one(folder, "*-prototype.css"),
        "flow layout helper": folder.parent / "prototypeFlowLayout.ts",
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


def validate_static_flow_story(path: Path | None, errors: list[str]) -> None:
    if path is None or not path.is_file():
        return
    text = read(path)
    check("StaticFlow" in text, "static flow story should export StaticFlow", errors)
    check("parameters" in text, "static flow story missing parameters", errors)
    check("prototype:" in text, "static flow story missing parameters.prototype", errors)
    check(
        'layout: "fullscreen"' in text or "layout: 'fullscreen'" in text,
        "static flow story should use fullscreen layout",
        errors,
    )


def validate_static_flow_export(path: Path | None, errors: list[str]) -> None:
    if path is None or not path.is_file():
        return
    text = read(path)
    check("../prototypeFlowLayout" in text, "static flow export should import shared prototypeFlowLayout helper", errors)
    check("readPrototypeFlowLayoutPositions" in text, "static flow export should read saved inspector layout positions", errors)
    check("getPrototypeFlowLayoutStorageKey" in text, "static flow export should use the shared layout storage key", errors)
    check("isFlowPreview" in text, "static flow export should render route previews in flow preview mode", errors)
    check("data-layout-source" in text, "static flow export should expose data-layout-source", errors)
    check("data-figma-text-auto-width" in text, "static flow export should mark edge labels for Figma text auto-width", errors)


def validate_viewer_compatibility(files: dict[str, Path | None], errors: list[str]) -> None:
    component_path = files.get("component")
    story_path = files.get("story")
    text = ""
    if component_path is not None and component_path.is_file():
        text += read(component_path)
    if story_path is not None and story_path.is_file():
        text += "\n" + read(story_path)

    check(
        "prototypeFlowPreview" in text,
        "prototype should support prototypeFlowPreview query mode for iframe previews",
        errors,
    )
    check(
        "prototypeRoute" in text,
        "prototype should support prototypeRoute query mode for route-specific iframe previews",
        errors,
    )
    check(
        "data-prototype-root" in text,
        "prototype root should keep data-prototype-root for backward-compatible UI Flow preview measurement",
        errors,
    )
    check(
        "data-prototype-route-preview" in text,
        "prototype route shell should expose data-prototype-route-preview for template-compatible preview measurement",
        errors,
    )


def validate_meta(path: Path | None, errors: list[str]) -> None:
    if path is None or not path.is_file():
        return
    text = read(path)
    for doc_name in [
        "ACCEPTANCE",
        "DATA_SPEC",
        "FLOW_SPEC",
        "IMPLEMENTATION_GUIDE",
        "PRD",
        "PRODUCTION_HANDOFF",
        "UI_SPEC",
    ]:
        check(doc_name in text, f"meta missing raw import for docs/{doc_name}.md", errors)
    check("flow:" in text, "meta missing flow field", errors)
    check("data:" in text, "meta missing data field", errors)
    check("docs:" in text, "meta missing docs field", errors)
    check("figmaExport" in text, "meta missing figmaExport field", errors)
    check("flowStoryId" in text, "meta missing figmaExport.flowStoryId", errors)


def validate_flow(path: Path | None, errors: list[str]) -> None:
    if path is None or not path.is_file():
        return
    text = read(path)
    check("RouteIds" in text, "flow file missing route id array", errors)
    check("Routes" in text, "flow file missing routes metadata", errors)
    check("Transitions" in text, "flow file missing transitions metadata", errors)
    check("sourceAnchor" in text, "flow transition type should include optional sourceAnchor for export layout tuning", errors)
    route_ids = extract_const_string_array(text, "RouteIds")
    flow_node_ids = extract_const_string_array(text, "FlowNodeIds")
    all_ids = route_ids + flow_node_ids
    duplicate_ids = sorted({value for value in all_ids if all_ids.count(value) > 1})

    check(bool(route_ids), "flow file should include at least one stable route id string", errors)
    check(not duplicate_ids, f"flow ids must be unique: {', '.join(duplicate_ids)}", errors)

    for route_id in route_ids:
        check(
            re.fullmatch(r"[a-z0-9][a-z0-9-]*", route_id) is not None,
            f"route id '{route_id}' should be lowercase kebab-case",
            errors,
        )

    for node_id in flow_node_ids:
        check(
            re.fullmatch(r"[a-z0-9][a-z0-9-]*", node_id) is not None,
            f"flow node id '{node_id}' should be lowercase kebab-case",
            errors,
        )

    transitions = extract_transition_objects(text)
    valid_targets = set(all_ids)

    check(
        len(all_ids) <= 1 or bool(transitions),
        "flow with multiple routes or nodes should include transition metadata",
        errors,
    )

    has_key_flow_line = False
    for index, transition in enumerate(transitions, start=1):
        from_id = extract_string_property(transition, "from")
        to_id = extract_string_property(transition, "to")
        trigger = extract_string_property(transition, "trigger")
        label = extract_string_property(transition, "label")
        flow_line = extract_string_property(transition, "flowLine")
        transition_label = trigger or label or f"#{index}"

        check(bool(from_id), f"transition {transition_label} missing from", errors)
        check(bool(to_id), f"transition {transition_label} missing to", errors)
        check(bool(trigger), f"transition {transition_label} missing trigger", errors)
        check(bool(label), f"transition {transition_label} missing label", errors)

        if from_id:
            check(
                from_id in valid_targets,
                f"transition {transition_label} has unknown from target '{from_id}'",
                errors,
            )
        if to_id:
            check(
                to_id in valid_targets,
                f"transition {transition_label} has unknown to target '{to_id}'",
                errors,
            )
        if flow_line:
            check(
                flow_line in {"key", "reference", "hidden"},
                f"transition {transition_label} has invalid flowLine '{flow_line}'",
                errors,
            )
            has_key_flow_line = has_key_flow_line or flow_line == "key"

    check(
        not transitions or has_key_flow_line,
        'flow with transitions should mark at least one transition as flowLine: "key"',
        errors,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prototype_folder", help="Path to a generated prototype folder.")
    parser.add_argument(
        "--handoff-ready",
        dest="handoff_ready",
        action="store_true",
        help=(
            "Also fail docs that still contain scaffold placeholder guidance, "
            "cross-check doc route/fixture references against the flow and data "
            "files, and require a confirmed Review Status."
        ),
    )
    parser.add_argument(
        "--production-ready",
        dest="handoff_ready",
        action="store_true",
        help="Deprecated alias for --handoff-ready.",
    )
    parser.add_argument(
        "--strict-style",
        dest="strict_style",
        action="store_true",
        help=(
            "Treat validation warnings (component map, token discipline, CSS "
            "scope, doc coverage) as errors."
        ),
    )
    args = parser.parse_args()

    folder = Path(args.prototype_folder).resolve()
    errors: list[str] = []
    warnings: list[str] = []

    check(folder.is_dir(), f"{folder} is not a directory", errors)
    if folder.is_dir():
        validate_docs(folder, errors, warnings, args.handoff_ready)
        files = validate_files(folder, errors)
        validate_story(files["story"], errors)
        validate_static_flow_story(files["static flow story"], errors)
        validate_static_flow_export(files["static flow export"], errors)
        validate_viewer_compatibility(files, errors)
        validate_meta(files["meta"], errors)
        validate_flow(files["flow"], errors)
        validate_component_usage(folder, files, warnings)
        validate_css(files, warnings)
        if args.handoff_ready:
            validate_doc_code_consistency(folder, files, errors, warnings)

    if args.strict_style:
        errors.extend(warnings)
        warnings = []

    if warnings:
        print("Prototype validation warnings (errors with --strict-style):")
        for warning in warnings:
            print(f"- {warning}")

    if errors:
        print("Prototype validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Prototype validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
