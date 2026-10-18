#!/usr/bin/env python3
"""分析 run_qc.py 的輸出：解析 XCUITest 階層傾印 + 截圖，套用規則產生 findings，並呼叫 imgtool 畫標註圖。

用法：analyze.py <run 目錄> [--device-profile device-profile.json] [--runs REGEX] [--no-shot-only]
輸出：<run>/analysis/findings.json, screens.json, notes.json；<run>/annotated/*.png

規則（rule id → 嚴重度）：
  window-size          critical  app window 尺寸與目前面板不符（沒有重新排版）
  content-missing      critical  與「展開直向」相比元件數不到 30%（內容沒有進到畫面階層）
  black-screen         critical  截圖幾乎全黑
  out-of-bounds        high      不在捲動容器內的元件超出畫面
  cached-screen-size   high      元件尺寸等於「另一個面板」的寬／高（啟動時快取的螢幕尺寸）
  tabbar-covers-content high     文字／圖片被 Tab 列蓋住
  restore-mismatch     high      摺回後元件位置／尺寸與摺疊時不同
  tabbar-not-stretched high      展開後 TabBar 寬度沒變
  chrome-overlap       medium    與狀態列／動態島區域重疊
  overlap              low       文字／按鈕互相重疊
  blank-margin         low       展開後左右留白過多
  tabbar-side-rail     info      Tab 列以直立列呈現（系統行為，供對照）
  cover-landscape      info      摺回時落在外螢幕橫向（系統行為，供對照）

沒有階層傾印、只有截圖的情境（例如在 app 內直接觸發點選的整合測試）只套影像規則。
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
IMGTOOL = os.path.join(HERE, "imgtool")

# iPhone Duo（iOS 27.1 模擬器）的預設裝置設定；可用 --device-profile 覆蓋任一欄位
DEFAULT_PROFILE = {
    "name": "iPhone Duo",
    "scale": 3,
    "cover_pt": [466.0, 678.0],
    "inner_wide_pt": [951.0, 669.0],
    "inner_tall_pt": [669.0, 951.0],
    # 狀態列／動態島大致區域（pt），依實際截圖量測：外螢幕是右上角的直立藥丸；內螢幕寬版在右上角
    "chrome_zones": {"cover": [[380, 18, 86, 140]], "inner-wide": [[878, 18, 73, 95]], "inner-tall": []},
    "thresholds": {
        "window_size_tolerance": 6, "oob_tolerance": 3, "cached_size_tolerance": 4, "panel_diff_min": 20,
        "chrome_overlap_ratio": 0.3, "tabbar_cover_ratio": 0.3, "overlap_iou": 0.2, "contain_ratio": 0.95,
        "black_ratio": 0.985, "blank_margin_ratio": 0.30, "content_missing_min": 150, "content_missing_ratio": 0.3,
        "restore_moved_ratio": 0.25, "restore_min_matched": 5, "restore_tolerance": 3, "header_pt": 90,
    },
}

LEAF_TYPES = {"StaticText", "Button", "Image", "TextField", "SecureTextField", "Switch", "Slider", "SegmentedControl", "Link", "TextView", "SearchField"}
TEXTISH = {"StaticText", "Button", "Link", "TextField", "TextView"}
SCROLLERS = {"ScrollView", "Table", "CollectionView", "WebView"}
POSTURE_LABEL = {"folded": "摺疊（外螢幕）", "unfolded": "展開（內螢幕・寬版）",
                 "unfolded-portrait": "展開（內螢幕・直向）", "refolded": "摺回（外螢幕）",
                 "baseline": "對照組（一般 iPhone）"}
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
SEVERITY_COLOR = {"critical": "#FF2D55", "high": "#FF3B30", "medium": "#FF9500", "low": "#FFCC00", "info": "#5AC8FA"}

LINE_RE = re.compile(r"^(\s*)(?:→)?([A-Za-z]+), 0x[0-9a-fA-F]+,(?: pid: \d+,)?(?: \{\{(-?[\d.]+), (-?[\d.]+)\}, \{(-?[\d.]+), (-?[\d.]+)\}\})?(.*)$")
LABEL_RE = re.compile(r"label: '((?:[^'\\]|\\.)*)'")
IDENT_RE = re.compile(r"identifier: '((?:[^'\\]|\\.)*)'")
VALUE_RE = re.compile(r"value: (.*?)(?:, (?:label|identifier|placeholderValue): |$)")
BASE_RE = re.compile(r"^([A-Za-z0-9]+)-(.+)__([\w-]+)$")


# ----------------------------------------------------------------------------- 解析
def parse_dump(path):
    """回傳 elements: list of dict(type,x,y,w,h,label,identifier,value,depth,parent,ancestors)"""
    elements = []
    stack = []
    with open(path, encoding="utf-8", errors="replace") as f:
        in_tree = False
        for raw in f:
            line = raw.rstrip("\n")
            if line.startswith("Element subtree:"):
                in_tree = True
                continue
            if not in_tree:
                continue
            if line.startswith("Path to element:") or line.startswith("Query chain:"):
                break
            m = LINE_RE.match(line)
            if not m:
                continue
            indent, typ, x, y, w, h, rest = m.groups()
            depth = len(indent.replace("→", ""))
            el = {
                "type": typ,
                "x": float(x) if x else None, "y": float(y) if y else None,
                "w": float(w) if w else None, "h": float(h) if h else None,
                "label": (LABEL_RE.search(rest).group(1) if LABEL_RE.search(rest) else ""),
                "identifier": (IDENT_RE.search(rest).group(1) if IDENT_RE.search(rest) else ""),
                "value": (VALUE_RE.search(rest).group(1).strip() if VALUE_RE.search(rest) else ""),
                "depth": depth, "idx": len(elements),
            }
            while stack and stack[-1][0] >= depth:
                stack.pop()
            el["parent"] = stack[-1][1] if stack else None
            el["ancestors"] = [elements[i]["type"] for _, i in stack]
            elements.append(el)
            stack.append((depth, el["idx"]))
    return elements


def rect(el):
    return (el["x"], el["y"], el["w"], el["h"])


def inter(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x1, y1 = max(ax, bx), max(ay, by)
    x2, y2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    return max(0.0, x2 - x1) * max(0.0, y2 - y1)


def visible(el, W, H):
    if el["w"] is None or el["w"] <= 0 or el["h"] <= 0:
        return False
    return inter(rect(el), (0, 0, W, H)) > 0


# ----------------------------------------------------------------------------- 影像
def load_rgba(path):
    tmp = path + ".rgba"
    out = subprocess.run([IMGTOOL, "raw", path, tmp], capture_output=True, text=True, check=True).stdout.split()
    w, h = int(out[0]), int(out[1])
    arr = np.frombuffer(open(tmp, "rb").read(), dtype=np.uint8).reshape(h, w, 4)
    os.remove(tmp)
    return arr


def image_metrics(arr):
    rgb = arr[:, :, :3].astype(np.int32)
    lum = (rgb[:, :, 0] * 299 + rgb[:, :, 1] * 587 + rgb[:, :, 2] * 114) // 1000
    dark_ratio = float((lum < 12).mean())
    col_med = np.median(rgb, axis=0)
    col_dev = (np.abs(rgb - col_med[None, :, :]).sum(axis=2) > 40).mean(axis=0)
    row_med = np.median(rgb, axis=1)
    row_dev = (np.abs(rgb - row_med[:, None, :]).sum(axis=2) > 40).mean(axis=1)
    col_content = col_dev > 0.012
    row_content = row_dev > 0.012

    def margin(mask):
        n = len(mask)
        left = 0
        while left < n and not mask[left]:
            left += 1
        right = 0
        while right < n and not mask[n - 1 - right]:
            right += 1
        return left / n, right / n

    lm, rm = margin(col_content)
    tm, bm = margin(row_content)
    return {"dark_ratio": dark_ratio, "left_margin": lm, "right_margin": rm, "top_margin": tm, "bottom_margin": bm,
            "mean_lum": float(lum.mean())}


# ----------------------------------------------------------------------------- 規則
class Analyzer:
    def __init__(self, run_dir, profile, run_regex, shot_only=True):
        self.run = run_dir
        self.profile = profile
        self.T = profile["thresholds"]
        self.cover = tuple(profile["cover_pt"])
        self.inner_wide = tuple(profile["inner_wide_pt"])
        self.run_re = re.compile(run_regex)
        self.shot_only = shot_only
        self.xchg = os.path.join(run_dir, "xchg")
        self.shots = os.path.join(run_dir, "shots")
        self.findings = []
        self.screens = {}
        self.events = []
        p = os.path.join(run_dir, "events.jsonl")
        if os.path.exists(p):
            with open(p) as f:
                self.events = [json.loads(l) for l in f if l.strip()]
        self.shot_state = {}
        for ev in self.events:
            if ev["req"].get("action") == "shot" and ev["resp"].get("ok"):
                self.shot_state[ev["req"]["name"]] = ev["resp"]["state"]

    def add(self, rule, severity, screen, posture, title, detail, box=None, run=""):
        self.findings.append({"id": len(self.findings) + 1, "rule": rule, "severity": severity, "run": run,
                              "screen": screen, "posture": posture, "title": title, "detail": detail, "box": box})

    def _size_pt(self, base, meta, posture):
        state = self.shot_state.get(base, {})
        size_pt = state.get("size_pt")
        if not size_pt:
            wf = meta.get("windowFrame") or []
            if len(wf) == 4 and wf[2] > 0:
                size_pt = (wf[2], wf[3])
            else:
                size_pt = self.cover if posture in ("folded", "refolded") else self.inner_wide
        return state, size_pt

    def _posture_from_state(self, state):
        if not state:
            return "unknown"
        if state.get("posture") == "folded":
            return "folded"
        return "unfolded" if state.get("orientation") in ("rot90", "rot270") else "unfolded-portrait"

    def collect(self):
        seen_bases = set()
        for dump in sorted(glob.glob(os.path.join(self.xchg, "dump-*.txt"))):
            base = os.path.basename(dump)[5:-4]  # <run>-<screen>__<posture>
            m = BASE_RE.match(base)
            if not m or not self.run_re.fullmatch(m.group(1)):
                continue
            run, screen, posture = m.groups()
            seen_bases.add(base)
            meta_p = os.path.join(self.xchg, f"meta-{base}.json")
            meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
            shot = os.path.join(self.shots, f"{base}.png")
            if not os.path.exists(shot):
                shot = os.path.join(self.xchg, f"xct-{base}.png")  # 對照組（hostless）沒有主機截圖，退回 XCTest 截圖
            state, size_pt = self._size_pt(base, meta, posture)
            entry = {"base": base, "run": run, "screen": screen, "posture": posture, "dump": dump, "meta": meta,
                     "shot": shot if os.path.exists(shot) else None, "state": state,
                     "W": float(size_pt[0]), "H": float(size_pt[1]), "elements": parse_dump(dump)}
            key = f"{run}-{screen}"
            self.screens.setdefault(key, {"run": run, "screen": screen, "postures": {}})["postures"][posture] = entry
        if not self.shot_only:
            return
        # 只有截圖、沒有傾印的情境（整合測試）：每張截圖自成一個畫面，姿態由主機回報的面板狀態判斷
        for shot in sorted(glob.glob(os.path.join(self.shots, "*.png"))):
            base = os.path.basename(shot)[:-4]
            if base in seen_bases:
                continue
            m = BASE_RE.match(base)
            if m:
                run, screen, posture = m.groups()
            else:
                m2 = re.match(r"^([A-Za-z0-9]+)-(.+)$", base)
                if not m2:
                    continue
                run, screen = m2.groups()
                posture = self._posture_from_state(self.shot_state.get(base))
            if not self.run_re.fullmatch(run):
                continue
            state, size_pt = self._size_pt(base, {}, posture)
            entry = {"base": base, "run": run, "screen": screen, "posture": posture, "dump": None, "meta": {},
                     "shot": shot, "state": state, "W": float(size_pt[0]), "H": float(size_pt[1]),
                     "elements": [], "shot_only": True}
            key = f"{run}-{screen}"
            self.screens.setdefault(key, {"run": run, "screen": screen, "postures": {}})["postures"][posture] = entry

    def check_posture(self, entry):
        T = self.T
        run, screen, posture = entry["run"], entry["screen"], entry["posture"]
        W, H = entry["W"], entry["H"]
        els = entry["elements"]
        if posture == "baseline" or entry.get("shot_only"):
            self._image_rules(entry, on_cover=posture in ("folded", "refolded"), apply_duo_rules=not entry.get("shot_only"))
            return
        on_cover = posture in ("folded", "refolded")
        cover_landscape = on_cover and W > H
        zone_key = "cover" if on_cover else ("inner-wide" if W > H else "inner-tall")
        if cover_landscape:
            zone_key = "inner-tall"  # 外螢幕橫向沒有量測資料，不套狀態列區域
        other_size = self.inner_wide if on_cover else self.cover

        # R7 window 沒跟著螢幕變
        wf = entry["meta"].get("windowFrame") or []
        if len(wf) == 4 and wf[2] > 0:
            if abs(wf[2] - W) > T["window_size_tolerance"] or abs(wf[3] - H) > T["window_size_tolerance"]:
                self.add("window-size", "critical", screen, posture, "app window 尺寸與目前螢幕不符",
                         f"window 為 {wf[2]:.0f}×{wf[3]:.0f}pt，但目前面板為 {W:.0f}×{H:.0f}pt；畫面不會重新排版。",
                         box=[wf[0], wf[1], wf[2], wf[3]], run=run)

        # R1 超出畫面（不在捲動容器內的元件）
        tol = T["oob_tolerance"]
        oob = []
        for el in els:
            if el["type"] not in LEAF_TYPES and el["type"] not in ("TabBar", "NavigationBar", "SegmentedControl"):
                continue
            if el["w"] is None or el["w"] <= 0 or el["h"] <= 0:
                continue
            x, y, w, h = rect(el)
            if any(a in SCROLLERS or a == "Cell" for a in el["ancestors"]):
                continue
            horiz = x < -tol or x + w > W + tol
            vert = y < -tol or y + h > H + tol
            if (horiz or vert) and inter(rect(el), (0, 0, W, H)) > 0:
                oob.append(el)
        for el in oob[:6]:
            self.add("out-of-bounds", "high", screen, posture,
                     f"{el['type']}「{(el['label'] or el['identifier'] or '')[:24]}」超出畫面",
                     f"frame=({el['x']:.0f}, {el['y']:.0f}, {el['w']:.0f}×{el['h']:.0f})，畫面 {W:.0f}×{H:.0f}pt。",
                     box=rect(el), run=run)
        if len(oob) > 6:
            self.add("out-of-bounds", "high", screen, posture, f"另有 {len(oob) - 6} 個元件超出畫面", "詳見階層傾印。", run=run)

        # R3 尺寸等於「另一個面板」的寬／高：疑似用啟動時快取的螢幕尺寸排版
        if not cover_landscape:
            ow, oh = other_size
            leaks, seen = [], set()
            for el in els:
                if el["w"] is None or el["w"] <= 0 or el["type"] in ("Window", "Application"):
                    continue
                x, y, w, h = rect(el)
                hit = []
                if abs(w - ow) <= T["cached_size_tolerance"] and abs(W - ow) > T["panel_diff_min"]:
                    hit.append(f"寬 {w:.0f}pt ≈ {'外' if not on_cover else '內'}螢幕寬 {ow:.0f}")
                if abs(h - oh) <= T["cached_size_tolerance"] and abs(H - oh) > T["panel_diff_min"]:
                    hit.append(f"高 {h:.0f}pt ≈ {'外' if not on_cover else '內'}螢幕高 {oh:.0f}")
                if hit and inter(rect(el), (0, 0, W, H)) > 0:
                    leaks.append((el, hit))
            for el, hit in leaks:
                sig = (el["type"], round(el["w"]), round(el["h"]))
                if sig in seen:
                    continue
                seen.add(sig)
                if len(seen) > 5:
                    break
                self.add("cached-screen-size", "high", screen, posture,
                         f"{el['type']}「{(el['label'] or el['identifier'] or '')[:20]}」尺寸等於另一面板",
                         "；".join(hit) + "。疑似以啟動時算好的螢幕尺寸（UIScreen.main.bounds、自訂的 screenWidth/screenHeight 常數或比例值）排版，摺疊／展開後不會重算。",
                         box=rect(el), run=run)

        # R2 與狀態列／動態島區域重疊
        for zx, zy, zw, zh in self.profile["chrome_zones"].get(zone_key, []):
            if zw == 0:
                continue
            hits = [el for el in els if el["type"] in TEXTISH | {"Image"} and el["w"] and el["w"] > 0
                    and not any(a in SCROLLERS or a == "Cell" for a in el["ancestors"])
                    and inter(rect(el), (zx, zy, zw, zh)) > T["chrome_overlap_ratio"] * min(el["w"] * el["h"], zw * zh)]
            for el in hits[:3]:
                self.add("chrome-overlap", "medium", screen, posture,
                         f"{el['type']}「{(el['label'] or el['identifier'] or '')[:20]}」與狀態列／動態島區域重疊",
                         "請目視確認是否被系統 UI 遮住或可點區域被擋。", box=rect(el), run=run)

        # R11 直立 Tab 列蓋住內容
        tabbars = [el for el in els if el["type"] == "TabBar" and el["w"] and el["w"] > 0]
        for tb in tabbars[:1]:
            tbr = rect(tb)
            covered = []
            for el in els:
                if el["type"] not in TEXTISH | {"Image"} or not el["w"] or el["w"] <= 0 or el["h"] <= 0:
                    continue
                if "TabBar" in el["ancestors"] or tb["idx"] in self._ancestor_chain(els, el):
                    continue
                if any(a in SCROLLERS or a == "Cell" for a in el["ancestors"]):
                    continue
                if inter(rect(el), tbr) > T["tabbar_cover_ratio"] * (el["w"] * el["h"]) and visible(el, W, H):
                    covered.append(el)
            if tb["h"] > tb["w"] * 1.5:
                self.add("tabbar-side-rail", "info", screen, posture,
                         f"Tab 列以直立列呈現在側邊（{tb['w']:.0f}×{tb['h']:.0f}pt）",
                         "iPhone Duo 上系統把 UITabBar 改畫成側邊直立列、只剩圖示沒有文字（系統行為）；請確認圖示本身能辨識。",
                         box=tbr, run=run)
            for el in covered[:4]:
                self.add("tabbar-covers-content", "high", screen, posture,
                         f"{el['type']}「{(el['label'] or el['identifier'] or '')[:20]}」被 Tab 列蓋住",
                         f"元件 frame=({el['x']:.0f}, {el['y']:.0f}, {el['w']:.0f}×{el['h']:.0f}) 與 Tab 列 ({tbr[0]:.0f}, {tbr[1]:.0f}, {tbr[2]:.0f}×{tbr[3]:.0f}) 重疊超過 {int(T['tabbar_cover_ratio']*100)}%。",
                         box=rect(el), run=run)
            if len(covered) > 4:
                self.add("tabbar-covers-content", "high", screen, posture, f"另有 {len(covered) - 4} 個元件被 Tab 列蓋住", "詳見階層傾印。", run=run)

        # R5 文字／按鈕互相重疊
        leaves = [] if cover_landscape else [
            el for el in els if el["type"] in TEXTISH and visible(el, W, H) and el["w"] > 2 and el["h"] > 2
            and not any(a == "TabBar" or a in SCROLLERS or a == "Cell" for a in el["ancestors"])]
        pairs = []
        for i in range(len(leaves)):
            a = leaves[i]
            for j in range(i + 1, len(leaves)):
                b = leaves[j]
                if a["idx"] in self._ancestor_chain(els, b) or b["idx"] in self._ancestor_chain(els, a):
                    continue
                if a["label"] and a["label"] == b["label"]:
                    continue
                ia = inter(rect(a), rect(b))
                if ia <= 0:
                    continue
                sa, sb = a["w"] * a["h"], b["w"] * b["h"]
                contain = ia >= T["contain_ratio"] * min(sa, sb)
                iou = ia / (sa + sb - ia)
                if not contain and iou > T["overlap_iou"]:
                    pairs.append((iou, a, b))
        pairs.sort(key=lambda t: -t[0])
        for iou, a, b in pairs[:4]:
            x1, y1 = min(a["x"], b["x"]), min(a["y"], b["y"])
            x2, y2 = max(a["x"] + a["w"], b["x"] + b["w"]), max(a["y"] + a["h"], b["y"] + b["h"])
            self.add("overlap", "low", screen, posture,
                     f"「{(a['label'] or a['type'])[:14]}」與「{(b['label'] or b['type'])[:14]}」互相重疊",
                     f"IoU={iou:.2f}；請目視確認是否為刻意疊放。", box=[x1, y1, x2 - x1, y2 - y1], run=run)

        self._image_rules(entry, on_cover=on_cover, apply_duo_rules=True)

    def _image_rules(self, entry, on_cover, apply_duo_rules):
        """R8 全黑、R9 留白。對照組／只有截圖的情境也會跑 R8。"""
        if not entry["shot"] or not os.path.exists(entry["shot"]):
            return
        T = self.T
        try:
            m = image_metrics(load_rgba(entry["shot"]))
            entry["image"] = m
        except Exception as e:  # noqa: BLE001
            entry["image"] = {"error": str(e)}
            return
        run, screen, posture, W, H = entry["run"], entry["screen"], entry["posture"], entry["W"], entry["H"]
        if m["dark_ratio"] > T["black_ratio"]:
            self.add("black-screen", "critical", screen, posture, "截圖幾乎全黑",
                     f"{m['dark_ratio']*100:.1f}% 像素為黑；面板切換後 app 可能沒有重繪。", run=run)
        elif apply_duo_rules and not on_cover and posture != "baseline":
            side = m["left_margin"] + m["right_margin"]
            if side >= T["blank_margin_ratio"]:
                self.add("blank-margin", "low", screen, posture,
                         f"展開後左右留白約 {side*100:.0f}%（左 {m['left_margin']*100:.0f}% / 右 {m['right_margin']*100:.0f}%）",
                         "內容沒有利用大螢幕寬度，看起來像把手機版面放在中間。",
                         box=[0, 0, W * m["left_margin"], H] if m["left_margin"] > 0.1 else None, run=run)

    @staticmethod
    def _ancestor_chain(els, el):
        chain = set()
        p = el["parent"]
        while p is not None:
            chain.add(p)
            p = els[p]["parent"]
        return chain

    def check_pairs(self, group):
        T = self.T
        p = group["postures"]
        screen, run = group["screen"], group["run"]
        if any(e.get("shot_only") for e in p.values()):
            return

        # R12 內容不存在：以「展開直向」為基準，其他姿態的元件數若不到 30%，代表內容沒有進到畫面階層
        ref = p.get("unfolded-portrait")
        if ref and len(ref["elements"]) >= T["content_missing_min"]:
            for posture in ("folded", "unfolded", "refolded"):
                e = p.get(posture)
                if not e:
                    continue
                n, m = len(e["elements"]), len(ref["elements"])
                if n < T["content_missing_ratio"] * m and n < T["content_missing_min"]:
                    hp = T["header_pt"]
                    self.add("content-missing", "critical", screen, posture,
                             f"頁面內容不在畫面階層（與展開直向相比元件數不到 {int(T['content_missing_ratio']*100)}%）",
                             f"此姿態只有 {n} 個元件，展開直向有 {m} 個；清單、篩選列等內容整個沒有被加進畫面，不是被排到畫面外或縮成 0 尺寸。",
                             box=[0, hp, e["W"], e["H"] - hp], run=run)

        # R6 摺回後是否還原
        if "folded" in p and "refolded" in p and abs(p["folded"]["W"] - p["refolded"]["W"]) > 4:
            b = p["refolded"]
            self.add("cover-landscape", "info", screen, "refolded",
                     f"摺回時落在外螢幕橫向（{b['W']:.0f}×{b['H']:.0f}pt）",
                     "從內螢幕直向摺回時，外螢幕偶爾先以橫向顯示（系統行為）。橫向時系統隱藏狀態列、直欄依轉向方向可能在左側；"
                     "App 若只允許單一橫向（landscapeLeft）直欄會固定在右側。此姿態不套其他版面規則。", run=run)
        elif "folded" in p and "refolded" in p:
            a, b = p["folded"], p["refolded"]
            moved, matched = 0, 0
            tol = T["restore_tolerance"]
            for ea, eb in self._match(a["elements"], b["elements"]):
                matched += 1
                if abs(ea["x"] - eb["x"]) > tol or abs(ea["y"] - eb["y"]) > tol or abs(ea["w"] - eb["w"]) > tol or abs(ea["h"] - eb["h"]) > tol:
                    moved += 1
            diff = None
            if a["shot"] and b["shot"]:
                r = subprocess.run([IMGTOOL, "diff", a["shot"], b["shot"]], capture_output=True, text=True)
                diff = float(r.stdout.strip() or -1)
            group["restore"] = {"matched": matched, "moved": moved, "pixel_diff": diff}
            if matched >= T["restore_min_matched"] and moved / matched > T["restore_moved_ratio"]:
                self.add("restore-mismatch", "high", screen, "refolded",
                         f"摺回後 {moved}/{matched} 個元件位置或尺寸與原本不同",
                         f"截圖相異像素 {diff*100:.1f}%。" if diff is not None and diff >= 0 else "", run=run)

        # R4 展開後 TabBar 寬度沒變（整個版面只是「同一個手機版面」）
        if "folded" in p and "unfolded" in p:
            a, b = p["folded"], p["unfolded"]
            tb_a = a["meta"].get("tabBarFrame") or []
            tb_b = b["meta"].get("tabBarFrame") or []
            if len(tb_a) == 4 and len(tb_b) == 4 and tb_b[2] > 0 and abs(tb_a[2] - tb_b[2]) < 4 and abs(b["W"] - a["W"]) > T["panel_diff_min"]:
                self.add("tabbar-not-stretched", "high", screen, "unfolded", "展開後 TabBar 寬度沒有變",
                         f"摺疊 {tb_a[2]:.0f}pt → 展開 {tb_b[2]:.0f}pt，螢幕寬 {b['W']:.0f}pt。", box=tb_b, run=run)

    @staticmethod
    def _match(ea, eb):
        def key(e):
            return (e["type"], e["label"], e["identifier"])
        index = {}
        for e in eb:
            if e["w"] and e["w"] > 0 and e["type"] in LEAF_TYPES | {"TabBar", "NavigationBar"}:
                index.setdefault(key(e), []).append(e)
        for e in ea:
            if not (e["w"] and e["w"] > 0 and e["type"] in LEAF_TYPES | {"TabBar", "NavigationBar"}):
                continue
            lst = index.get(key(e))
            if lst:
                yield e, lst.pop(0)

    # ------------------------------------------------------------------ 輸出
    def annotate(self):
        out_dir = os.path.join(self.run, "annotated")
        os.makedirs(out_dir, exist_ok=True)
        by_base = {}
        for f in self.findings:
            if f.get("box"):
                by_base.setdefault((f["run"], f["screen"], f["posture"]), []).append(f)
            for inst in f.get("instances", []):
                if inst.get("box"):
                    by_base.setdefault((f["run"], inst["screen"], inst["posture"]), []).append(
                        {"id": f["id"], "title": f["title"], "severity": f["severity"], "box": inst["box"]})
        for group in self.screens.values():
            for posture, entry in group["postures"].items():
                if not entry["shot"]:
                    continue
                boxes = [{"x": f["box"][0], "y": f["box"][1], "w": f["box"][2], "h": f["box"][3], "badge": str(f["id"]),
                          "color": SEVERITY_COLOR[f["severity"]], "text": f"#{f['id']} {f['title']}"}
                         for f in by_base.get((entry["run"], entry["screen"], posture), [])]
                header = f"{entry['run']} ｜ {entry['screen']} ｜ {POSTURE_LABEL.get(posture, posture)} ｜ {entry['W']:.0f}×{entry['H']:.0f}pt"
                spec = {"scale": self.profile["scale"], "maxWidth": 1500, "header": header, "boxes": boxes}
                spec_p = os.path.join(out_dir, entry["base"] + ".json")
                json.dump(spec, open(spec_p, "w"), ensure_ascii=False)
                out_p = os.path.join(out_dir, entry["base"] + ".png")
                subprocess.run([IMGTOOL, "annotate", entry["shot"], out_p, spec_p], check=False)
                entry["annotated"] = out_p if os.path.exists(out_p) else None

    def dedupe(self):
        seen, kept = {}, []
        for f in self.findings:
            key = (f["run"], f["rule"], f["title"])
            if key in seen:
                seen[key].setdefault("also", []).append(f"{f['screen']}／{POSTURE_LABEL.get(f['posture'], f['posture'])}")
                seen[key].setdefault("instances", []).append({"screen": f["screen"], "posture": f["posture"], "box": f.get("box")})
                continue
            seen[key] = f
            kept.append(f)
        for f in kept:
            if f.get("also"):
                f["detail"] += f" 另見 {len(f['also'])} 處：" + "、".join(f["also"][:6]) + ("…" if len(f["also"]) > 6 else "")
        self.findings = kept
        for i, f in enumerate(self.findings, 1):
            f["id"] = i

    def write(self):
        out = os.path.join(self.run, "analysis")
        os.makedirs(out, exist_ok=True)
        self.findings.sort(key=lambda f: (SEVERITY_ORDER[f["severity"]], f["run"], f["screen"], f["posture"]))
        json.dump(self.findings, open(os.path.join(out, "findings.json"), "w"), ensure_ascii=False, indent=1)
        slim = {}
        for key, g in self.screens.items():
            slim[key] = {"run": g["run"], "screen": g["screen"], "restore": g.get("restore"),
                         "postures": {p: {k: v for k, v in e.items() if k != "elements"} | {"element_count": len(e["elements"])}
                                      for p, e in g["postures"].items()}}
        json.dump(slim, open(os.path.join(out, "screens.json"), "w"), ensure_ascii=False, indent=1)
        notes = []
        for np_ in glob.glob(os.path.join(self.xchg, "*notes.json")):
            notes += json.load(open(np_))
        json.dump(notes, open(os.path.join(out, "notes.json"), "w"), ensure_ascii=False, indent=1)
        return out


def load_profile(path):
    profile = json.loads(json.dumps(DEFAULT_PROFILE))
    if path:
        override = json.load(open(path))
        for k, v in override.items():
            if isinstance(v, dict) and isinstance(profile.get(k), dict):
                profile[k].update(v)
            else:
                profile[k] = v
    return profile


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("run", help="run_qc.py 的輸出目錄")
    ap.add_argument("--device-profile", default=None, help="覆蓋裝置設定（面板尺寸、狀態列區域、門檻）的 JSON")
    ap.add_argument("--runs", default=r"[A-Za-z0-9]+", help="只分析情境前綴符合此正規式的截圖（預設全部）")
    ap.add_argument("--no-shot-only", action="store_true", help="略過沒有階層傾印、只有截圖的畫面")
    args = ap.parse_args()
    if not os.path.exists(IMGTOOL):
        sys.exit(f"imgtool not built: run `swiftc -O -o {IMGTOOL} {IMGTOOL}.swift`")
    az = Analyzer(os.path.abspath(args.run), load_profile(args.device_profile), args.runs, shot_only=not args.no_shot_only)
    az.collect()
    for group in az.screens.values():
        for entry in group["postures"].values():
            az.check_posture(entry)
        az.check_pairs(group)
    az.findings.sort(key=lambda f: (SEVERITY_ORDER[f["severity"]], f["run"], f["screen"], f["posture"]))
    az.dedupe()
    az.annotate()
    out = az.write()
    counts = {}
    for f in az.findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1
    print(f"screens={len(az.screens)} findings={len(az.findings)} {counts} -> {out}")


if __name__ == "__main__":
    main()
