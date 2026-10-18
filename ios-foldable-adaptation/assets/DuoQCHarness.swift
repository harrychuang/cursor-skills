//
//  DuoQCHarness.swift
//  <YourApp>UITests
//
//  iPhone Duo（摺疊／展開）UI QC 走訪的共用基底（與 App 無關）。
//
//  由主機端腳本（scripts/run_qc.py）透過「檔案交換目錄」協調摺疊姿態與截圖：
//  - 本測試負責：在 app 內導航、傾印 accessibility 階層（含 frame）、向主機請求姿態切換與截圖。
//  - 主機負責：送出鉸鏈 HID 事件（摺疊／展開／轉向）、用 simctl 對目前亮著的面板截圖。
//
//  環境變數（run_qc.py 會注入 xctestrun；TEST_RUNNER_* 在 Xcode 27.1 的 UI runner 無效）：
//  - DUOQC_DIR      交換目錄；沒設定就整個 XCTSkip，不影響一般 CI。
//  - DUOQC_PLAN     走訪計畫 JSON（見 DuoQCWalkTests 與 assets/walk-plan.example.json）。
//  - DUOQC_XCT_SHOT 設 0 關掉 XCTest 自己的截圖（主機截圖才是正式的）。
//  - DUOQC_HOSTLESS 設 1 代表沒有主機（在一般 iPhone 模擬器當對照組）：姿態請求一律視為成功。
//
//  App 專屬的東西（分頁名稱、彈窗按鈕、浮動視窗）都從 plan 的 "app" 區塊讀；子類別可以覆寫任何方法。
//

import ObjectiveC
import XCTest

open class DuoQCHarness: XCTestCase {

    public var app: XCUIApplication!
    public var xchg: URL!
    public var plan: DuoQCPlan = DuoQCPlan()
    public var runPrefix = ""
    public var hostless = false
    public var xctScreenshotEnabled = true

    private var seq = 0
    private var notes: [[String: Any]] = []
    private var lastRequestedPosture = "folded"
    private static var quiescenceDisabled = false

    // MARK: - 生命週期

    open override func setUpWithError() throws {
        continueAfterFailure = true
        let env = ProcessInfo.processInfo.environment
        guard let dir = env["DUOQC_DIR"], !dir.isEmpty else {
            throw XCTSkip("DUOQC_DIR 未設定，略過 iPhone Duo QC 走訪")
        }
        Self.disableWaitForQuiescence()
        xctScreenshotEnabled = env["DUOQC_XCT_SHOT"] != "0"
        hostless = env["DUOQC_HOSTLESS"] == "1"
        xchg = URL(fileURLWithPath: dir)
        try FileManager.default.createDirectory(at: xchg, withIntermediateDirectories: true)
        if let planPath = env["DUOQC_PLAN"], !planPath.isEmpty {
            plan = try DuoQCPlan.load(from: URL(fileURLWithPath: planPath))
        }
        app = plan.app.bundleId.map { XCUIApplication(bundleIdentifier: $0) } ?? XCUIApplication()

        // 系統權限／追蹤等彈窗：有「允許」類按鈕就按，否則按最後一顆
        let allowLabels = plan.app.alertAllow
        addUIInterruptionMonitor(withDescription: "系統彈窗") { alert in
            let predicate = NSPredicate(format: allowLabels.map { _ in "label CONTAINS[c] %@" }.joined(separator: " OR "),
                                        argumentArray: allowLabels)
            let allow = alert.buttons.matching(predicate).firstMatch
            if allow.exists { allow.tap(); return true }
            let last = alert.buttons.allElementsBoundByIndex.last
            last?.tap()
            return last != nil
        }
    }

    open override func tearDownWithError() throws {
        guard xchg != nil else { return }   // setUp 以 XCTSkip 結束時 xchg 仍是 nil
        writeJSON(name: "\(runPrefix)notes.json", object: notes)
    }

    // MARK: - 啟動與離開

    /// 啟動 app 並等主畫面出現；app 偶爾會停在啟動時的載入頁不往下走（模擬器剛重開機後的第一次啟動），這時結束重啟。
    open func launchApp() {
        for attempt in 1...plan.app.launchRetries {
            app.launch()
            if plan.app.readyElement.map({ element(for: $0).waitForExistence(timeout: plan.app.readyTimeout) }) ?? true {
                dismissLaunchPopups()
                return
            }
            note("啟動", "第 \(attempt) 次啟動後 \(Int(plan.app.readyTimeout)) 秒仍停在載入頁，重新啟動")
            app.terminate()
        }
        XCTFail("app 一直停在啟動時的載入頁")
    }

    /// 啟動後若出現 plan.app.launchDismiss 列的彈窗就關掉
    open func dismissLaunchPopups() {
        for item in plan.app.launchDismiss {
            let button = app.buttons[item.label].firstMatch
            if button.waitForExistence(timeout: item.timeout) { button.tap(); settle(0.5) }
        }
    }

    /// 離開內頁回到主畫面：優先用直欄／導覽列的返回鍵，失敗就重新啟動 app。
    open func leaveDetailPage() {
        requestPosture("folded", screen: "leave-detail")
        settle(2)
        let back = plan.app.back
        for label in back.buttons {
            let b = app.buttons[label].firstMatch
            if b.exists, b.isHittable { b.tap(); settle(1.5); break }
        }
        if !isHome() {
            let nav = app.navigationBars.firstMatch
            if nav.exists, nav.buttons.count > 0 { nav.buttons.element(boundBy: 0).tap(); settle(1.5) }
        }
        if !isHome(), !back.contains.isEmpty {
            let predicate = NSPredicate(format: back.contains.map { _ in "label CONTAINS %@" }.joined(separator: " OR "),
                                        argumentArray: back.contains)
            let b = app.buttons.matching(predicate).firstMatch
            if b.exists { b.tap(); settle(1.5) }
        }
        if !isHome() {
            note("leave-detail", "無法返回主畫面，改以重新啟動 app")
            launchApp()
            settle(2)
            dismissOverlayWindows()
        }
    }

    /// 是否已在主畫面（plan.app.back.homeElement；預設看 tab bar 或 readyElement）
    open func isHome() -> Bool {
        if let home = plan.app.back.homeElement { return element(for: home).waitForExistence(timeout: 3) }
        if app.tabBars.firstMatch.waitForExistence(timeout: 3) { return true }
        if let ready = plan.app.readyElement { return element(for: ready).waitForExistence(timeout: 3) }
        return true
    }

    // MARK: - 單一畫面的姿態矩陣

    /// 導航永遠在「摺疊」狀態下進行（展開時的觸控會落到外螢幕，XCUITest 點擊不可靠），之後只改變姿態、不再碰畫面。
    /// postures 順序固定：folded → unfolded → unfolded-portrait → refolded，只做有列出的。
    open func qc(screen: String, postures: [String], navigate: () -> Void) {
        requestPosture("folded", screen: screen)
        settle(plan.timing.afterFold)   // 摺回後版面仍在變動，立刻點擊可能點到別的東西
        navigate()
        settle(plan.timing.afterNavigate)
        if postures.contains("folded") { dumpAndShot(screen: screen, posture: "folded") }

        if postures.contains("unfolded") {
            requestPosture("unfolded", screen: screen)
            settle(plan.timing.afterUnfold)
            dumpAndShot(screen: screen, posture: "unfolded")
        }
        if postures.contains("unfolded-portrait") {
            let ack = requestPosture("unfolded-portrait", screen: screen)
            if (ack["ok"] as? Bool) == true {
                settle(plan.timing.afterUnfold)
                dumpAndShot(screen: screen, posture: "unfolded-portrait")
            } else {
                note(screen, "主機無法切到「展開直向」：\(ack["error"] ?? "unknown")")
            }
        }
        if postures.contains("refolded") {
            requestPosture("folded", screen: screen)
            settle(plan.timing.afterFold)
            dumpAndShot(screen: screen, posture: "refolded")
        }
    }

    // MARK: - 步驟 DSL（走訪計畫裡的 steps）

    /// 執行一串步驟；回傳 false 代表某個必要步驟失敗（已記 note）
    @discardableResult
    open func run(steps: [DuoQCStep], screen: String) -> Bool {
        var ok = true
        for step in steps {
            if !run(step: step, screen: screen) { ok = false }
        }
        return ok
    }

    open func run(step: DuoQCStep, screen: String) -> Bool {
        let timeout = step.timeout ?? plan.timing.findTimeout
        switch step.kind {
        case .tab(let label):
            return tapTab(label)
        case .tap(let target):
            let el = element(for: target)
            if let swipe = step.scrollSwipe, el.exists, !el.isHittable {
                drag(swipe)
                settle(1)
            }
            return tapIfExists(el, screen: screen, timeout: timeout, optional: step.optional)
        case .firstCell:
            return tapIfExists(app.cells.firstMatch, screen: screen, timeout: timeout, optional: step.optional)
        case .cell(let index):
            return tapIfExists(app.cells.element(boundBy: index), screen: screen, timeout: timeout, optional: step.optional)
        case .swipe(let points):
            drag(points)
            return true
        case .wait(let seconds):
            settle(seconds)
            return true
        case .dismiss(let label):
            let b = app.buttons[label].firstMatch
            if b.waitForExistence(timeout: step.timeout ?? 3) { b.tap() }
            return true
        case .back:
            leaveDetailPage()
            return true
        case .posture(let posture):
            requestPosture(posture, screen: screen)
            settle(plan.timing.afterUnfold)
            return true
        case .shot(let name):
            dumpAndShot(screen: name ?? screen, posture: step.posture ?? lastRequestedPosture)
            return true
        case .relaunch:
            launchApp()
            return true
        case .dismissOverlays:
            dismissOverlayWindows()
            return true
        }
    }

    /// 走訪計畫裡的元素描述 → XCUIElement
    open func element(for target: DuoQCTarget) -> XCUIElement {
        switch target {
        case .button(let label): return app.buttons[label].firstMatch
        case .buttonPrefix(let p): return app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", p)).firstMatch
        case .buttonContains(let s): return app.buttons.matching(NSPredicate(format: "label CONTAINS %@", s)).firstMatch
        case .text(let label): return app.staticTexts[label].firstMatch
        case .textPrefix(let p): return app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", p)).firstMatch
        case .textContains(let s): return app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", s)).firstMatch
        case .anyPrefix(let p): return app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", p)).firstMatch
        case .identifier(let id): return app.descendants(matching: .any)[id].firstMatch
        case .tabBar: return app.tabBars.firstMatch
        }
    }

    // MARK: - 傾印與截圖

    open func dumpAndShot(screen: String, posture: String) {
        // 浮動視窗可能在啟動當下還沒建立而漏關；摺疊時（點擊會落在外螢幕）每次截圖前再確認一次
        if posture == "folded" || posture == "refolded" { dismissOverlayWindows() }
        let base = "\(runPrefix)\(screen)__\(posture)"

        // 1) accessibility 階層（每個元件的型別／label／identifier／frame）
        let tree = app.debugDescription
        try? tree.write(to: xchg.appendingPathComponent("dump-\(base).txt"), atomically: true, encoding: .utf8)

        // 2) XCTest 視角的尺寸：用來確認展開後 app／window frame 是否跟著變
        var meta: [String: Any] = [
            "screen": screen, "posture": posture, "run": runPrefix,
            "appFrame": rect(app.frame),
            "windowFrame": rect(app.windows.firstMatch.frame),
            "tabBarFrame": app.tabBars.firstMatch.exists ? rect(app.tabBars.firstMatch.frame) : [],
            "navBarFrame": app.navigationBars.firstMatch.exists ? rect(app.navigationBars.firstMatch.frame) : [],
            "timestamp": Date().timeIntervalSince1970,
        ]
        if xctScreenshotEnabled {
            let shot = XCUIScreen.main.screenshot()
            meta["xctScreenshotSize"] = [shot.image.size.width, shot.image.size.height]
            meta["xctScreenshotScale"] = shot.image.scale
            try? shot.pngRepresentation.write(to: xchg.appendingPathComponent("xct-\(base).png"))
        }
        writeJSON(name: "meta-\(base).json", object: meta)

        // 3) 請主機用 simctl 對「目前亮著的面板」截圖
        request(["action": "shot", "screen": screen, "posture": posture, "name": base])
    }

    // MARK: - 與主機的檔案交換

    @discardableResult
    open func requestPosture(_ posture: String, screen: String) -> [String: Any] {
        lastRequestedPosture = posture == "folded" ? "folded" : posture
        return request(["action": "posture", "posture": posture, "screen": screen])
    }

    @discardableResult
    open func request(_ body: [String: Any]) -> [String: Any] {
        if hostless { return ["ok": true, "hostless": true] }
        seq += 1
        var payload = body
        payload["seq"] = seq
        payload["run"] = runPrefix
        let reqURL = xchg.appendingPathComponent("req-\(runPrefix)\(seq).json")
        let ackURL = xchg.appendingPathComponent("ack-\(runPrefix)\(seq).json")
        writeJSON(url: reqURL, object: payload)
        let deadline = Date().addingTimeInterval(plan.timing.hostTimeout)
        while Date() < deadline {
            if let data = try? Data(contentsOf: ackURL),
               let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                return obj
            }
            Thread.sleep(forTimeInterval: 0.25)
        }
        note(body["screen"] as? String ?? "-", "主機 \(Int(plan.timing.hostTimeout)) 秒內沒有回應 req-\(runPrefix)\(seq)：\(body)")
        return ["ok": false, "error": "timeout"]
    }

    // MARK: - 小工具

    /// 有些頁面永遠在動畫（跑馬燈），XCUITest 每次 tap 前後都會等 60 秒「app idle」才放行。
    /// 這是 QC 走訪專用的測試 bundle，直接把 XCUIApplicationProcess 的 waitForQuiescence* 換成 no-op。
    public static func disableWaitForQuiescence() {
        guard !quiescenceDisabled, let cls = NSClassFromString("XCUIApplicationProcess") else { return }
        var count: UInt32 = 0
        guard let methods = class_copyMethodList(cls, &count) else { return }
        defer { free(methods) }
        let noop: @convention(block) (AnyObject) -> Void = { _ in }
        let imp = imp_implementationWithBlock(noop)
        for i in 0..<Int(count) {
            let name = NSStringFromSelector(method_getName(methods[i]))
            if name.lowercased().contains("waitforquiescence") {
                method_setImplementation(methods[i], imp)
            }
        }
        quiescenceDisabled = true
    }

    /// 關掉 Debug build 的浮動視窗（例如除錯球：一個小於 maxSize 的獨立 UIWindow），避免蓋住截圖。
    /// 長按會直接隱藏；若沒成功，改走「點一下 → 依序點 fallbackTaps」。
    open func dismissOverlayWindows() {
        guard let cfg = plan.app.overlayWindows else { return }
        func overlay() -> XCUIElement? {
            app.windows.allElementsBoundByIndex.first { w in
                let f = w.frame
                return f.width > 0 && f.width <= cfg.maxSize && f.height <= cfg.maxSize
            }
        }
        guard let w = overlay(), w.exists else { return }
        if cfg.longPress > 0 { w.press(forDuration: cfg.longPress); settle(0.8) }
        if let w2 = overlay(), w2.exists, !cfg.fallbackTaps.isEmpty {
            w2.tap()
            for label in cfg.fallbackTaps {
                let b = app.buttons[label]
                if b.waitForExistence(timeout: 4) { b.tap() }
            }
            settle(0.5)
        }
        if let w3 = overlay(), w3.exists { note("overlay-window", "浮動視窗關閉失敗，截圖可能仍有它") }
    }

    /// iPhone Duo 上系統把 UITabBar 畫成側邊直立列，accessibility 階層裡沒有 TabBar 型別，所以用 label 找 Button。
    @discardableResult
    open func tapTab(_ title: String) -> Bool {
        let btn = app.buttons[title].firstMatch
        if btn.waitForExistence(timeout: 8) { btn.tap(); return true }
        note(title, "找不到 tab「\(title)」")
        return false
    }

    @discardableResult
    open func tapIfExists(_ element: XCUIElement, screen: String, timeout: TimeInterval = 5, optional: Bool = false) -> Bool {
        if element.waitForExistence(timeout: timeout) { element.tap(); return true }
        if !optional { note(screen, "找不到可點的元件：\(element.description.prefix(120))") }
        return optional
    }

    open func drag(_ points: [[Double]]) {
        guard points.count == 2, points[0].count == 2, points[1].count == 2 else { return }
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: points[0][0], dy: points[0][1]))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: points[1][0], dy: points[1][1]))
        start.press(forDuration: 0.05, thenDragTo: end)
    }

    public func settle(_ seconds: TimeInterval) {
        Thread.sleep(forTimeInterval: seconds)
    }

    public func note(_ screen: String, _ message: String) {
        notes.append(["screen": screen, "message": message, "run": runPrefix, "time": Date().timeIntervalSince1970])
        writeJSON(name: "\(runPrefix)notes.json", object: notes)
    }

    private func rect(_ r: CGRect) -> [CGFloat] {
        [r.origin.x, r.origin.y, r.size.width, r.size.height]
    }

    public func writeJSON(name: String, object: Any) {
        writeJSON(url: xchg.appendingPathComponent(name), object: object)
    }

    public func writeJSON(url: URL, object: Any) {
        guard let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]) else { return }
        try? data.write(to: url, options: .atomic)
    }
}

// MARK: - 走訪計畫（JSON）

/// 走訪計畫的資料結構；JSON 格式見 assets/walk-plan.example.json
public struct DuoQCPlan: Decodable {
    public struct App: Decodable {
        public var bundleId: String?
        public var readyElement: DuoQCTarget?
        public var readyTimeout: TimeInterval = 30
        public var launchRetries: Int = 3
        public var launchDismiss: [Dismiss] = []
        public var alertAllow: [String] = ["允許", "Allow", "OK"]
        public var overlayWindows: OverlayWindows?
        public var back: Back = Back()

        public struct Dismiss: Decodable { public var label: String; public var timeout: TimeInterval = 3 }
        public struct OverlayWindows: Decodable {
            public var maxSize: Double = 70
            public var longPress: TimeInterval = 1.2
            public var fallbackTaps: [String] = []
        }
        public struct Back: Decodable {
            public var buttons: [String] = ["返回"]
            public var contains: [String] = ["返回", "Back", "關閉"]
            public var homeElement: DuoQCTarget?
            public init() {}
        }
        public init() {}
    }

    public struct Timing: Decodable {
        public var afterFold: TimeInterval = 2.5
        public var afterUnfold: TimeInterval = 2.5
        public var afterNavigate: TimeInterval = 3
        public var afterLaunch: TimeInterval = 4
        public var findTimeout: TimeInterval = 5
        public var hostTimeout: TimeInterval = 75
        public init() {}
    }

    public struct Scenario: Decodable {
        public var id: String
        public var title: String?
        /// "matrix"：每個畫面各做一輪姿態；"sequence"：導航一次後依序切姿態
        public var mode: String = "matrix"
        public var launchPosture: String = "folded"
        public var postures: [String] = ["folded", "unfolded", "unfolded-portrait", "refolded"]
        public var screens: [Screen] = []
        public var navigate: [DuoQCStep] = []
        public var sequence: [SequenceItem] = []
        public var after: [DuoQCStep] = []

        public struct Screen: Decodable {
            public var id: String
            public var steps: [DuoQCStep] = []
            public var postures: [String]?
            public var leaveAfter: Bool = false
        }
        public struct SequenceItem: Decodable {
            public var id: String
            public var posture: String
            public var settle: TimeInterval?
        }
    }

    public var app: App = App()
    public var timing: Timing = Timing()
    public var scenarios: [Scenario] = []

    public init() {}

    public static func load(from url: URL) throws -> DuoQCPlan {
        try JSONDecoder().decode(DuoQCPlan.self, from: Data(contentsOf: url))
    }
}

/// 元素描述：{"button": "選股頁"} / {"buttonPrefix": "多方"} / {"text": "..."} / {"textPrefix": "SARA EP."} / {"identifier": "..."} / {"tabBar": true}
public enum DuoQCTarget: Decodable {
    case button(String), buttonPrefix(String), buttonContains(String)
    case text(String), textPrefix(String), textContains(String)
    case anyPrefix(String), identifier(String), tabBar

    private enum Keys: String, CodingKey { case button, buttonPrefix, buttonContains, text, textPrefix, textContains, anyPrefix, identifier, tabBar }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        if let v = try c.decodeIfPresent(String.self, forKey: .button) { self = .button(v); return }
        if let v = try c.decodeIfPresent(String.self, forKey: .buttonPrefix) { self = .buttonPrefix(v); return }
        if let v = try c.decodeIfPresent(String.self, forKey: .buttonContains) { self = .buttonContains(v); return }
        if let v = try c.decodeIfPresent(String.self, forKey: .text) { self = .text(v); return }
        if let v = try c.decodeIfPresent(String.self, forKey: .textPrefix) { self = .textPrefix(v); return }
        if let v = try c.decodeIfPresent(String.self, forKey: .textContains) { self = .textContains(v); return }
        if let v = try c.decodeIfPresent(String.self, forKey: .anyPrefix) { self = .anyPrefix(v); return }
        if let v = try c.decodeIfPresent(String.self, forKey: .identifier) { self = .identifier(v); return }
        if (try c.decodeIfPresent(Bool.self, forKey: .tabBar)) == true { self = .tabBar; return }
        throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "unknown element target"))
    }
}

/// 一個步驟。JSON 以「動作鍵」決定種類，其餘鍵是修飾：
///   {"tab": "選股頁"}                      點分頁（以 label 找 Button）
///   {"tap": {"buttonPrefix": "多方"}, "optional": true, "timeout": 5, "scrollSwipe": [[0.7,0.3],[0.15,0.3]]}
///   {"firstCell": true} / {"cell": 2}
///   {"swipe": [[0.75,0.88],[0.05,0.88]]}   正規化座標拖曳
///   {"wait": 3}
///   {"dismiss": "我明白了"}                 有就關、沒有就略過
///   {"back": true}                          離開內頁回主畫面
///   {"posture": "unfolded"}                 請主機切姿態
///   {"shot": "6-返回選股頁", "posture": "folded"}   傾印＋截圖（posture 只是檔名標籤）
///   {"relaunch": true} / {"dismissOverlays": true}
public struct DuoQCStep: Decodable {
    public enum Kind {
        case tab(String), tap(DuoQCTarget), firstCell, cell(Int), swipe([[Double]]), wait(TimeInterval)
        case dismiss(String), back, posture(String), shot(String?), relaunch, dismissOverlays
    }
    public var kind: Kind
    public var optional: Bool = false
    public var timeout: TimeInterval?
    public var posture: String?
    public var scrollSwipe: [[Double]]?

    private enum Keys: String, CodingKey {
        case tab, tap, firstCell, cell, swipe, wait, dismiss, back, posture, shot, relaunch, dismissOverlays, optional, timeout, scrollSwipe
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        optional = try c.decodeIfPresent(Bool.self, forKey: .optional) ?? false
        timeout = try c.decodeIfPresent(TimeInterval.self, forKey: .timeout)
        scrollSwipe = try c.decodeIfPresent([[Double]].self, forKey: .scrollSwipe)
        let postureValue = try c.decodeIfPresent(String.self, forKey: .posture)
        if let v = try c.decodeIfPresent(String.self, forKey: .tab) { kind = .tab(v) }
        else if let v = try c.decodeIfPresent(DuoQCTarget.self, forKey: .tap) { kind = .tap(v) }
        else if (try c.decodeIfPresent(Bool.self, forKey: .firstCell)) == true { kind = .firstCell }
        else if let v = try c.decodeIfPresent(Int.self, forKey: .cell) { kind = .cell(v) }
        else if let v = try c.decodeIfPresent([[Double]].self, forKey: .swipe) { kind = .swipe(v) }
        else if let v = try c.decodeIfPresent(TimeInterval.self, forKey: .wait) { kind = .wait(v) }
        else if let v = try c.decodeIfPresent(String.self, forKey: .dismiss) { kind = .dismiss(v) }
        else if (try c.decodeIfPresent(Bool.self, forKey: .back)) == true { kind = .back }
        else if let v = try c.decodeIfPresent(String.self, forKey: .shot) { kind = .shot(v); posture = postureValue }
        else if (try c.decodeIfPresent(Bool.self, forKey: .relaunch)) == true { kind = .relaunch }
        else if (try c.decodeIfPresent(Bool.self, forKey: .dismissOverlays)) == true { kind = .dismissOverlays }
        else if let v = postureValue { kind = .posture(v) }
        else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "unknown step")) }
    }
}
