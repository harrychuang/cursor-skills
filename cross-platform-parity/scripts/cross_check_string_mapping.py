#!/usr/bin/env python3
"""Cross-check common ids against the lead and follower string mapping files
and the locale resources on each platform.

Read-only. Mapping files, id fields, locale pairs and module resolution come
from the profile; CLI paths override it. Output: string_mapping_crosscheck.json.
"""
import argparse
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

STRINGS_LINE = re.compile(r'^\s*"((?:[^"\\]|\\.)*)"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;')


def load_mapping(path):
    if not path or not os.path.isfile(path):
        c.fail("mapping not found: %s" % path)
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    return {entry.get("common_id"): entry for entry in data.get("mappings", [])}


def load_ios_strings(res_dir, locales, file_name):
    tables = {}
    if not res_dir:
        return tables
    for locale in locales:
        path = os.path.join(res_dir, "%s.lproj" % locale, file_name)
        if not os.path.isfile(path):
            tables[locale] = None
            continue
        table = {}
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                m = STRINGS_LINE.match(line)
                if m:
                    table[m.group(1)] = m.group(2)
        tables[locale] = table
    return tables


def load_android_table(path):
    table = {}
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        c.fail("cannot parse %s: %s" % (path, exc))
    for element in root.iter("string"):
        if element.get("name"):
            table[element.get("name")] = "".join(element.itertext())
    return table


def load_android_strings(res_dir, locale_dirs, file_name):
    tables = {}
    if not res_dir:
        return tables
    for locale_dir in locale_dirs:
        path = os.path.join(res_dir, locale_dir, file_name)
        tables[locale_dir] = load_android_table(path) if os.path.isfile(path) else None
    return tables


def android_res_dir(android_root, module, profile):
    if not android_root:
        return None
    module = module or c.pget(profile, "android.defaultModule", "app")
    for template in c.pget(profile, "android.moduleResCandidates", ["{module}/src/main/res"]):
        candidate = os.path.join(android_root, template.replace("{module}", module))
        if os.path.isdir(candidate):
            return candidate
    return None


def normalize(value):
    if value is None:
        return None
    value = value.replace("\\'", "'").replace('\\"', '"')
    value = re.sub(r"%(\d+\$)?@", lambda m: "%" + (m.group(1) or "") + "s", value)
    return " ".join(value.split())


def read_ids(source):
    text = sys.stdin.read() if source == "-" else open(source, encoding="utf-8").read()
    text = text.strip()
    if text.startswith("["):
        return [str(x) for x in json.loads(text)]
    return [line.strip() for line in text.splitlines() if line.strip() and not line.startswith("#")]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    c.add_profile_args(parser)
    parser.add_argument("--ios-mapping", help="lead mapping JSON; default: profile lead.repo + ios.mappingFile")
    parser.add_argument("--android-mapping", help="follower mapping JSON; default: profile follower.repo + android.mappingFile")
    parser.add_argument("--ids", required=True, help="file with one common_id per line (or JSON array); - reads stdin")
    parser.add_argument("--ios-res", help="lead strings directory holding <locale>.lproj/; default: profile lead.repo + ios.stringsDir")
    parser.add_argument("--android-res", help="follower res directory used when a module cannot be resolved; default: profile follower.repo + android.resDir")
    parser.add_argument("--android-root", help="follower repository root for module-aware lookup; default: profile follower.repo")
    parser.add_argument("--with-values", action="store_true", help="include locale values and mark valueDiff after normalizing %%@ vs %%s")
    parser.add_argument("--out", help="directory for string_mapping_crosscheck.json (must be outside the repos)")
    args = parser.parse_args()

    profile = c.load_profile(args.profile)
    ios_mapping_path = c.resolve_path(args.ios_mapping, profile, "lead.repo", "ios.mappingFile", args)
    android_mapping_path = c.resolve_path(args.android_mapping, profile, "follower.repo", "android.mappingFile", args)
    ios_res = c.resolve_path(args.ios_res, profile, "lead.repo", "ios.stringsDir", args)
    android_res = c.resolve_path(args.android_res, profile, "follower.repo", "android.resDir", args)
    if args.android_root:
        android_root = os.path.abspath(args.android_root)
    else:
        rel = c.pget(profile, "follower.repo")
        candidate = os.path.join(c.workspace_dir(args), rel) if rel and not os.path.isabs(rel) else rel
        android_root = os.path.abspath(candidate) if candidate and os.path.isdir(candidate) else None
    out_dir = c.guard_out(args.out, [os.path.dirname(ios_mapping_path or ""), os.path.dirname(android_mapping_path or ""), ios_res, android_res, android_root])

    ios_locales = c.pget(profile, "ios.locales", [])
    ios_file = c.pget(profile, "ios.stringsFileName", "Localizable.strings")
    ios_id_field = c.pget(profile, "ios.mappingIdField", "ios_id")
    android_id_field = c.pget(profile, "android.mappingIdField", "android_id")
    locale_pairs = [tuple(p) for p in c.pget(profile, "android.localePairs", [])]
    override_dirs = c.pget(profile, "android.overrideDirs", [])
    android_file_default = c.pget(profile, "android.stringsFileName", "strings.xml")

    ios_map = load_mapping(ios_mapping_path)
    android_map = load_mapping(android_mapping_path)
    ios_tables = load_ios_strings(ios_res, ios_locales, ios_file)
    ids = read_ids(args.ids)
    table_cache = {}

    def tables_for(res_dir, file_name):
        key = (res_dir, file_name)
        if key not in table_cache:
            main_tables = load_android_strings(res_dir, [pair[1] for pair in locale_pairs], file_name)
            overrides = {}
            for override in override_dirs:
                path = os.path.join(res_dir, override, file_name) if res_dir else None
                if path and os.path.isfile(path):
                    overrides[override] = load_android_table(path)
            table_cache[key] = (main_tables, overrides)
        return table_cache[key]

    rows = []
    summary = {"bothMapped": 0, "iosOnly": 0, "androidOnly": 0, "neither": 0}
    for common_id in ids:
        ios_entry = ios_map.get(common_id)
        android_entry = android_map.get(common_id)
        ios_id = ios_entry.get(ios_id_field) if ios_entry else common_id
        android_id = android_entry.get(android_id_field) if android_entry else common_id
        res_dir = android_res_dir(android_root, android_entry.get("module") if android_entry else None, profile) or android_res
        file_name = (android_entry.get("file") if android_entry else None) or android_file_default
        android_tables, override_tables = tables_for(res_dir, file_name)
        row = {
            "commonId": common_id,
            "ios": {"inMapping": bool(ios_entry), "id": ios_id, "scope": ios_entry.get("scope") if ios_entry else None, "file": ios_entry.get("file") if ios_entry else None, "locales": {}},
            "android": {"inMapping": bool(android_entry), "id": android_id, "module": android_entry.get("module") if android_entry else None, "file": android_entry.get("file") if android_entry else None,
                        "resDir": os.path.relpath(res_dir, android_root) if (res_dir and android_root) else res_dir, "locales": {}},
        }
        if args.with_values:
            row["ios"]["values"], row["android"]["values"], row["valueDiff"] = {}, {}, {}
        for ios_locale, android_locale in locale_pairs:
            ios_table = ios_tables.get(ios_locale)
            android_table = android_tables.get(android_locale)
            ios_value = ios_table.get(ios_id) if ios_table else None
            android_value = android_table.get(android_id) if android_table else None
            row["ios"]["locales"][ios_locale] = None if ios_table is None else ios_id in ios_table
            row["android"]["locales"][android_locale] = None if android_table is None else android_id in android_table
            if args.with_values:
                row["ios"]["values"][ios_locale] = ios_value
                row["android"]["values"][android_locale] = android_value
                row["valueDiff"][ios_locale] = (normalize(ios_value) != normalize(android_value)) if (ios_value is not None and android_value is not None) else None
        row["android"]["overrides"] = {name: (android_id in table) for name, table in override_tables.items()}
        if ios_entry and android_entry:
            summary["bothMapped"] += 1
        elif ios_entry:
            summary["iosOnly"] += 1
        elif android_entry:
            summary["androidOnly"] += 1
        else:
            summary["neither"] += 1
        rows.append(row)

    result = c.base_result("cross_check_string_mapping", profile=profile, iosMapping=ios_mapping_path, androidMapping=android_mapping_path, iosRes=ios_res, androidRes=android_res, androidRoot=android_root)
    result["ids"] = rows
    result["summary"] = summary
    result["notes"] = ["Presence and valueDiff are mechanical comparisons of local resources; the translation backend is the authority and was not queried.",
                       "With a follower root each id is read from the res directory and file its mapping names (profile android.moduleResCandidates); otherwise only --android-res is read.",
                       "Locale pairing follows profile android.localePairs; override directories are reported under overrides.",
                       "mapping scope/module fields are local metadata, not backend platform tags."]
    c.emit(result, out_dir, "string_mapping_crosscheck.json", "%d ids, %s" % (len(rows), summary))


if __name__ == "__main__":
    main()
