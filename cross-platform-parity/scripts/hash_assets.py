#!/usr/bin/env python3
"""Hash image/media assets and compare them with same-name follower resources.

Reads from a frozen revision (--repo --at) or from the working tree (for local
media packs). Read-only. Output: assets.json.
"""
import argparse
import hashlib
import os
import re
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as c  # noqa: E402

EXTENSIONS = (".png", ".jpg", ".jpeg", ".svg", ".pdf", ".gif", ".webp", ".mp4", ".mov", ".ttf", ".otf")
SCALE = re.compile(r"@([23])x$")
DENSITY_HINT = {"1x": "mdpi", "2x": "xhdpi", "3x": "xxhdpi"}


def png_size(data):
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
        width, height = struct.unpack(">II", data[16:24])
        return width, height
    return None, None


def describe(rel_path, data):
    stem, ext = os.path.splitext(os.path.basename(rel_path))
    scale_match = SCALE.search(stem)
    scale = scale_match.group(1) + "x" if scale_match else "1x"
    base_name = SCALE.sub("", stem)
    parent = os.path.basename(os.path.dirname(rel_path))
    if parent.endswith(".imageset"):
        base_name = parent[:-len(".imageset")]
    width, height = png_size(data) if ext.lower() == ".png" else (None, None)
    return {"path": rel_path, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "width": width, "height": height,
            "scale": scale, "densityHint": DENSITY_HINT.get(scale), "baseName": base_name}


def iter_repo_files(repo, rev, path):
    for rel in c.git(repo, "ls-tree", "-r", "--name-only", rev, "--", path).splitlines():
        if rel.lower().endswith(EXTENSIONS):
            yield rel, c.show_bytes(repo, rev, rel)


def iter_tree_files(path):
    if os.path.isfile(path):
        with open(path, "rb") as handle:
            yield path, handle.read()
        return
    for root, _, names in os.walk(path):
        for name in sorted(names):
            full = os.path.join(root, name)
            if full.lower().endswith(EXTENSIONS):
                with open(full, "rb") as handle:
                    yield full, handle.read()


def android_matches(res_dir, base_name):
    matches = []
    if not res_dir or not os.path.isdir(res_dir):
        return matches
    for entry in sorted(os.listdir(res_dir)):
        if not (entry.startswith("drawable") or entry.startswith("mipmap")):
            continue
        folder = os.path.join(res_dir, entry)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            stem, ext = os.path.splitext(name)
            if stem == base_name:
                full = os.path.join(folder, name)
                with open(full, "rb") as handle:
                    data = handle.read()
                width, height = png_size(data) if ext.lower() == ".png" else (None, None)
                density = entry.split("-", 1)[1] if "-" in entry else "default"
                matches.append({"path": full, "density": density, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "width": width, "height": height})
    return matches


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    c.add_profile_args(parser)
    parser.add_argument("--paths", nargs="+", required=True, help="files or directories; relative to --repo when --at is given")
    parser.add_argument("--repo", help="repository to read from at --at; default: profile lead.repo under --workspace")
    parser.add_argument("--at", help="revision to read the paths from (working tree when omitted)")
    parser.add_argument("--android-res", help="follower res directory for same-name lookup; default: profile follower.repo + android.resDir when it exists")
    parser.add_argument("--no-android", action="store_true", help="skip the follower lookup")
    parser.add_argument("--out", help="directory for assets.json (must be outside the repos)")
    args = parser.parse_args()

    profile = c.load_profile(args.profile)
    repo = c.resolve_repo(args.repo, profile, "lead.repo", args) if args.at else (c.require_repo(args.repo) if args.repo else None)
    android_res = None if args.no_android else c.resolve_path(args.android_res, profile, "follower.repo", "android.resDir", args)
    out_dir = c.guard_out(args.out, [repo, android_res])

    groups = {}
    for path in args.paths:
        iterator = iter_repo_files(repo, args.at, path) if args.at else iter_tree_files(path)
        count = 0
        for rel, data in iterator:
            count += 1
            item = describe(rel, data)
            groups.setdefault(item["baseName"], {"baseName": item["baseName"], "iosFiles": [], "android": []})["iosFiles"].append(item)
        if count == 0:
            sys.stderr.write("warning: no asset files under %s\n" % path)

    for base_name, group in groups.items():
        matches = android_matches(android_res, base_name)
        ios_hashes = {f["sha256"] for f in group["iosFiles"]}
        for match in matches:
            match["sameAsIos"] = match["sha256"] in ios_hashes
        group["android"] = matches
        group["androidSameNameExists"] = bool(matches)
        group["androidAnyIdentical"] = any(m["sameAsIos"] for m in matches)

    result = c.base_result("hash_assets", profile=profile, repo=repo, at=args.at, androidRes=android_res)
    result["groups"] = list(groups.values())
    result["notes"] = ["densityHint is only a hint (@1x≈mdpi, @2x≈xhdpi, @3x≈xxhdpi); whether the follower can reuse the file is decided in manifest chapter 4.",
                       "androidAnyIdentical false with androidSameNameExists true means the follower resource is a different image: import under a new name."]
    total = sum(len(g["iosFiles"]) for g in groups.values())
    c.emit(result, out_dir, "assets.json", "%d files in %d groups" % (total, len(groups)))


if __name__ == "__main__":
    main()
