#!/usr/bin/env python3
"""Classify every file touched by a merge (or range) into handoff classes.

Read-only: uses git diff/numstat only. Built-in rules cover iOS and Android
layouts; the profile's classify.extraRules are checked first. Output: classify_diff.json.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

IOS_RULES = [
    ("測試", r"(^|/)[A-Za-z]*Tests/|Tests?\.swift$|__Snapshots__", "test target directory or *Test(s).swift"),
    ("字串", r"Localizable\.strings(dict)?$|/Generated/LocalizedString\.swift$|string_mapping\.json$", "localization resource or mapping"),
    ("事件", r"/EventTracking/|Event\.swift$|Analytics", "event tracking"),
    ("素材", r"\.xcassets/|\.imageset/|/Resources/Font/|/Lottie/|\.(png|jpe?g|svg|pdf|gif|ttf|otf|mp4|mov)$", "asset catalog, font or media file"),
    ("設定", r"/RemoteConfig/|RemoteConfig[A-Za-z]*\.swift$|Config\.swift$|\.plist$|\.xcconfig$|\.entitlements$", "remote config or app configuration"),
    ("元件", r"/Views?/|View\.swift$|Cell\.swift$|Button\.swift$|/Components?/", "view component"),
    ("畫面", r"/ViewControllers?/|/Pages/|/Coordinator/|ViewController\.swift$|Screen\.swift$", "screen or navigation"),
    ("資料", r"/ViewModels?/|/Interactor/|/Models?/|/Data/|/Provider/|Repository|Store\.swift$|API\.swift$|DataSource|Brain\.swift$|Models\.swift$|Cache", "state, model or data access"),
    ("其他", r"project\.pbxproj$|Podfile|Package\.(swift|resolved)$|\.ya?ml$|\.md$", "build or project file"),
]

ANDROID_RULES = [
    ("測試", r"/src/(test|androidTest)/|Tests?\.kt$", "test source set"),
    ("字串", r"/res/values[^/]*/strings\.xml$|string_mapping\.json$", "string resource or mapping"),
    ("事件", r"/analytics/|Event\.kt$|Tracking", "analytics event"),
    ("素材", r"/res/(drawable|mipmap|raw|font)[^/]*/|\.(png|jpe?g|svg|webp|ttf|otf|mp4)$", "drawable, font or media resource"),
    ("設定", r"RemoteConfig|Config\.kt$|AndroidManifest\.xml$|\.properties$", "remote config or app configuration"),
    ("元件", r"/components?/|/designsystem/|(Button|Card|Dialog|Item|Row|Cell|Bar)\.kt$", "composable component"),
    ("畫面", r"(Screen|Activity|Fragment|Route|Navigation|Content)\.kt$|/navigation/", "screen or navigation"),
    ("資料", r"(ViewModel|Repository|DataSource|Store|Api|Dto|Model|UseCase|Interactor|Projection)\.kt$|/core/(model|network|data|datastore)/", "state, model or data access"),
    ("其他", r"\.gradle(\.kts)?$|gradle\.properties$|\.toml$|\.md$|\.pro$", "build or project file"),
]


def classify(path, rules):
    for klass, pattern, rule in rules:
        if re.search(pattern, path):
            return klass, rule
    return "其他", "no rule matched; review manually"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    c.add_profile_args(parser)
    parser.add_argument("--repo", help="repository path; default: profile lead.repo under --workspace")
    c.add_range_args(parser)
    parser.add_argument("--platform", choices=["ios", "android"], help="rule set; default: profile lead.platform")
    parser.add_argument("--out", help="directory for classify_diff.json (must be outside --repo)")
    args = parser.parse_args()

    profile = c.load_profile(args.profile)
    repo = c.resolve_repo(args.repo, profile, "lead.repo", args)
    out_dir = c.guard_out(args.out, [repo])
    base, head, merge_sha, is_merge = c.resolve_range(repo, args.merge, args.rng)
    platform = args.platform or c.pget(profile, "lead.platform", "ios")
    rules = [(r["class"], r["pattern"], r.get("rule", "profile extra rule")) for r in c.pget(profile, "classify.extraRules", [])]
    rules += IOS_RULES if platform == "ios" else ANDROID_RULES
    stats = c.numstat(repo, base, head)

    files = []
    summary = {}
    for entry in c.name_status(repo, base, head):
        klass, rule = classify(entry["path"], rules)
        stat = stats.get(entry["path"], {"additions": None, "deletions": None})
        item = {
            "path": entry["path"],
            "status": entry["status"],
            "oldPath": entry.get("oldPath"),
            "additions": stat["additions"],
            "deletions": stat["deletions"],
            "class": klass,
            "rule": rule,
            "debug": bool(re.search(r"[Dd]ebug", entry["path"])),
        }
        files.append(item)
        summary[klass] = summary.get(klass, 0) + 1

    result = c.base_result("classify_diff", profile=profile, repo=repo, platform=platform, base=base, head=head, mergeSha=merge_sha, isMergeCommit=is_merge)
    result["files"] = sorted(files, key=lambda f: (f["class"], f["path"]))
    result["summary"] = dict(sorted(summary.items()))
    result["notes"] = ["Files classed 其他 or flagged debug need manual review before they enter manifest chapter 2."]
    c.emit(result, out_dir, "classify_diff.json", "%d files, %s" % (len(files), result["summary"]))


if __name__ == "__main__":
    main()
