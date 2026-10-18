//
//  DuoIntegrationTestCase.swift
//  <YourApp>Tests
//
//  iPhone Duo 版面「整合測試」的共用基底（與 App 無關）。
//  這類測試不是純單元測試：直接操作測試宿主（實際執行中的 app）的畫面，並透過檔案交換目錄請主機切換
//  模擬器的姿態與截圖（scripts/run_qc.py --target <YourApp>Tests ...）。
//
//  為什麼需要它：XCUITest 在「展開」狀態的點擊會落到外螢幕，所以「內螢幕橫向點畫面上的項目」
//  （兩欄的左側清單、側欄）改由這裡在 app 行程內直接觸發。
//  未設定 DUOQC_DIR 時整個略過，不影響一般單元測試。
//
//  寫這類測試的注意事項：
//  - 檢查頁面釋放要用弱參考＋ autoreleasepool；測試方法裡的強參考與 topViewController／children 的回傳值
//    會把頁面留到測試結束，既會掩蓋也會製造「晚釋放」的問題。
//  - 同一個 app 行程連跑多個測試時，前一個測試留在同一頁就不要再點一次分頁（重複點會讓外觀回呼亂序）。
//  - 整列是按鈕的 cell 要送按鈕事件（tapButton(inRowTitled:)），不是 didSelectRowAt。
//

import XCTest
import UIKit

open class DuoIntegrationTestCase: XCTestCase {

    /// 交換檔的序號。每個測試方法都是新的 instance，序號要跨測試累加，檔名才不會重複
    private static var sequence = 0

    private var exchangeDirectory: URL?

    /// 交換檔與截圖檔名的前綴，各測試類別覆寫成不同值（例如 "S-"、"AR-"）
    open var runPrefix: String { "X-" }

    /// Debug build 浮動視窗（除錯球）的最大邊長；截圖前會把這類視窗藏起來
    open var overlayWindowMaxSize: CGFloat { 70 }

    open override func setUpWithError() throws {
        guard let directory = ProcessInfo.processInfo.environment["DUOQC_DIR"], !directory.isEmpty else {
            throw XCTSkip("DUOQC_DIR 未設定，略過 iPhone Duo 版面整合測試")
        }
        exchangeDirectory = URL(fileURLWithPath: directory)
    }

    open override func tearDown() {
        if exchangeDirectory != nil {
            request(["action": "posture", "posture": "folded", "screen": "teardown"])  // 結束時摺回外螢幕
        }
        super.tearDown()
    }

    // MARK: - 找畫面

    /// 目前 key window 的 root view controller（可指定型別）
    public func rootViewController<T: UIViewController>(as type: T.Type = UIViewController.self) -> T? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .sorted { $0.isKeyWindow && !$1.isKeyWindow }
            .compactMap { $0.rootViewController as? T }
            .first
    }

    public func findViewController<T: UIViewController>(of type: T.Type, in root: UIViewController) -> T? {
        if let match = root as? T { return match }
        if let presented = root.presentedViewController, let match = findViewController(of: type, in: presented) { return match }
        for child in root.children {
            if let match = findViewController(of: type, in: child) { return match }
        }
        return nil
    }

    public func findViewControllers<T: UIViewController>(of type: T.Type, in root: UIViewController) -> [T] {
        var result: [T] = []
        if let match = root as? T { result.append(match) }
        root.children.forEach { result.append(contentsOf: findViewControllers(of: type, in: $0)) }
        return result
    }

    public func findViews<T: UIView>(of type: T.Type, in root: UIView) -> [T] {
        var result: [T] = []
        if let match = root as? T { result.append(match) }
        root.subviews.forEach { result.append(contentsOf: findViews(of: type, in: $0)) }
        return result
    }

    // MARK: - 操作畫面

    /// 找到標題相符的按鈕並送出點擊（分段切換鈕等不在清單裡的按鈕）
    public func tapButton(titled title: String, in root: UIViewController) throws {
        let button = findViews(of: UIButton.self, in: root.view).first { button in
            button.title(for: .normal) == title || button.titleLabel?.text == title || button.accessibilityLabel == title
        }
        try XCTUnwrap(button, "找不到「\(title)」按鈕").sendActions(for: .touchUpInside)
    }

    /// 在清單（UITableView）中找到標題相符的列，直接觸發它的點選
    public func selectItem(titled title: String, in root: UIViewController) throws {
        for tableView in findViews(of: UITableView.self, in: root.view) {
            for section in 0..<tableView.numberOfSections {
                for row in 0..<tableView.numberOfRows(inSection: section) {
                    let indexPath = IndexPath(row: row, section: section)
                    guard let cell = tableView.cellForRow(at: indexPath),
                          findViews(of: UILabel.self, in: cell).contains(where: { $0.text == title }) else { continue }
                    tableView.delegate?.tableView?(tableView, didSelectRowAt: indexPath)
                    return
                }
            }
        }
        for collectionView in findViews(of: UICollectionView.self, in: root.view) {
            for indexPath in collectionView.indexPathsForVisibleItems {
                guard let cell = collectionView.cellForItem(at: indexPath),
                      findViews(of: UILabel.self, in: cell).contains(where: { $0.text == title }) else { continue }
                collectionView.delegate?.collectionView?(collectionView, didSelectItemAt: indexPath)
                return
            }
        }
        XCTFail("清單找不到「\(title)」")
    }

    /// 有些清單的列是整列一顆按鈕，點選要送按鈕事件
    public func tapButton(inRowTitled title: String, in root: UIViewController) throws {
        let cell = findViews(of: UITableViewCell.self, in: root.view).first { cell in
            findViews(of: UILabel.self, in: cell).contains { $0.text == title }
        }
        let button = try XCTUnwrap(cell.flatMap { findViews(of: UIButton.self, in: $0).first }, "找不到「\(title)」的按鈕")
        button.sendActions(for: .touchUpInside)
    }

    /// 把 Debug build 的浮動視窗藏起來
    public func hideOverlayWindows() {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .filter { $0.frame.width > 0 && $0.frame.width <= overlayWindowMaxSize && $0.frame.height <= overlayWindowMaxSize }
            .forEach { $0.isHidden = true }
    }

    // MARK: - 與主機的檔案交換（格式與 DuoQCHarness 相同）

    /// 測試跑在 app 的主執行緒上，等待時要讓 runloop 繼續轉，畫面才會更新
    public func settle(_ seconds: TimeInterval) {
        RunLoop.current.run(until: Date().addingTimeInterval(seconds))
    }

    @discardableResult
    public func posture(_ posture: String, screen: String = "-") -> [String: Any] {
        request(["action": "posture", "posture": posture, "screen": screen])
    }

    public func shot(_ name: String) {
        request(["action": "shot", "screen": name, "posture": "", "name": runPrefix + name])
    }

    @discardableResult
    public func request(_ body: [String: Any], timeout: TimeInterval = 75) -> [String: Any] {
        guard let exchangeDirectory else { return [:] }
        Self.sequence += 1
        let sequence = Self.sequence
        var payload = body
        payload["seq"] = sequence
        payload["run"] = runPrefix
        let requestURL = exchangeDirectory.appendingPathComponent("req-\(runPrefix)\(sequence).json")
        let ackURL = exchangeDirectory.appendingPathComponent("ack-\(runPrefix)\(sequence).json")
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]) else { return [:] }
        try? data.write(to: requestURL, options: .atomic)
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let ackData = try? Data(contentsOf: ackURL),
               let ack = try? JSONSerialization.jsonObject(with: ackData) as? [String: Any] {
                return ack
            }
            settle(0.25)
        }
        XCTFail("主機 \(Int(timeout)) 秒內沒有回應：\(body)")
        return [:]
    }
}
