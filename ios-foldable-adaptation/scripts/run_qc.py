#!/usr/bin/env python3
"""iPhone Duo 摺疊／展開 UI QC 的主機端協調腳本（與 App 無關）。

做的事：
  1. 編譯 duo_hinge（在模擬器內送出 Device Hub 同款的鉸鏈／方向 HID 事件）
  2. 以 xcodebuild build-for-testing + test-without-building 跑指定的測試，並把
     「檔案交換目錄」DUOQC_DIR（與 --plan、--env 指定的變數）注入 xctestrun
  3. 持續處理測試送來的請求：posture（folded / unfolded / unfolded-portrait）、shot（對亮著的面板截圖）
  4. 結束後把模擬器摺回去，輸出 run.json

用法（最少參數）：
  run_qc.py --project-dir <App 專案目錄> --scheme <含測試 target 的 scheme> --target <測試 target> \
            --tests <TestClass 或 TestClass/testMethod> --out <輸出目錄> --plan walk-plan.json --reboot

專案檔自動偵測：目錄下有 .xcworkspace（且不是 .xcodeproj 內的）就用 workspace，否則用 .xcodeproj；
也可用 --workspace / --xcodeproj 指定。需要先 xcodegen 的專案加 --xcodegen。

交換協定（測試端見 assets/DuoQCHarness.swift）：
  測試寫 xchg/req-<prefix><seq>.json，主機回 xchg/ack-<prefix><seq>.json；
  req = {action: "posture"|"shot", posture?, screen, name?, seq, run}
  ack = {ok, state:{active, displayId, orientation, size_px, size_pt, posture}, path?, display?, seq, error?}
"""
import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
HELPER_SRC = os.path.join(HERE, "duo_hinge.c")
HELPER_BIN = os.path.join(HERE, "duo_hinge")

# 模擬器面板名稱（xcrun devicectl device info displays）。外螢幕 LCD＝displayId 1，內螢幕 LCD-1＝displayId 3。
COVER = "LCD"
INNER = "LCD-1"
COVER_DEFAULT_ROT = "rot0"
PORTRAIT_ROTS = {"rot0", "rot180"}
LANDSCAPE_ROTS = {"rot90", "rot270"}
ORIENT_VALUES = ["portrait", "landscape-left", "landscape-right", "pud"]
POSTURES = ("folded", "unfolded", "unfolded-portrait")
TEST_SUITE_DONE_RE = re.compile(r"Test Suite '(Selected tests|All tests)' (passed|failed) at")


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def sh(args, check=True, timeout=180, capture=True):
    r = subprocess.run(args, capture_output=capture, text=True, timeout=timeout)
    if check and r.returncode != 0:
        raise RuntimeError(f"command failed ({r.returncode}): {' '.join(args)}\n{(r.stderr or '')[-800:]}")
    return r


def atomic_write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def ensure_helper():
    if os.path.exists(HELPER_BIN) and os.path.getmtime(HELPER_BIN) >= os.path.getmtime(HELPER_SRC):
        return HELPER_BIN
    log("compiling duo_hinge helper")
    sh(["xcrun", "-sdk", "iphonesimulator", "clang", "-arch", "arm64", "-mios-simulator-version-min=17.0", "-O2",
        "-o", HELPER_BIN, HELPER_SRC, "-framework", "IOKit", "-framework", "CoreFoundation"])
    sh(["codesign", "-f", "-s", "-", HELPER_BIN])
    return HELPER_BIN


class Duo:
    """讀取模擬器面板狀態、送鉸鏈／方向事件、截圖。與 App 無關。"""

    def __init__(self, udid, settle=1.5):
        self.udid = udid
        self.settle = settle
        self.helper = ensure_helper()

    def displays(self):
        r = sh(["xcrun", "devicectl", "device", "info", "displays", "-d", self.udid, "--json-output", "-"], timeout=60)
        return [d for d in json.loads(r.stdout)["result"]["displays"] if d.get("name", "").startswith("LCD")]

    def active(self):
        for d in self.displays():
            if d.get("active"):
                return d
        return None

    def state(self):
        a = self.active() or {}
        (_, _), (w, h) = a.get("bounds", [[0, 0], [0, 0]])
        scale = a.get("pointScale") or 3
        rot = a.get("currentOrientation")
        pw, ph = w / scale, h / scale
        if rot in LANDSCAPE_ROTS:
            pw, ph = ph, pw
        return {"active": a.get("name"), "displayId": a.get("displayId"), "orientation": rot,
                "size_px": [w, h], "size_pt": [pw, ph],
                "posture": "folded" if a.get("name") == COVER else "unfolded"}

    def hinge(self, degrees):
        sh(["xcrun", "simctl", "spawn", self.udid, self.helper, "set", str(degrees)], timeout=30)

    def orient(self, value):
        sh(["xcrun", "simctl", "spawn", self.udid, self.helper, "orient", value], timeout=30)

    def wait_active(self, name, timeout=30):
        deadline = time.time() + timeout
        while time.time() < deadline:
            a = self.active()
            if a and a.get("name") == name:
                return a
            time.sleep(0.5)
        raise RuntimeError(f"{name} did not become active within {timeout}s")

    def ensure_rotation(self, wanted, timeout_per_try=4.0):
        """依序嘗試各方向值，直到亮著的面板 currentOrientation 落在 wanted。"""
        a = self.active()
        if a and a.get("currentOrientation") in wanted:
            return a
        for value in ORIENT_VALUES:
            self.orient(value)
            deadline = time.time() + timeout_per_try
            while time.time() < deadline:
                time.sleep(0.6)
                a = self.active()
                if a and a.get("currentOrientation") in wanted:
                    return a
        return None

    def set_posture(self, posture):
        if posture == "folded":
            a = self.active()
            if not a or a.get("name") != COVER:
                self.hinge(0)
                self.wait_active(COVER)
            if not self.ensure_rotation({COVER_DEFAULT_ROT}):
                log("warning: cover did not return to rot0")
            time.sleep(self.settle)
            return self.state()
        if posture in ("unfolded", "unfolded-portrait"):
            a = self.active()
            if not a or a.get("name") != INNER:
                self.hinge(180)
                self.wait_active(INNER)
            wanted = PORTRAIT_ROTS if posture == "unfolded-portrait" else LANDSCAPE_ROTS
            if not self.ensure_rotation(wanted):
                raise RuntimeError(f"inner panel never reached orientation {sorted(wanted)}")
            time.sleep(self.settle)
            return self.state()
        raise RuntimeError(f"unknown posture {posture}; expected one of {POSTURES}")

    def screenshot(self, path, masked=False):
        """masked=True 時套用裝置螢幕外形（圓角以外與相機孔塗黑），用來看內容有沒有被圓角切到。"""
        a = self.active()
        if not a:
            raise RuntimeError("no active display")
        cmd = ["xcrun", "simctl", "io", self.udid, "screenshot", f"--display={a['displayId']}"]
        if masked:
            cmd.append("--mask=black")
        r = None
        for _ in range(3):
            r = sh(cmd + [path], check=False, timeout=60)
            if r.returncode == 0 and os.path.exists(path) and os.path.getsize(path) > 0:
                return a
            time.sleep(1.0)
        raise RuntimeError(f"screenshot failed: {(r.stderr if r else '')[-300:]}")


class Exchange(threading.Thread):
    """監看交換目錄，處理測試送來的 req-*.json，回 ack-*.json。"""

    SEQ_RE = re.compile(r"req-(?:[A-Za-z0-9]+-)?(\d+)\.json$")

    def __init__(self, xchg, duo, shots_dir, events_path, masked_dir=None):
        super().__init__(daemon=True)
        self.xchg, self.duo, self.shots_dir, self.events_path = xchg, duo, shots_dir, events_path
        self.masked_dir = masked_dir
        self.stop = threading.Event()
        self.handled = set()
        self.events = []

    def record(self, ev):
        ev["t"] = time.time()
        self.events.append(ev)
        with open(self.events_path, "a") as f:
            f.write(json.dumps(ev, ensure_ascii=False) + "\n")

    def handle(self, body):
        action = body.get("action")
        if action == "posture":
            return {"ok": True, "state": self.duo.set_posture(body["posture"])}
        if action == "shot":
            name = re.sub(r"[^\w\-一-鿿]+", "_", body["name"])
            path = os.path.join(self.shots_dir, f"{name}.png")
            a = self.duo.screenshot(path)
            if self.masked_dir:
                self.duo.screenshot(os.path.join(self.masked_dir, f"{name}.png"), masked=True)
            return {"ok": True, "path": path, "state": self.duo.state(), "display": a.get("name")}
        if action == "state":
            return {"ok": True, "state": self.duo.state()}
        return {"ok": False, "error": f"unknown action {action}"}

    def run(self):
        def seqkey(p):
            m = self.SEQ_RE.search(p)
            return int(m.group(1)) if m else 0
        while not self.stop.is_set():
            for req in sorted(glob.glob(os.path.join(self.xchg, "req-*.json")), key=seqkey):
                if req in self.handled:
                    continue
                ack = req.replace("/req-", "/ack-")
                if os.path.exists(ack):
                    self.handled.add(req)
                    continue
                try:
                    with open(req) as f:
                        body = json.load(f)
                except (json.JSONDecodeError, OSError):
                    continue  # 可能還在寫入
                t0 = time.time()
                try:
                    resp = self.handle(body)
                except Exception as e:  # noqa: BLE001
                    resp = {"ok": False, "error": str(e)}
                    log(f"request failed: {body} -> {e}")
                resp["seq"] = body.get("seq")
                atomic_write_json(ack, resp)
                self.handled.add(req)
                self.record({"req": body, "resp": resp, "ms": int((time.time() - t0) * 1000)})
                st = resp.get("state", {})
                log(f"{body.get('run', '')}{body.get('action')} {body.get('posture') or body.get('name', '')} "
                    f"-> {st.get('active')} {st.get('orientation')} {st.get('size_pt')} ({int((time.time() - t0) * 1000)} ms)"
                    + ("" if resp.get("ok") else f" ERROR {resp.get('error')}"))
            time.sleep(0.2)


def inject_env(xctestrun_path, target_name, env):
    """複製 xctestrun 並把環境變數塞進指定 test target；寫在同一目錄，__TESTROOT__ 才能正確解析。
    （TEST_RUNNER_* 環境變數在 Xcode 27.1 的 UI test runner 沒有生效，所以改走這條路。）"""
    import plistlib
    with open(xctestrun_path, "rb") as f:
        plist = plistlib.load(f)
    fmt = (plist.get("__xctestrun_metadata__") or {}).get("FormatVersion", 1)
    hit = False
    if fmt >= 2:
        for cfg in plist.get("TestConfigurations", []):
            for t in cfg.get("TestTargets", []):
                if t.get("BlueprintName") == target_name:
                    t.setdefault("EnvironmentVariables", {}).update(env)
                    hit = True
    else:
        t = plist.get(target_name)
        if t is not None:
            t.setdefault("EnvironmentVariables", {}).update(env)
            hit = True
    if not hit:
        raise RuntimeError(f"test target {target_name} not found in {xctestrun_path}")
    out = os.path.join(os.path.dirname(xctestrun_path), "duoqc_" + os.path.basename(xctestrun_path))
    with open(out, "wb") as f:
        plistlib.dump(plist, f)
    return out


def find_booted_simulator(match):
    r = sh(["xcrun", "simctl", "list", "devices", "booted", "-j"])
    for devs in json.loads(r.stdout)["devices"].values():
        for d in devs:
            if match in d.get("name", "") and d.get("state") == "Booted":
                return d["udid"]
    raise RuntimeError(f"no booted simulator whose name contains '{match}'")


def resolve_container(project_dir, workspace, xcodeproj):
    """回傳 xcodebuild 的 ('-workspace'|'-project', 路徑)。"""
    if workspace:
        return "-workspace", os.path.join(project_dir, workspace)
    if xcodeproj:
        return "-project", os.path.join(project_dir, xcodeproj)
    ws = [p for p in glob.glob(os.path.join(project_dir, "*.xcworkspace"))]
    if len(ws) == 1:
        return "-workspace", ws[0]
    xp = glob.glob(os.path.join(project_dir, "*.xcodeproj"))
    if len(xp) == 1:
        return "-project", xp[0]
    raise RuntimeError(f"cannot pick a project file in {project_dir}: workspaces={ws} projects={xp}; use --workspace/--xcodeproj")


def reboot_simulator(udid, post_boot_wait, reset_posterboard):
    # 連續多次摺疊／展開後模擬器外螢幕會卡在黑畫面（連系統設定 app 都黑），重開一次最保險
    log("rebooting simulator")
    sh(["xcrun", "simctl", "shutdown", udid], check=False, timeout=120)
    time.sleep(2)
    if reset_posterboard:
        # 反覆強制關機會弄壞模擬器內 PosterBoard（鎖定畫面桌布）的資料庫：之後每 1～3 分鐘當機、
        # macOS 一直跳 "PosterBoard quit unexpectedly"。把資料夾移走，開機後系統會重建；app 與登入狀態不受影響。
        store = os.path.expanduser(f"~/Library/Developer/CoreSimulator/Devices/{udid}/data/Library/Application Support/PRBPosterExtensionDataStore")
        if os.path.isdir(store):
            aside = store + f".moved-{int(time.time())}"
            shutil.move(store, aside)
            log(f"moved PosterBoard store aside: {aside}")
    sh(["xcrun", "simctl", "boot", udid], check=False, timeout=120)
    sh(["xcrun", "simctl", "bootstatus", udid, "-b"], check=False, timeout=300)
    time.sleep(post_boot_wait)


def watch_for_exit(proc, log_path, grace, stop_event):
    """xcodebuild test-without-building 跑完後偶爾不會自己結束：看到測試套件結束的字樣後再等 grace 秒就結束它。"""
    seen_at = None
    pos = 0
    while not stop_event.is_set() and proc.poll() is None:
        try:
            with open(log_path, "r", errors="replace") as f:
                f.seek(pos)
                chunk = f.read()
                pos = f.tell()
        except OSError:
            chunk = ""
        if seen_at is None and TEST_SUITE_DONE_RE.search(chunk):
            seen_at = time.time()
            log(f"test suite finished; giving xcodebuild {grace}s to exit")
        if seen_at is not None and time.time() - seen_at > grace:
            log("xcodebuild did not exit on its own; terminating it")
            proc.terminate()
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                proc.kill()
            return
        time.sleep(1.0)


def parse_kv(items):
    env = {}
    for it in items or []:
        if "=" not in it:
            raise SystemExit(f"--env expects KEY=VALUE, got {it!r}")
        k, v = it.split("=", 1)
        env[k] = v
    return env


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project-dir", required=True, help="App 專案目錄（含 .xcodeproj / .xcworkspace，或 project.yml）")
    ap.add_argument("--workspace", default=None, help="相對 --project-dir 的 .xcworkspace（不給就自動偵測）")
    ap.add_argument("--xcodeproj", default=None, help="相對 --project-dir 的 .xcodeproj（不給就自動偵測）")
    ap.add_argument("--scheme", required=True, help="含測試 target 的 scheme")
    ap.add_argument("--target", required=True, help="測試 target，例如 MyAppUITests 或 MyAppTests（整合測試）")
    ap.add_argument("--tests", required=True, help="TestClass 或 TestClass/testMethod（可用逗號分隔多個）")
    ap.add_argument("--out", required=True, help="輸出目錄")
    ap.add_argument("--plan", default=None, help="走訪計畫 JSON；會複製到 <out>/plan.json 並以 DUOQC_PLAN 注入測試")
    ap.add_argument("--env", action="append", default=[], help="額外注入測試的環境變數 KEY=VALUE（可重複）")
    ap.add_argument("--udid", default=None, help="模擬器 UDID；不給就找名稱含 --device-match 的 Booted 模擬器")
    ap.add_argument("--device-match", default="Duo")
    ap.add_argument("--derived-data", default=None, help="預設 <out>/DerivedData；和 Xcode 同時用時請指定獨立目錄以免 build.db 鎖住")
    ap.add_argument("--xcodegen", action="store_true", help="跑測試前先在 --project-dir 執行 xcodegen generate")
    ap.add_argument("--xcodegen-env", action="append", default=[], help="xcodegen 的環境變數 KEY=VALUE（可重複）")
    ap.add_argument("--skip-build", action="store_true", help="直接用現有的 xctestrun（測試檔沒改時可省略 build-for-testing）")
    ap.add_argument("--settle", type=float, default=1.5, help="姿態切換後等待秒數")
    ap.add_argument("--reboot", action="store_true", help="開跑前先 shutdown/boot 模擬器，避免外螢幕卡黑（建議每次都加）")
    ap.add_argument("--post-boot-wait", type=float, default=8.0)
    ap.add_argument("--reset-posterboard", action="store_true", help="重開時順便移走模擬器的 PosterBoard 資料庫（修復反覆當機）")
    ap.add_argument("--masked-shots", action="store_true", help="每張截圖另存一張套用螢幕外形的版本到 shots-masked/")
    ap.add_argument("--keep-xchg", action="store_true", help="不清掉 <out>/xchg 裡的舊交換檔（預設會清，避免舊 ack 讓新請求被略過）")
    ap.add_argument("--exit-grace", type=float, default=15.0, help="測試套件結束後 xcodebuild 仍未退出時，等幾秒就強制結束")
    args = ap.parse_args()

    udid = args.udid or find_booted_simulator(args.device_match)
    if args.reboot:
        reboot_simulator(udid, args.post_boot_wait, args.reset_posterboard)

    out = os.path.abspath(args.out)
    xchg = os.path.join(out, "xchg")
    shots = os.path.join(out, "shots")
    if os.path.isdir(xchg) and not args.keep_xchg:
        for p in glob.glob(os.path.join(xchg, "req-*.json")) + glob.glob(os.path.join(xchg, "ack-*.json")):
            os.remove(p)
    os.makedirs(xchg, exist_ok=True)
    os.makedirs(shots, exist_ok=True)

    duo = Duo(udid, settle=args.settle)
    log(f"udid={udid} state={duo.state()}")

    project_dir = os.path.abspath(args.project_dir)
    if args.xcodegen:
        log("xcodegen generate")
        env = dict(os.environ, **parse_kv(args.xcodegen_env))
        subprocess.run(["xcodegen", "generate"], cwd=project_dir, check=True, env=env, capture_output=True, text=True)

    container_flag, container_path = resolve_container(project_dir, args.workspace, args.xcodeproj)
    derived = os.path.abspath(args.derived_data) if args.derived_data else os.path.join(out, "DerivedData")
    t0 = time.time()
    if not args.skip_build:
        log(f"xcodebuild build-for-testing ({os.path.basename(container_path)}, scheme {args.scheme}) ... (log: build.log)")
        bcmd = ["xcodebuild", "build-for-testing", container_flag, container_path, "-scheme", args.scheme,
                "-destination", f"id={udid}", "-derivedDataPath", derived]
        with open(os.path.join(out, "build.log"), "w") as logf:
            brc = subprocess.run(bcmd, stdout=logf, stderr=subprocess.STDOUT, cwd=project_dir).returncode
        if brc != 0:
            log(f"build-for-testing failed rc={brc}; see build.log")
            return 2
        log(f"build-for-testing ok ({int(time.time() - t0)}s)")

    products = os.path.join(derived, "Build", "Products")
    cands = sorted(glob.glob(os.path.join(products, f"{args.scheme}_iphonesimulator*.xctestrun")), key=os.path.getmtime)
    if not cands:
        log(f"no xctestrun found under {products}")
        return 2

    env = {"DUOQC_DIR": xchg}
    if args.plan:
        plan_dst = os.path.join(out, "plan.json")
        shutil.copyfile(args.plan, plan_dst)
        env["DUOQC_PLAN"] = plan_dst
    env.update(parse_kv(args.env))
    xctestrun = inject_env(cands[-1], args.target, env)
    log(f"xctestrun: {os.path.basename(xctestrun)} env={sorted(env)}")

    cmd = ["xcodebuild", "test-without-building", "-xctestrun", xctestrun, "-destination", f"id={udid}",
           "-parallel-testing-enabled", "NO", "-resultBundlePath", os.path.join(out, "result.xcresult")]
    for t in args.tests.split(","):
        cmd.append(f"-only-testing:{args.target}/{t.strip()}")

    masked_dir = os.path.join(out, "shots-masked") if args.masked_shots else None
    if masked_dir:
        os.makedirs(masked_dir, exist_ok=True)
    exchange = Exchange(xchg, duo, shots, os.path.join(out, "events.jsonl"), masked_dir=masked_dir)
    exchange.start()

    log("xcodebuild test-without-building ... (log: xcodebuild.log)")
    t0 = time.time()
    xlog = os.path.join(out, "xcodebuild.log")
    stop_watch = threading.Event()
    with open(xlog, "w") as logf:
        proc = subprocess.Popen(cmd, stdout=logf, stderr=subprocess.STDOUT, cwd=project_dir)
        watcher = threading.Thread(target=watch_for_exit, args=(proc, xlog, args.exit_grace, stop_watch), daemon=True)
        watcher.start()
        rc = proc.wait()
    stop_watch.set()
    exchange.stop.set()
    exchange.join(timeout=10)
    log(f"xcodebuild exited {rc} after {int(time.time() - t0)}s")

    try:
        duo.set_posture("folded")
    except Exception as e:  # noqa: BLE001
        log(f"restore folded failed: {e}")

    summary = {
        "udid": udid, "scheme": args.scheme, "target": args.target, "tests": args.tests,
        "xcodebuild_rc": rc, "duration_s": int(time.time() - t0),
        "shots": sorted(os.path.basename(p) for p in glob.glob(os.path.join(shots, "*.png"))),
        "events": len(exchange.events),
        "errors": [e for e in exchange.events if not e["resp"].get("ok")],
    }
    atomic_write_json(os.path.join(out, "run.json"), summary)
    log(f"done: {len(summary['shots'])} shots, {len(summary['errors'])} errors")
    return 0 if rc == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
