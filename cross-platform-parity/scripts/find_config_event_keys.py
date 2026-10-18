#!/usr/bin/env python3
"""Find analytics event names, parameter keys, string enums, log call sites and
remote config keys/defaults in the source files a merge touched.

Read-only. Search patterns come from the profile (ios.eventNamePattern,
ios.remoteConfigKeyPattern, ios.logCallPattern, ios.remoteConfigFiles).
Timing and value semantics still need a human reading the symbols. Output: config_event_keys.json.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

PARAM_KEY = re.compile(r'"([a-z0-9_]+)"\s*:')
STRING_ENUM = re.compile(r"enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*String\b")
ENUM_CASE = re.compile(r"^\s*case\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*=\s*\"([^\"]*)\")?")
INIT_DEFAULT = re.compile(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(Int|Double|Bool|String|TimeInterval|Float|\[[^\]]*\])\s*=\s*([^,)\n]+)")
LET_DEFAULT = re.compile(r"\b(?:static\s+)?let\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*([A-Za-z\[\]<>?]+))?\s*=\s*(.+)$")


def enum_blocks(text):
    blocks = []
    for m in STRING_ENUM.finditer(text):
        brace = text.find("{", m.end())
        if brace < 0:
            continue
        depth, index = 0, brace
        while index < len(text):
            ch = text[index]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    break
            index += 1
        body = text[brace:index]
        cases = []
        for line in body.splitlines():
            cm = ENUM_CASE.match(line)
            if cm:
                cases.append({"case": cm.group(1), "rawValue": cm.group(2) if cm.group(2) is not None else cm.group(1)})
        blocks.append({"enum": m.group(1), "cases": cases})
    return blocks


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    c.add_profile_args(parser)
    parser.add_argument("--repo", help="lead repository path; default: profile lead.repo under --workspace")
    c.add_range_args(parser)
    parser.add_argument("--out", help="directory for config_event_keys.json (must be outside --repo)")
    args = parser.parse_args()

    profile = c.load_profile(args.profile)
    repo = c.resolve_repo(args.repo, profile, "lead.repo", args)
    out_dir = c.guard_out(args.out, [repo])
    base, head, merge_sha, is_merge = c.resolve_range(repo, args.merge, args.rng)
    event_name = re.compile(c.pget(profile, "ios.eventNamePattern", r'return\s+"([a-z0-9]+(?:_[a-z0-9]+)+)"'))
    config_key = re.compile(c.pget(profile, "ios.remoteConfigKeyPattern", r'configValue\(forKey:\s*"([^"]+)"\)'))
    log_call = re.compile(c.pget(profile, "ios.logCallPattern", r"logEvent\(|\.log\(|track\("))
    test_pattern = re.compile(c.pget(profile, "ios.testPathPattern", r"Tests?/|Tests?\.swift$"))
    always_include = c.pget(profile, "ios.remoteConfigFiles", [])

    touched = [e["path"] for e in c.name_status(repo, base, head)
               if e["status"] != "D" and e["path"].endswith(".swift") and not test_pattern.search(e["path"])]
    files = list(touched)
    for extra in always_include:
        if extra not in files and c.path_exists_at(repo, head, extra):
            files.append(extra)

    events, param_keys, enums, log_sites, config_keys, defaults = [], [], [], [], [], []
    seen_params = set()
    for path in files:
        text = c.show(repo, head, path)
        is_event_file = "eventName" in text or "EventProtocol" in text
        is_config_file = "RemoteConfig" in path or "Config" in os.path.basename(path)
        for number, line in enumerate(text.splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith(("//", "///", "*")):
                continue
            if is_event_file:
                for m in event_name.finditer(line):
                    events.append({"name": m.group(1), "file": path, "line": number})
                for m in PARAM_KEY.finditer(line):
                    key = (m.group(1), path)
                    if key not in seen_params:
                        seen_params.add(key)
                        param_keys.append({"key": m.group(1), "file": path, "line": number})
            if log_call.search(line) and "Event" in line:
                log_sites.append({"file": path, "line": number, "text": stripped[:160]})
            for m in config_key.finditer(line):
                config_keys.append({"key": m.group(1), "file": path, "line": number})
            if is_config_file:
                for m in INIT_DEFAULT.finditer(line):
                    defaults.append({"name": m.group(1), "type": m.group(2), "default": m.group(3).strip(), "file": path, "line": number, "kind": "init parameter default"})
                lm = LET_DEFAULT.search(line)
                if lm and re.search(r"default|fallback", line, re.IGNORECASE):
                    defaults.append({"name": lm.group(1), "type": lm.group(2), "default": lm.group(3).strip()[:120], "file": path, "line": number, "kind": "constant"})
        if is_event_file:
            for block in enum_blocks(text):
                block["file"] = path
                enums.append(block)

    result = c.base_result("find_config_event_keys", profile=profile, repo=repo, base=base, head=head, mergeSha=merge_sha, isMergeCommit=is_merge)
    result["scannedFiles"] = files
    result["events"] = events
    result["eventParameterKeys"] = param_keys
    result["stringEnums"] = enums
    result["logCallSites"] = log_sites
    result["remoteConfig"] = {"keys": config_keys, "defaults": defaults}
    result["notes"] = ["Names are candidates from regex scans; record timing and value semantics by reading the listed symbols.",
                       "Files listed in profile ios.remoteConfigFiles are always scanned so config keys defined outside the diff are still listed."]
    c.emit(result, out_dir, "config_event_keys.json", "%d events, %d param keys, %d enums, %d config keys, %d defaults" % (len(events), len(param_keys), len(enums), len(config_keys), len(defaults)))


if __name__ == "__main__":
    main()
