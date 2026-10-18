#!/usr/bin/env python3
"""List string keys used by the source files a merge touched, with locale status.

The lead platform's string accessor (profile ios.stringAccessorPattern, e.g.
SwiftGen's `LocalizedString.<key>`) is mapped back to its resource key using the
generated file at the frozen revision. Optional follower (Android) mapping and
locale status come from the follower repository's working tree. Output: string_keys.json.
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

STRINGS_KEY_PATTERN = re.compile(r'^\s*"((?:[^"\\]|\\.)*)"\s*=')
CJK_LITERAL_PATTERN = re.compile(r'"((?:[^"\\]|\\.)*[一-鿿](?:[^"\\]|\\.)*)"')


def parse_generated(text, key_pattern):
    mapping = {}
    decl = re.compile(r"static\s+(?:let|func)\s+([A-Za-z_][A-Za-z0-9_]*)")
    tr = re.compile(key_pattern)
    positions = [(m.start(), m.group(1)) for m in decl.finditer(text)]
    for index, (start, name) in enumerate(positions):
        end = positions[index + 1][0] if index + 1 < len(positions) else len(text)
        found = tr.search(text, start, end)
        if found:
            mapping[name] = found.group(1)
    return mapping


def strings_keys(text):
    keys = set()
    for line in text.splitlines():
        m = STRINGS_KEY_PATTERN.match(line)
        if m:
            keys.add(m.group(1))
    return keys


def diff_string_changes(repo, base, head, strings_file_name):
    changes = {}
    current_file = None
    for line in c.git(repo, "diff", "-M", base, head, "--", "*" + strings_file_name).splitlines():
        if line.startswith("+++ b/"):
            current_file = line[6:]
            continue
        if not current_file or line.startswith("+++") or line.startswith("---"):
            continue
        if line.startswith("+") or line.startswith("-"):
            m = STRINGS_KEY_PATTERN.match(line[1:])
            if not m:
                continue
            locale = current_file.split(".lproj/")[0].rsplit("/", 1)[-1] if ".lproj/" in current_file else "?"
            bucket = changes.setdefault(m.group(1), {})
            kind = "changed" if line.startswith("+") else "removed"
            bucket.setdefault(kind, [])
            if locale not in bucket[kind]:
                bucket[kind].append(locale)
    return changes


def android_res_dir(android_root, module, profile):
    module = module or c.pget(profile, "android.defaultModule", "app")
    for template in c.pget(profile, "android.moduleResCandidates", ["{module}/src/main/res"]):
        candidate = os.path.join(android_root, template.replace("{module}", module))
        if os.path.isdir(candidate):
            return candidate
    return None


def android_locales(res_dir, android_id, file_name, locale_dirs):
    status = {}
    for locale_dir in locale_dirs:
        path = os.path.join(res_dir, locale_dir, file_name)
        if not os.path.isfile(path):
            status[locale_dir] = None
            continue
        with open(path, encoding="utf-8") as handle:
            status[locale_dir] = ('name="%s"' % android_id) in handle.read()
    return status


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    c.add_profile_args(parser)
    parser.add_argument("--repo", help="lead repository path; default: profile lead.repo under --workspace")
    c.add_range_args(parser)
    parser.add_argument("--android", help="follower (Android) repository path for mapping and locale status; default: profile follower.repo when it exists")
    parser.add_argument("--no-android", action="store_true", help="skip the follower side even if the profile names it")
    parser.add_argument("--out", help="directory for string_keys.json (must be outside the repos)")
    args = parser.parse_args()

    profile = c.load_profile(args.profile)
    repo = c.resolve_repo(args.repo, profile, "lead.repo", args)
    android = None
    if not args.no_android:
        if args.android:
            android = os.path.abspath(args.android)
        else:
            rel = c.pget(profile, "follower.repo")
            candidate = os.path.join(c.workspace_dir(args), rel) if rel and not os.path.isabs(rel) else rel
            android = os.path.abspath(candidate) if candidate and os.path.isdir(candidate) else None
        if args.android and not os.path.isdir(android):
            c.fail("android path not found: %s" % android)
    out_dir = c.guard_out(args.out, [repo, android])
    base, head, merge_sha, is_merge = c.resolve_range(repo, args.merge, args.rng)
    notes = []

    accessor_pattern = re.compile(c.pget(profile, "ios.stringAccessorPattern", r"\bLocalizedString\.([A-Za-z_][A-Za-z0-9_]*)"))
    accessor_ignore = set(c.pget(profile, "ios.accessorIgnore", ["tr", "self"]))
    generated_file = c.pget(profile, "ios.generatedStringsFile")
    key_pattern = c.pget(profile, "ios.generatedKeyPattern", r'tr\("Localizable",\s*"((?:[^"\\]|\\.)*)"')
    strings_dir = c.pget(profile, "ios.stringsDir")
    strings_file = c.pget(profile, "ios.stringsFileName", "Localizable.strings")
    ios_locales = c.pget(profile, "ios.locales", [])
    ios_mapping_file = c.pget(profile, "ios.mappingFile", "string_mapping.json")
    ios_id_field = c.pget(profile, "ios.mappingIdField", "ios_id")
    test_pattern = re.compile(c.pget(profile, "ios.testPathPattern", r"Tests?/|Tests?\.swift$"))
    android_mapping_file = c.pget(profile, "android.mappingFile", "string_mapping.json")
    android_id_field = c.pget(profile, "android.mappingIdField", "android_id")
    android_locale_dirs = list(c.pget(profile, "android.localeDirs", [])) + list(c.pget(profile, "android.overrideDirs", []))
    android_strings_file = c.pget(profile, "android.stringsFileName", "strings.xml")

    touched = [e["path"] for e in c.name_status(repo, base, head)
               if e["status"] != "D" and e["path"].endswith(".swift")
               and "/Generated/" not in e["path"] and not test_pattern.search(e["path"])]

    if generated_file and c.path_exists_at(repo, head, generated_file):
        accessor_to_key = parse_generated(c.show(repo, head, generated_file), key_pattern)
    else:
        accessor_to_key = {}
        notes.append("generated strings file %s not found at %s; accessors cannot be mapped to keys" % (generated_file, head))

    usage = {}
    hardcoded = []
    for path in touched:
        text = c.show(repo, head, path)
        for number, line in enumerate(text.splitlines(), 1):
            stripped = line.strip()
            for m in accessor_pattern.finditer(line):
                accessor = m.group(1)
                if accessor in accessor_ignore:
                    continue
                usage.setdefault(accessor, []).append({"file": path, "line": number})
            if stripped.startswith(("//", "///", "*", "/*")) or "print(" in stripped or "fallback:" in stripped:
                continue
            for literal in CJK_LITERAL_PATTERN.findall(line):
                hardcoded.append({"file": path, "line": number, "literal": literal[:120]})

    locale_sets = {}
    for locale in ios_locales:
        path = "%s/%s.lproj/%s" % (strings_dir, locale, strings_file) if strings_dir else None
        locale_sets[locale] = strings_keys(c.show(repo, head, path)) if (path and c.path_exists_at(repo, head, path)) else None

    ios_mapping = {}
    if c.path_exists_at(repo, head, ios_mapping_file):
        for entry in json.loads(c.show(repo, head, ios_mapping_file)).get("mappings", []):
            ios_mapping[entry.get(ios_id_field)] = entry
    else:
        notes.append("%s not found at %s" % (ios_mapping_file, head))

    android_mapping = {}
    if android:
        mapping_path = os.path.join(android, android_mapping_file)
        if os.path.isfile(mapping_path):
            with open(mapping_path, encoding="utf-8") as handle:
                for entry in json.load(handle).get("mappings", []):
                    android_mapping[entry.get("common_id")] = entry
        else:
            notes.append("android %s not found; android status skipped" % android_mapping_file)
        notes.append("android mapping and locale status are read from the working tree, not from a frozen revision")

    diff_changes = diff_string_changes(repo, base, head, strings_file)
    keys = {}
    for accessor, places in usage.items():
        key = accessor_to_key.get(accessor)
        record = keys.setdefault(key or ("<unmapped>" + accessor), {"key": key, "accessor": accessor, "usedIn": []})
        record["usedIn"].extend(places)
    for key in diff_changes:
        keys.setdefault(key, {"key": key, "accessor": None, "usedIn": []})

    output = []
    for key, record in keys.items():
        real_key = record["key"]
        item = {
            "key": real_key,
            "accessor": record["accessor"],
            "usedIn": record["usedIn"],
            "inIosMapping": bool(real_key and real_key in ios_mapping),
            "commonId": ios_mapping.get(real_key, {}).get("common_id") if real_key else None,
            "iosLocales": {loc: (real_key in keys_set) if (keys_set is not None and real_key) else None for loc, keys_set in locale_sets.items()},
            "diffChanged": diff_changes.get(real_key, {}),
            "android": None,
        }
        if android and (item["commonId"] is not None or real_key):
            common_id = item["commonId"] or real_key
            entry = android_mapping.get(common_id)
            android_id = entry.get(android_id_field) if entry else common_id
            res_dir = android_res_dir(android, entry.get("module") if entry else None, profile)
            file_name = (entry.get("file") if entry else None) or android_strings_file
            item["android"] = {
                "inMapping": bool(entry),
                "androidId": android_id,
                "module": entry.get("module") if entry else None,
                "file": entry.get("file") if entry else None,
                "resDir": os.path.relpath(res_dir, android) if res_dir else None,
                "locales": android_locales(res_dir, android_id, file_name, android_locale_dirs) if res_dir else None,
            }
        output.append(item)

    output.sort(key=lambda i: (i["key"] is None, i["key"] or "", i["accessor"] or ""))
    result = c.base_result("list_string_keys", profile=profile, repo=repo, base=base, head=head, mergeSha=merge_sha, isMergeCommit=is_merge, android=android)
    result["touchedSwiftFiles"] = touched
    result["keys"] = output
    result["hardcodedCandidates"] = hardcoded
    result["notes"] = notes + ["hardcodedCandidates are CJK string literals in touched source files; a human decides which should become formal keys."]
    c.emit(result, out_dir, "string_keys.json", "%d keys, %d hardcoded candidates, %d source files" % (len(output), len(hardcoded), len(touched)))


if __name__ == "__main__":
    main()
