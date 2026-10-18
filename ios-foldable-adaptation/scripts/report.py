#!/usr/bin/env python3
"""把 analyze.py 的結果 + 人工目視評註組成單一 HTML 報告（圖片以 JPEG data URI 內嵌）。

用法：report.py <run 目錄> --out report.html [--commentary commentary.json] [--context context.json]
               [--img-width 640] [--full-dir <目錄>] [--full-width 1500]

commentary.json（人工評註）：
  [{"id": 3, "run": "A", "screen": "01-…", "posture": "unfolded", "severity": "high",
    "title": "…", "detail": "…", "box": [x, y, w, h] | null, "status": "fixed"?, "hidden": true?}]
context.json（報告文案；所有欄位都可省略，標 html 的欄位會原樣插入）：
  {"title": "", "eyebrow": "", "subtitle": "", "meta": {"k": "v"},
   "runs": {"A": {"label": "情境 A：摺疊狀態啟動", "intro": "html"}, ...},   # 也決定情境的排列順序
   "method": ["html"], "delta_title": "", "delta": ["html"],
   "changes": {"title": "", "intro": "html", "items": ["html"], "verification": [["項目", "結果", "html"]], "tradeoffs": ["html"]},
   "hig_source": "Apple HIG「Designing for iPhone Duo」（2026-09-09）",
   "hig": [{"guideline": "", "source": "", "status": "符合|部分|不符合|待確認", "evidence": "html"}],
   "hide_rules": [{"rule": "restore-mismatch", "run"?: "A", "screen"?: "…", "id"?: 1}],
   "rule_ids": {"restore-mismatch": 1}, "extra_removed": [1], "removed_note": "",
   "repros": [{"anchor": "", "title": "", "intro": "html", "steps_text": ["html"],
               "steps": [{"img": "/abs/path.png", "slug": "RB-1", "caption": "", "bad": true|false|null}]}],
   "root_causes": [{"title": "", "detail": "", "refs": ["path:line"]}], "limits": ["html"], "next": ["html"]}
"""
import argparse
import base64
import html
import json
import os
import re
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SEV_LABEL = {"critical": "嚴重", "high": "高", "medium": "中", "low": "低", "info": "資訊"}
SEV_ORDER = ["critical", "high", "medium", "low", "info"]
POSTURES = ["folded", "unfolded", "unfolded-portrait", "refolded", "baseline", "unknown"]
POSTURE_LABEL = {"folded": "摺疊・外螢幕", "unfolded": "展開・內螢幕 寬版", "unfolded-portrait": "展開・內螢幕 直向",
                 "refolded": "摺回・外螢幕", "baseline": "對照組・一般 iPhone", "unknown": "（姿態未知）"}
COLORS = {"critical": "#FF2D55", "high": "#FF3B30", "medium": "#FF9500", "low": "#FFCC00", "info": "#5AC8FA"}


def esc(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def jpeg_data_uri(png_path, max_w=640, quality=60):
    if not png_path or not os.path.exists(png_path):
        return None
    fd, tmp = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(quality), "-Z", str(max_w), png_path, "--out", tmp],
                   capture_output=True, check=False)
    if not os.path.exists(tmp) or os.path.getsize(tmp) == 0:
        return None
    data = base64.b64encode(open(tmp, "rb").read()).decode()
    os.remove(tmp)
    return "data:image/jpeg;base64," + data


def slugify(run, screen, posture):
    s = re.sub(r"[^A-Za-z0-9一-鿿]+", "-", screen).strip("-")[:32] or "screen"
    return f"{run}-{s}-{posture}"


def export_full(png_path, out_dir, slug, max_w=1500, quality=70):
    if not png_path or not os.path.exists(png_path):
        return None
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, slug + ".jpg")
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(quality), "-Z", str(max_w), png_path, "--out", out],
                   capture_output=True, check=False)
    return out if os.path.exists(out) else None


def run_label(ctx, run_key):
    return (ctx.get("runs", {}).get(run_key) or {}).get("label") or f"情境 {run_key}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("run")
    ap.add_argument("--out", required=True)
    ap.add_argument("--commentary", default=None)
    ap.add_argument("--context", default=None)
    ap.add_argument("--img-width", type=int, default=640)
    ap.add_argument("--full-dir", default=None, help="大圖輸出目錄（頁面以相對路徑 img/<slug>.jpg 引用，隨頁面一起發布）")
    ap.add_argument("--full-width", type=int, default=1500)
    args = ap.parse_args()

    run = os.path.abspath(args.run)
    findings = json.load(open(os.path.join(run, "analysis", "findings.json")))
    screens = json.load(open(os.path.join(run, "analysis", "screens.json")))
    notes_p = os.path.join(run, "analysis", "notes.json")
    notes = json.load(open(notes_p)) if os.path.exists(notes_p) else []
    ctx = json.load(open(args.context)) if args.context else {}
    commentary = json.load(open(args.commentary)) if args.commentary else []

    # ---- 編號：人工評註用固定 id；規則判定可在 context.rule_ids 釘選 id，其餘接在最大 id 之後 ----
    removed = []
    for h in ctx.get("hide_rules", []):
        for f in list(findings):
            if f["rule"] == h["rule"] and f.get("run") == h.get("run", f.get("run")) and f.get("screen") == h.get("screen", f.get("screen")):
                if h.get("id"):
                    removed.append(h["id"])
                findings.remove(f)
    pinned = ctx.get("rule_ids", {})
    fixed_ids = [c["id"] for c in commentary if c.get("id")] + list(pinned.values())
    next_id = max(fixed_ids + [0]) + 1
    for f in findings:
        if f["rule"] in pinned:
            f["id"] = pinned[f["rule"]]
        else:
            f["id"] = next_id
            next_id += 1
    for c in commentary:
        c = dict(c)
        if not c.get("id"):
            c["id"] = next_id
            next_id += 1
        if c.get("hidden"):
            removed.append(c["id"])  # 已與團隊確認不是問題：保留編號但不列出、不畫框
            continue
        c["rule"] = c.get("rule", "manual-review")
        c["manual"] = True
        findings.append(c)
    findings.sort(key=lambda f: (1 if f.get("status") == "fixed" else 0, SEV_ORDER.index(f["severity"]), f["id"]))

    # ---- 標註圖：依最終編號重畫（規則判定與人工評註一起），已修正的項目不畫框 ----
    imgtool = os.path.join(HERE, "imgtool")
    boxes_by_key = {}
    for f in findings:
        if f.get("status") == "fixed":
            continue
        color = "#AF52DE" if f.get("manual") else COLORS[f["severity"]]
        targets = [(f.get("run"), f.get("screen"), f.get("posture"), f.get("box"))]
        targets += [(f.get("run"), i.get("screen"), i.get("posture"), i.get("box")) for i in f.get("instances", [])]
        for run_key, screen, posture, box in targets:
            if not box:
                continue
            x, y, w, h = box
            boxes_by_key.setdefault((run_key, screen, posture), []).append(
                {"x": x, "y": y, "w": w, "h": h, "badge": str(f["id"]), "color": color, "text": f"#{f['id']} {f['title']}"})
    os.makedirs(os.path.join(run, "annotated"), exist_ok=True)
    scale = ctx.get("scale", 3)
    for g in screens.values():
        for posture, e in g["postures"].items():
            if not e.get("shot"):
                continue
            header = f"{g['run']} ｜ {g['screen']} ｜ {POSTURE_LABEL.get(posture, posture)} ｜ {e.get('W', 0):.0f}×{e.get('H', 0):.0f}pt"
            spec = {"scale": scale, "maxWidth": 1500, "header": header, "boxes": boxes_by_key.get((g["run"], g["screen"], posture), [])}
            spec_p = os.path.join(run, "annotated", e["base"] + ".final.json")
            json.dump(spec, open(spec_p, "w"), ensure_ascii=False)
            out_p = os.path.join(run, "annotated", e["base"] + ".final.png")
            if os.path.exists(imgtool):
                subprocess.run([imgtool, "annotate", e["shot"], out_p, spec_p], check=False)
            if os.path.exists(out_p):
                e["annotated"] = out_p

    counts = {s: sum(1 for f in findings if f["severity"] == s) for s in SEV_ORDER}
    n_screens = len(screens)
    n_shots = sum(1 for g in screens.values() for e in g["postures"].values() if e.get("shot"))
    run_keys = list(ctx.get("runs", {}).keys())
    for g in screens.values():
        if g["run"] not in run_keys:
            run_keys.append(g["run"])

    # ------------------------------------------------------------------ HTML
    title = ctx.get("title", "iPhone Duo UI QC")
    parts = [f"""<title>{esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* 版面：單欄閱讀 + 每頁一列數張截圖（手機寬度自動換行），像把摺疊機的兩塊面板攤開並排 */
:root{{
  --bg:#f6f5fb; --surface:#ffffff; --surface-2:#eeebf8; --fg:#1d1a2e; --muted:#5e5a73; --line:#d9d4ea;
  --accent:#5b3fc4; --accent-fg:#ffffff; --gold:#b8860b;
  --sev-critical:#d61f69; --sev-high:#d9480f; --sev-medium:#c27c0e; --sev-low:#8a7a00; --sev-info:#2a6fb0; --manual:#7b3fcf; --ok:#1f8a4c;
  --font-body:"Noto Sans TC",-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;
  --font-mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}}
@media (prefers-color-scheme: dark){{ :root:not([data-theme="light"]){{
  --bg:#141221; --surface:#1d1a2e; --surface-2:#262238; --fg:#ece9f7; --muted:#a39fb8; --line:#3a3552;
  --accent:#a48bff; --accent-fg:#141221; --gold:#e3b341;
  --sev-critical:#ff5c9a; --sev-high:#ff8a5c; --sev-medium:#f0b24a; --sev-low:#d9c84a; --sev-info:#6fb3ff; --manual:#c8a6ff; --ok:#3fbf73; color-scheme:dark }} }}
:root[data-theme="dark"]{{
  --bg:#141221; --surface:#1d1a2e; --surface-2:#262238; --fg:#ece9f7; --muted:#a39fb8; --line:#3a3552;
  --accent:#a48bff; --accent-fg:#141221; --gold:#e3b341;
  --sev-critical:#ff5c9a; --sev-high:#ff8a5c; --sev-medium:#f0b24a; --sev-low:#d9c84a; --sev-info:#6fb3ff; --manual:#c8a6ff; --ok:#3fbf73; color-scheme:dark }}
*{{box-sizing:border-box}}
body{{background:var(--bg);color:var(--fg);font-family:var(--font-body);font-size:15px;line-height:1.65;margin:0}}
.wrap{{max-width:1180px;margin:0 auto;padding-block:28px 64px;padding-inline:16px}}
h1,h2,h3{{text-wrap:balance;line-height:1.25;margin:0}}
h1{{font-size:clamp(26px,4vw,36px);font-weight:700;letter-spacing:-.01em}}
h2{{font-size:20px;font-weight:700;margin-top:48px;padding-top:12px;border-top:2px solid var(--accent)}}
h3{{font-size:16px;font-weight:700}}
p{{margin:0}}
.sub{{color:var(--muted);margin-top:8px;max-width:70ch}}
.eyebrow{{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);font-weight:700}}
.meta{{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:16px;font-family:var(--font-mono);font-size:12.5px;color:var(--muted)}}
.meta b{{color:var(--fg);font-weight:500}}
.tiles{{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:22px}}
.tile{{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px 14px}}
.tile .n{{font-family:var(--font-mono);font-size:28px;font-weight:500;line-height:1.1;font-variant-numeric:tabular-nums}}
.tile .l{{font-size:12.5px;color:var(--muted);margin-top:4px}}
.tile.sev-critical .n{{color:var(--sev-critical)}} .tile.sev-high .n{{color:var(--sev-high)}} .tile.sev-medium .n{{color:var(--sev-medium)}} .tile.sev-low .n{{color:var(--sev-low)}}
ul,ol{{margin:10px 0 0;padding-left:1.2em}} li{{margin:4px 0}}
code,.mono{{font-family:var(--font-mono);font-size:.92em}}
code{{background:var(--surface-2);padding:1px 5px;border-radius:4px}}
.findings{{display:flex;flex-direction:column;gap:8px;margin-top:14px}}
.f{{display:grid;grid-template-columns:44px 1fr;gap:12px;background:var(--surface);border:1px solid var(--line);border-left:5px solid var(--line);border-radius:8px;padding:10px 12px;min-width:0}}
.f.sev-critical{{border-left-color:var(--sev-critical)}} .f.sev-high{{border-left-color:var(--sev-high)}} .f.sev-medium{{border-left-color:var(--sev-medium)}} .f.sev-low{{border-left-color:var(--sev-low)}} .f.sev-info{{border-left-color:var(--sev-info)}}
.f .id{{font-family:var(--font-mono);font-weight:500;color:var(--muted);font-variant-numeric:tabular-nums;padding-top:2px}}
.f .t{{font-weight:700}}
.f .d{{color:var(--muted);font-size:14px;margin-top:2px}}
.f .where{{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}}
.chip{{display:inline-block;font-size:12px;line-height:1;padding:5px 8px;border-radius:999px;background:var(--surface-2);color:var(--fg);text-decoration:none}}
.chip.sev{{color:#fff;font-weight:700}}
.chip.sev-critical{{background:var(--sev-critical)}} .chip.sev-high{{background:var(--sev-high)}} .chip.sev-medium{{background:var(--sev-medium)}} .chip.sev-low{{background:var(--sev-low);color:#1d1a2e}} .chip.sev-info{{background:var(--sev-info)}}
.chip.manual{{background:var(--manual);color:#fff}}
.chip.fixed{{background:var(--ok);color:#fff;font-weight:700}}
.f.fixed{{opacity:.78;border-left-color:var(--ok)}}
.f.fixed .t{{text-decoration:line-through;text-decoration-thickness:1px}}
.screen{{margin-top:26px;scroll-margin-top:16px}}
.screen header{{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 14px}}
.screen header .ids{{font-family:var(--font-mono);font-size:12.5px;color:var(--muted)}}
.shots{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:10px}}
.shot{{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px;min-width:0}}
.shot img{{display:block;width:100%;height:auto;border-radius:6px;background:#000;cursor:zoom-in}}
.shot .cap{{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted);margin-top:6px;font-family:var(--font-mono)}}
.shot .cap b{{color:var(--fg);font-weight:500;font-family:var(--font-body)}}
.shot .fl{{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}}
.shot .fl span{{font-family:var(--font-mono);font-size:12px;padding:3px 8px;border-radius:4px;color:#fff;cursor:pointer;border:1px solid transparent}}
.shot .fl span:hover,.shot .fl span:focus-visible{{outline:2px solid var(--accent);outline-offset:1px}}
#lb{{position:fixed;inset:0;background:rgba(10,8,20,.92);display:none;align-items:center;justify-content:center;z-index:50;padding:16px}}
#lb.on{{display:flex}}
#lb img{{max-width:96vw;max-height:94vh;width:auto;height:auto;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:zoom-out}}
#lb .cap{{position:fixed;left:16px;right:16px;bottom:12px;color:#fff;font-size:13px;text-align:center;font-family:var(--font-mono);opacity:.85}}
#pop{{position:fixed;inset:0;background:rgba(10,8,20,.6);display:none;align-items:center;justify-content:center;z-index:60;padding:16px}}
#pop.on{{display:flex}}
#pop .card{{background:var(--surface);color:var(--fg);border:1px solid var(--line);border-left:6px solid var(--line);border-radius:12px;max-width:620px;width:100%;padding:18px 20px;box-shadow:0 12px 48px rgba(0,0,0,.45);max-height:88vh;overflow:auto}}
#pop .card.sev-critical{{border-left-color:var(--sev-critical)}} #pop .card.sev-high{{border-left-color:var(--sev-high)}} #pop .card.sev-medium{{border-left-color:var(--sev-medium)}} #pop .card.sev-low{{border-left-color:var(--sev-low)}} #pop .card.sev-info{{border-left-color:var(--sev-info)}}
#pop .card h3{{margin:0 0 6px;font-size:17px}}
#pop .card .d{{color:var(--fg);font-size:14.5px;line-height:1.7;white-space:pre-wrap}}
#pop .card .where{{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}}
#pop .card .close{{float:right;background:var(--surface-2);border:0;color:var(--fg);font:inherit;padding:4px 10px;border-radius:6px;cursor:pointer}}
.hint{{color:var(--muted);font-size:13px;margin-top:6px}}
.rc{{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-top:12px}}
.rc .refs{{margin-top:8px;display:flex;flex-direction:column;gap:3px}}
.rc .refs code{{font-size:12.5px}}
.note{{border-left:3px solid var(--gold);padding-left:12px;color:var(--muted);margin-top:12px}}
table{{border-collapse:collapse;width:100%;margin-top:12px;font-size:14px}}
th,td{{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{font-size:12px;letter-spacing:.04em;color:var(--muted);font-weight:700}}
td.n{{font-family:var(--font-mono);font-variant-numeric:tabular-nums}}
.tbl{{overflow-x:auto}}
a{{color:var(--accent)}}
a:focus-visible,.chip:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
@media (prefers-reduced-motion:no-preference){{ html{{scroll-behavior:smooth}} }}
</style>
<div class="wrap">
<div class="eyebrow">{esc(ctx.get("eyebrow", "iPhone Duo 摺疊 / 展開 UI QC"))}</div>
<h1>{esc(title)}</h1>
<p class="sub">{esc(ctx.get("subtitle", ""))}</p>
<div class="meta">{''.join(f'<span><b>{esc(k)}</b> {esc(v)}</span>' for k, v in ctx.get("meta", {}).items())}</div>
<div class="tiles">
  <div class="tile"><div class="n">{n_screens}</div><div class="l">走訪畫面</div></div>
  <div class="tile"><div class="n">{n_shots}</div><div class="l">截圖（姿態 × 畫面）</div></div>
  <div class="tile sev-critical"><div class="n">{counts['critical']}</div><div class="l">嚴重</div></div>
  <div class="tile sev-high"><div class="n">{counts['high']}</div><div class="l">高</div></div>
  <div class="tile sev-medium"><div class="n">{counts['medium']}</div><div class="l">中</div></div>
  <div class="tile sev-low"><div class="n">{counts['low'] + counts['info']}</div><div class="l">低 / 資訊</div></div>
</div>
"""]

    if ctx.get("method"):
        parts.append("<h2>怎麼測的</h2><ul>" + "".join(f"<li>{m}</li>" for m in ctx["method"]) + "</ul>")
    if ctx.get("delta"):
        parts.append(f"<h2>{esc(ctx.get('delta_title', '與上次 QC 的差異'))}</h2><ul>" + "".join(f"<li>{d}</li>" for d in ctx["delta"]) + "</ul>")

    ch = ctx.get("changes")
    if ch:
        parts.append(f"<h2 id='changes'>{esc(ch.get('title', '本次修改'))}</h2><p class='sub'>{ch.get('intro', '')}</p>")
        if ch.get("items"):
            parts.append("<ul>" + "".join(f"<li>{t}</li>" for t in ch["items"]) + "</ul>")
        if ch.get("verification"):
            parts.append("<div class='tbl'><table><tr><th>驗證項目</th><th style='width:16%'>結果</th><th>說明</th></tr>")
            for row in ch["verification"]:
                parts.append(f"<tr><td>{esc(row[0])}</td><td><b>{esc(row[1])}</b></td><td>{row[2]}</td></tr>")
            parts.append("</table></div>")
        if ch.get("tradeoffs"):
            parts.append("<p class='note'>" + "<br>".join(ch["tradeoffs"]) + "</p>")

    if ctx.get("hig"):
        src = esc(ctx.get("hig_source", "Apple Human Interface Guidelines「Designing for iPhone Duo」"))
        parts.append("<h2>Apple HIG「Designing for iPhone Duo」對照</h2>"
                     f"<p class='sub'>依 {src} 逐條對照本次截圖看到的現況。狀態：符合／部分／不符合／待確認。</p>"
                     "<div class='tbl'><table><tr><th style='width:34%'>指南要點</th><th style='width:8%'>現況</th><th>本次看到的證據與建議</th></tr>")
        chip = {"符合": "sev-info", "部分": "sev-medium", "不符合": "sev-high", "待確認": ""}
        for h in ctx["hig"]:
            st = h.get("status", "待確認")
            parts.append(f"<tr><td><b>{esc(h['guideline'])}</b><div class='d' style='color:var(--muted);font-size:13px'>{esc(h.get('source', ''))}</div></td>"
                         f"<td><span class='chip sev {chip.get(st, '')}'>{esc(st)}</span></td><td>{h.get('evidence', '')}</td></tr>")
        parts.append("</table></div>")

    removed = removed + [i for i in ctx.get("extra_removed", []) if i not in removed]
    removed_note = ""
    if removed:
        removed_note = ("<p class='hint'>編號 " + "、".join(f"#{i}" for i in sorted(set(removed))) + " "
                        + ctx.get("removed_note", "已與團隊確認不需處理（不是問題，或與其他項目重複），已移除；其餘編號維持不變。") + "</p>")
    parts.append("<h2>問題清單（依嚴重度）</h2><p class='sub'>編號與截圖上的圓形標記一致。紫色標記為人工目視評註，其餘由規則自動判定。</p>" + removed_note + "<div class='findings'>")
    for f in findings:
        sev = f["severity"]
        anchor = f"s-{f.get('run', '')}-{f.get('screen', '')}"
        manual = "<span class='chip manual'>人工目視</span>" if f.get("manual") else f"<span class='chip'>{esc(f.get('rule', ''))}</span>"
        if f.get("status") == "fixed":
            manual = "<span class='chip fixed'>已修正</span>" + manual
        fixed_cls = " fixed" if f.get("status") == "fixed" else ""
        parts.append(f"""<div class="f sev-{sev}{fixed_cls}" id="f-{f['id']}"><div class="id">#{f['id']}</div><div>
  <div class="t">{esc(f['title'])}</div><div class="d">{esc(f.get('detail', ''))}</div>
  <div class="where"><span class="chip sev sev-{sev}">{SEV_LABEL[sev]}</span><a class="chip" href="#{esc(anchor)}">{esc(run_label(ctx, f.get('run', '')))[:6]} ・ {esc(f.get('screen', ''))}</a><span class="chip">{esc(POSTURE_LABEL.get(f.get('posture'), f.get('posture', '')))}</span>{manual}</div>
</div></div>""")
    parts.append("</div>")

    full_files = []
    for rp in (ctx.get("repros") or ([ctx["repro"]] if ctx.get("repro") else [])):
        parts.append(f"<h2 id='{esc(rp.get('anchor', 'repro'))}'>{esc(rp['title'])}</h2><p class='sub'>{rp.get('intro', '')}</p>")
        if rp.get("steps_text"):
            parts.append("<ol>" + "".join(f"<li>{t}</li>" for t in rp["steps_text"]) + "</ol>")
        parts.append("<div class='shots'>")
        for st in rp["steps"]:
            img = jpeg_data_uri(st["img"], max_w=args.img_width)
            full_attr = ""
            if args.full_dir:
                fp = export_full(st["img"], os.path.join(args.full_dir, "img"), st["slug"], max_w=args.full_width)
                if fp:
                    full_files.append(os.path.join("img", st["slug"] + ".jpg"))
                    full_attr = f" data-full='img/{st['slug']}.jpg'"
            bad = st.get("bad")
            tag = "<span style='background:var(--sev-critical)'>錯誤</span>" if bad else ("<span style='background:var(--sev-info)'>正確</span>" if bad is False else "")
            parts.append(f"<figure class='shot' style='margin:0'><img src='{img}'{full_attr} data-cap='{esc(st['caption'])}' alt='{esc(st['caption'])}' loading='lazy'>"
                         f"<figcaption class='cap'><b>{esc(st['caption'])}</b></figcaption><div class='fl'>{tag}</div></figure>")
        parts.append("</div>")

    for run_key in run_keys:
        groups = [g for g in screens.values() if g["run"] == run_key]
        if not groups:
            continue
        parts.append(f"<h2>{esc(run_label(ctx, run_key))}</h2>")
        intro = (ctx.get("runs", {}).get(run_key) or {}).get("intro")
        if intro:
            parts.append(f"<p class='sub'>{intro}</p>")
        parts.append("<p class='hint'>點截圖可放大檢視；點截圖下方的問題代號會彈出說明。</p>")
        for g in sorted(groups, key=lambda g: g["screen"]):
            anchor = f"s-{run_key}-{g['screen']}"
            fs = [f for f in findings if f.get("run") == run_key and f.get("screen") == g["screen"]]
            restore = g.get("restore") or {}
            rtxt = ""
            if restore.get("matched"):
                pd = restore.get("pixel_diff")
                rtxt = f"摺回比對：{restore['moved']}/{restore['matched']} 個元件位移" + (f"，像素相異 {pd*100:.1f}%" if pd is not None and pd >= 0 else "")
            parts.append(f"<section class='screen' id='{esc(anchor)}'><header><h3>{esc(g['screen'])}</h3><span class='ids'>{esc(rtxt)}</span></header><div class='shots'>")
            for p in POSTURES + [p for p in g["postures"] if p not in POSTURES]:
                e = g["postures"].get(p)
                if not e:
                    continue
                img = jpeg_data_uri(e.get("annotated") or e.get("shot"), max_w=args.img_width)
                pf = [f for f in fs if f.get("posture") == p]
                badges = "".join(f"<span data-id='{f['id']}' tabindex='0' role='button' style='background:var(--sev-{f['severity']})'>#{f['id']}</span>" for f in pf)
                size = f"{e.get('W', 0):.0f}×{e.get('H', 0):.0f}pt"
                full_attr = ""
                if args.full_dir:
                    slug = slugify(run_key, g["screen"], p)
                    fp = export_full(e.get("annotated") or e.get("shot"), os.path.join(args.full_dir, "img"), slug, max_w=args.full_width)
                    if fp:
                        full_files.append(os.path.join("img", slug + ".jpg"))
                        full_attr = f" data-full='img/{slug}.jpg'"
                plabel = POSTURE_LABEL.get(p, p)
                cap_txt = f"{run_key} ｜ {g['screen']} ｜ {plabel} ｜ {size}"
                imgtag = f"<img src='{img}'{full_attr} data-cap='{esc(cap_txt)}' alt='{esc(g['screen'])} {esc(plabel)}' loading='lazy'>" if img else "<div class='cap'>（無截圖）</div>"
                parts.append(f"<figure class='shot' style='margin:0'>{imgtag}<figcaption class='cap'><b>{esc(plabel)}</b><span>{size}</span></figcaption><div class='fl'>{badges}</div></figure>")
            parts.append("</div></section>")

    if ctx.get("root_causes"):
        parts.append("<h2>程式碼層的根因</h2>")
        for rc in ctx["root_causes"]:
            refs = "".join(f"<code>{esc(r)}</code>" for r in rc.get("refs", []))
            parts.append(f"<div class='rc'><h3>{esc(rc['title'])}</h3><p class='sub' style='max-width:none'>{esc(rc['detail'])}</p><div class='refs'>{refs}</div></div>")

    if notes:
        parts.append("<h2>走訪時的自動化備註</h2><div class='tbl'><table><tr><th>情境</th><th>畫面</th><th>備註</th></tr>")
        for n in notes:
            parts.append(f"<tr><td>{esc(n.get('run', ''))}</td><td>{esc(n.get('screen', ''))}</td><td>{esc(n.get('message', ''))}</td></tr>")
        parts.append("</table></div>")

    if ctx.get("limits"):
        parts.append("<h2>限制與注意</h2><ul>" + "".join(f"<li>{l}</li>" for l in ctx["limits"]) + "</ul>")
    if ctx.get("next"):
        parts.append("<h2>建議下一步</h2><ul>" + "".join(f"<li>{l}</li>" for l in ctx["next"]) + "</ul>")
    parts.append("</div>")

    fmap = {str(f["id"]): {"id": f["id"], "severity": f["severity"], "sev_label": SEV_LABEL[f["severity"]], "title": f["title"],
                           "detail": f.get("detail", ""), "run": run_label(ctx, f.get("run", "")),
                           "screen": f.get("screen", ""), "posture": POSTURE_LABEL.get(f.get("posture"), f.get("posture", "")),
                           "rule": "人工目視" if f.get("manual") else f.get("rule", "")} for f in findings}
    data = json.dumps(fmap, ensure_ascii=False).replace("</", "<\\/")
    parts.append(f"""<div id="lb" role="dialog" aria-label="放大截圖"><img alt=""><div class="cap"></div></div>
<div id="pop" role="dialog" aria-label="問題說明"><div class="card"><button class="close" type="button">關閉</button><div class="where"></div><h3></h3><div class="d"></div></div></div>
<script>
var FINDINGS = {data};
(function(){{
  var lb = document.getElementById('lb'), lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.cap');
  var pop = document.getElementById('pop'), card = pop.querySelector('.card');
  function openLb(img){{
    lbImg.src = img.getAttribute('data-full') || img.src;
    lbCap.textContent = img.getAttribute('data-cap') || '';
    lb.classList.add('on');
  }}
  function closeAll(){{ lb.classList.remove('on'); pop.classList.remove('on'); lbImg.removeAttribute('src'); }}
  function openPop(id){{
    var f = FINDINGS[String(id)]; if(!f) return;
    card.className = 'card sev-' + f.severity;
    card.querySelector('h3').textContent = '#' + f.id + ' ' + f.title;
    card.querySelector('.d').textContent = f.detail;
    card.querySelector('.where').innerHTML = '<span class="chip sev sev-' + f.severity + '">' + f.sev_label + '</span>'
      + '<span class="chip">' + f.run + '</span><span class="chip">' + f.screen + '</span><span class="chip">' + f.posture + '</span>'
      + (f.rule === '人工目視' ? '<span class="chip manual">人工目視</span>' : '<span class="chip">' + f.rule + '</span>');
    pop.classList.add('on');
  }}
  document.addEventListener('click', function(ev){{
    var t = ev.target;
    if (t.closest('#lb')) {{ closeAll(); return; }}
    if (t.closest('#pop .close') || (t.id === 'pop')) {{ closeAll(); return; }}
    var b = t.closest('.fl span[data-id]'); if (b) {{ openPop(b.getAttribute('data-id')); return; }}
    var img = t.closest('.shot img'); if (img) {{ openLb(img); return; }}
  }});
  document.addEventListener('keydown', function(ev){{
    if (ev.key === 'Escape') closeAll();
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('.fl span[data-id]')) {{ ev.preventDefault(); openPop(ev.target.getAttribute('data-id')); }}
  }});
}})();
</script>""")

    if args.full_dir:
        with open(os.path.join(args.full_dir, "files.json"), "w") as f:
            json.dump(full_files, f, ensure_ascii=False, indent=1)

    out = "\n".join(parts)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote {args.out} ({os.path.getsize(args.out)/1e6:.1f} MB), findings={len(findings)}, runs={run_keys}")


if __name__ == "__main__":
    main()
