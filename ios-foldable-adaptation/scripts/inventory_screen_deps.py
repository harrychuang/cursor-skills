#!/usr/bin/env python3
"""盤點 iOS 專案裡「以螢幕為準」的寫法（iPhone Duo 開合後會跑版的根源），輸出清單與修法提示。

用法：
  inventory_screen_deps.py <repo 或 App 目錄> [--path-prefix OriginalAuthors/9_BoringChan] [--exclude Pods --exclude Example]
                           [--format md|json] [--out inventory.md] [--include-tests]

規則與優先度（修完 P1、P2 歸零才算完成盤點階段）：
  r1  P1  版面尺寸直接取自螢幕：UIScreen.main.bounds / nativeBounds、UIScreen.main.fixedCoordinateSpace、
          UIWindow(frame: UIScreen.main.bounds)、UIApplication.shared.statusBarFrame、keyWindow.safeAreaInsets 當版面依據。
          摺疊／展開、Split View、轉向後不會重算。→ 改用容器（view.bounds、superview、safeAreaLayoutGuide、
          readableContentGuide）或在 viewDidLayoutSubviews／viewWillTransition 重算。
  r2  P1  自訂的螢幕尺寸常數與別名：screenWidth / screenHeight / SCREEN_WIDTH / Device.width / ratioWidth 這類
          static let（啟動時算一次就快取）。→ 改成依所在 scene 的螢幕即時計算，或改成依容器寬度；比例值設上限。
  r3  P2  以裝置／方向推版面：UIDevice.current.orientation、statusBarOrientation、userInterfaceIdiom、
          機型判斷（iPhone X、hasNotch、isPad）、寫死的機型寬度（375/390/393/402/414/428/430/440）。
          → 改用 size class、traitCollection、容器寬高（width > height 判橫向）。
  r4  P2  UIScreen.main.scale / UIScreen.main.traitCollection。→ traitCollection.displayScale。
  r5  P2  寫死的 Info.plist 直向鎖定與 shouldAutorotate=false 類的方向鎖。→ 見 references/track-uikit.md。

只掃 .swift / .m / .mm / .h。預設排除 Pods、Carthage、.build、DerivedData、Example、Library、*Tests（可用 --include-tests 納入）。
輸出是「候選」清單：每一筆都要人看過（例如 UIScreen.main.scale 用於圖片快取大小不算 r4）。
"""
import argparse
import json
import os
import re
import sys

RULES = [
    ("r1", "P1", "版面尺寸直接取自螢幕", [
        r"UIScreen\.main\.(bounds|nativeBounds|fixedCoordinateSpace)",
        r"UIScreen\.main(?!\.(scale|brightness|traitCollection|nativeScale))\b",
        r"\[UIScreen mainScreen\]\s*(bounds|nativeBounds)",
        r"UIWindow\(frame:\s*UIScreen",
        r"UIApplication\.shared\.statusBarFrame",
        r"statusBarManager\?\.statusBarFrame",
        r"keyWindow\??\.(safeAreaInsets|frame|bounds)",
        r"windows\.first\??\.(safeAreaInsets|frame|bounds)",
    ], "改用容器尺寸（view.bounds／superview／safeAreaLayoutGuide），在 viewDidLayoutSubviews 或 viewWillTransition(to:with:) 重算；需要螢幕時用 view.window?.windowScene?.screen。"),
    ("r2", "P1", "自訂的螢幕尺寸常數／別名", [
        # 成員存取（Device.screenWidth、UIScreen.width、LegoDevice.ratioWidth）或定義處；函式參數名 screenHeight: 不算
        r"\.(screenWidth|screenHeight|screenW|screenH|screenBounds|screenSize|ratioWidth|ratioHeight|scaleWidth|scaleHeight|adjustedWidth|adjustedHeight)\b",
        r"\b(Device|Screen|UIScreen|DeviceInfo|ScreenInfo)\.(width|height|size|bounds)\b",
        r"\b(SCREEN_WIDTH|SCREEN_HEIGHT|SCREEN_BOUNDS|kScreenWidth|kScreenHeight|kScreenBounds)\b",
        r"(static\s+)?(let|var)\s+(screenWidth|screenHeight|screenW|screenH|screenBounds|screenSize|ratioWidth|ratioHeight)\b",
        r"static\s+(let|var)\s+\w*(Width|Height|Ratio|Bounds)\w*\s*(:|=)\s*[^\n]*UIScreen",
    ], "定義處改成依目前 scene 的螢幕即時計算（不要 static let 快取），比例值設上限（例如 Pro Max 440）；使用處逐一改成容器寬度。"),
    ("r3", "P2", "以裝置／方向推版面", [
        r"UIDevice\.current\.orientation",
        r"\.statusBarOrientation\b",
        r"interfaceOrientation\s*(==|!=|\.isLandscape|\.isPortrait)",
        r"UIDevice\.current\.userInterfaceIdiom\s*==",
        r"\b(isIPhoneX|hasNotch|isNotch|iPhoneXSeries|isPad|isIPad|isPhone|isSmallScreen|isPlusModel)\b",
        r"(==|>=|<=|>|<)\s*(375|390|393|402|414|428|430|440)(\.0)?\b",
    ], "改用 traitCollection.horizontalSizeClass／verticalSizeClass、容器 width > height 判橫向、safeAreaInsets 判瀏海；機型判斷一律拿掉。"),
    ("r4", "P2", "螢幕縮放比例", [
        r"UIScreen\.main\.(scale|nativeScale|traitCollection)",
        r"\[UIScreen mainScreen\]\.scale",
    ], "改用 traitCollection.displayScale（view 或 window 的）。只用來算圖片快取大小的可列為例外。"),
    ("r5", "P2", "方向鎖定", [
        r"shouldAutorotate\s*:\s*Bool\s*\{[^}]*false",
        r"supportedInterfaceOrientations[^\n]*\.portrait\b",
        r"UIInterfaceOrientationMask\.portrait\b",
        r"setValue\([^\n]*orientation",
    ], "大螢幕（短邊 > 440）開放直向＋landscapeLeft，一般 iPhone 維持；PAGEs 類套件頁面另外看 track 文件。"),
]

DEFAULT_EXCLUDES = ["Pods", "Carthage", ".build", "DerivedData", "Example", "Examples", "Library", "Vendor", "ThirdParty", "node_modules", ".git"]
EXTS = (".swift", ".m", ".mm", ".h")


def iter_files(root, excludes, include_tests):
    for dirpath, dirnames, filenames in os.walk(root):
        parts = set(os.path.relpath(dirpath, root).split(os.sep))
        if parts & set(excludes):
            dirnames[:] = []
            continue
        if not include_tests and any(p.endswith("Tests") or p.endswith("UITests") for p in parts):
            dirnames[:] = []
            continue
        for fn in filenames:
            if fn.endswith(EXTS):
                yield os.path.join(dirpath, fn)


def scan(root, excludes, include_tests):
    compiled = [(rid, prio, title, [re.compile(p) for p in pats], fix) for rid, prio, title, pats, fix in RULES]
    hits = []
    for path in iter_files(root, excludes, include_tests):
        try:
            lines = open(path, encoding="utf-8", errors="replace").read().split("\n")
        except OSError:
            continue
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
                continue
            for rid, prio, title, pats, fix in compiled:
                if any(p.search(line) for p in pats):
                    hits.append({"rule": rid, "priority": prio, "file": os.path.relpath(path, root), "line": i,
                                 "snippet": stripped[:160], "title": title, "fix": fix})
                    break
    return hits


def render_md(root, hits):
    out = [f"# iPhone Duo 盤點：以螢幕為準的寫法\n", f"掃描根目錄：`{root}`\n"]
    by_rule = {}
    for h in hits:
        by_rule.setdefault(h["rule"], []).append(h)
    summary = {rid: len(by_rule.get(rid, [])) for rid, *_ in RULES}
    out.append("| 規則 | 優先度 | 說明 | 筆數 |\n|---|---|---|---|")
    for rid, prio, title, _, _ in RULES:
        out.append(f"| {rid} | {prio} | {title} | {summary[rid]} |")
    out.append("")
    for rid, prio, title, _, fix in RULES:
        rows = by_rule.get(rid, [])
        if not rows:
            continue
        out.append(f"## {rid}（{prio}）{title} — {len(rows)} 筆\n\n修法：{fix}\n")
        out.append("| 檔案:行 | 片段 |\n|---|---|")
        for h in rows:
            snippet = h["snippet"].replace("|", "\\|").replace("`", "'")
            out.append(f"| `{h['file']}:{h['line']}` | `{snippet}` |")
        out.append("")
    out.append("每一筆都要人看過再決定修或列例外（例外要寫原因）。P1 與 P2 都歸零（或全部列例外）才進下一階段。")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", help="repo 根目錄或 App 目錄")
    ap.add_argument("--path-prefix", default=None, help="只掃 root 底下這個相對路徑（monorepo 裡指定單一 App）")
    ap.add_argument("--exclude", action="append", default=[], help="額外排除的目錄名稱（可重複）")
    ap.add_argument("--include-tests", action="store_true")
    ap.add_argument("--format", choices=["md", "json"], default="md")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if args.path_prefix:
        root = os.path.join(root, args.path_prefix)
    if not os.path.isdir(root):
        sys.exit(f"not a directory: {root}")
    hits = scan(root, DEFAULT_EXCLUDES + args.exclude, args.include_tests)
    hits.sort(key=lambda h: (h["priority"], h["rule"], h["file"], h["line"]))
    text = json.dumps({"root": root, "hits": hits}, ensure_ascii=False, indent=1) if args.format == "json" else render_md(root, hits)
    if args.out:
        open(args.out, "w", encoding="utf-8").write(text)
        counts = {}
        for h in hits:
            counts[h["priority"]] = counts.get(h["priority"], 0) + 1
        print(f"wrote {args.out}: {len(hits)} hits {counts}")
    else:
        print(text)


if __name__ == "__main__":
    main()
