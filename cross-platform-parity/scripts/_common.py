"""Shared read-only helpers for the parity handoff inventory scripts.

Every helper reads Git history or files and never writes into a repository.
Output goes to stdout or to the caller's --out directory only. Project-specific
values come from a JSON project profile (see ../references/project-profile.md).
"""
import datetime
import json
import os
import subprocess
import sys

DEFAULT_PROFILE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "profile.example.json"))


def fail(message, code=2):
    sys.stderr.write("error: %s\n" % message)
    sys.exit(code)


def git(repo, *args, binary=False):
    cmd = ["git", "--no-optional-locks", "-C", repo] + list(args)
    result = subprocess.run(cmd, capture_output=True, check=False)
    if result.returncode != 0:
        raise RuntimeError("git %s failed: %s" % (" ".join(args[:3]), result.stderr.decode("utf-8", "replace").strip()))
    return result.stdout if binary else result.stdout.decode("utf-8", "replace")


def require_repo(path):
    if not path or not os.path.isdir(path):
        fail("repo path not found: %s" % path)
    try:
        git(path, "rev-parse", "--show-toplevel")
    except RuntimeError as exc:
        fail(str(exc))
    return os.path.abspath(path)


# ---------------------------------------------------------------- profile

def add_profile_args(parser):
    parser.add_argument("--profile", help="project profile JSON; without it the bundled example profile is used and a notice is printed")
    parser.add_argument("--workspace", help="directory that profile-relative repo paths resolve against (default: current directory)")


def load_profile(path):
    used_default = path is None
    resolved = os.path.abspath(path or DEFAULT_PROFILE)
    if not os.path.isfile(resolved):
        fail("profile not found: %s" % resolved)
    with open(resolved, encoding="utf-8") as handle:
        data = json.load(handle)
    if used_default:
        sys.stderr.write("notice: using bundled example profile (%s); pass --profile <json> for your project\n" % pget(data, "project.name", "example"))
    data["_path"] = resolved
    data["_bundled"] = used_default
    return data


def pget(profile, dotted, default=None):
    node = profile
    for part in dotted.split("."):
        if not isinstance(node, dict) or part not in node:
            return default
        node = node[part]
    return node


def profile_summary(profile):
    return {"path": profile.get("_path"), "project": pget(profile, "project.name"), "bundledExample": bool(profile.get("_bundled"))}


def workspace_dir(args):
    return os.path.abspath(args.workspace) if getattr(args, "workspace", None) else os.getcwd()


def resolve_repo(explicit, profile, key, args):
    """Explicit CLI path wins; otherwise the profile path relative to --workspace."""
    if explicit:
        return require_repo(explicit)
    rel = pget(profile, key)
    if not rel:
        fail("no repository given: pass the CLI path or set %s in the profile" % key)
    return require_repo(rel if os.path.isabs(rel) else os.path.join(workspace_dir(args), rel))


def resolve_path(explicit, profile, repo_key, sub_key, args, must_exist=True):
    """Explicit CLI path wins; otherwise <workspace>/<profile repo>/<profile sub path>."""
    if explicit:
        return os.path.abspath(explicit)
    repo = pget(profile, repo_key)
    sub = pget(profile, sub_key)
    if not repo or not sub:
        return None
    candidate = os.path.join(workspace_dir(args), repo, sub) if not os.path.isabs(repo) else os.path.join(repo, sub)
    if must_exist and not os.path.exists(candidate):
        return None
    return os.path.abspath(candidate)


# ---------------------------------------------------------------- git helpers

def resolve_range(repo, merge=None, rng=None):
    """Return (base, head, merge_sha, is_merge_commit)."""
    if rng:
        if ".." not in rng:
            fail("--range must look like <base>..<head>")
        base, head = rng.split("..", 1)
        try:
            base = git(repo, "rev-parse", "--verify", base + "^{commit}").strip()
            head = git(repo, "rev-parse", "--verify", head + "^{commit}").strip()
        except RuntimeError as exc:
            fail(str(exc))
        return base, head, None, False
    if not merge:
        fail("give --merge <sha> or --range <base>..<head>")
    try:
        line = git(repo, "rev-list", "--parents", "-n", "1", merge).split()
    except RuntimeError as exc:
        fail(str(exc))
    if not line:
        fail("commit not found: %s" % merge)
    sha, parents = line[0], line[1:]
    if not parents:
        fail("commit %s has no parent; use --range" % sha)
    return parents[0], sha, sha, len(parents) > 1


def show(repo, rev, path):
    return git(repo, "show", "%s:%s" % (rev, path))


def show_bytes(repo, rev, path):
    return git(repo, "show", "%s:%s" % (rev, path), binary=True)


def path_exists_at(repo, rev, path):
    try:
        git(repo, "cat-file", "-e", "%s:%s" % (rev, path))
        return True
    except RuntimeError:
        return False


def name_status(repo, base, head):
    entries = []
    for line in git(repo, "diff", "--name-status", "-M", base, head).splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0]
        if status.startswith("R") or status.startswith("C"):
            entries.append({"status": status[0], "path": parts[2], "oldPath": parts[1], "similarity": status[1:]})
        else:
            entries.append({"status": status, "path": parts[1], "oldPath": None})
    return entries


def numstat(repo, base, head):
    stats = {}
    for line in git(repo, "diff", "--numstat", "-M", base, head).splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        added, deleted, path = parts[0], parts[1], parts[2]
        if " => " in path:
            if "{" in path:
                pre, rest = path.split("{", 1)
                inner, post = rest.split("}", 1)
                path = pre + inner.split(" => ")[1] + post
            else:
                path = path.split(" => ")[1]
        stats[path] = {"additions": None if added == "-" else int(added), "deletions": None if deleted == "-" else int(deleted)}
    return stats


# ---------------------------------------------------------------- output

def guard_out(out_dir, protected):
    """Refuse to write inside any repository or resource directory given as input."""
    if not out_dir:
        return None
    out_abs = os.path.abspath(out_dir)
    for p in protected:
        if not p:
            continue
        p_abs = os.path.abspath(p)
        if out_abs == p_abs or out_abs.startswith(p_abs + os.sep):
            fail("--out %s is inside input path %s; write the inventory into the handoff directory instead" % (out_dir, p))
    return out_abs


def emit(result, out_dir, filename, summary):
    text = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=False) + "\n"
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        target = os.path.join(out_dir, filename)
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(text)
        sys.stderr.write("%s: %s -> %s\n" % (result.get("script"), summary, target))
    else:
        sys.stdout.write(text)
        sys.stderr.write("%s: %s\n" % (result.get("script"), summary))


def base_result(script, profile=None, **coords):
    result = {"script": script, "generatedAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"), "readOnly": True}
    if profile is not None:
        result["profile"] = profile_summary(profile)
    result.update(coords)
    return result


def add_range_args(parser):
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--merge", help="merge commit SHA; the first-parent diff is used")
    group.add_argument("--range", dest="rng", help="<base>..<head> explicit range")
