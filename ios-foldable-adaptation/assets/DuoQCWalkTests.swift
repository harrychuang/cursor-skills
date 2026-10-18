//
//  DuoQCWalkTests.swift
//  <YourApp>UITests
//
//  依走訪計畫（DUOQC_PLAN）執行的 iPhone Duo QC 走訪。
//  - 計畫裡每個 scenario 是一個情境；要跑哪些用 DUOQC_SCENARIOS=A,L 指定（預設全部）。
//  - 需要特殊流程（例如在 app 內直接觸發點選）的情境，另外寫 DuoQCHarness 的子類別，不用改這個檔。
//
//  執行：scripts/run_qc.py --target <YourApp>UITests --tests DuoQCWalkTests/testWalkPlan --plan walk-plan.json ...
//

import XCTest

final class DuoQCWalkTests: DuoQCHarness {

    func testWalkPlan() throws {
        let wanted = ProcessInfo.processInfo.environment["DUOQC_SCENARIOS"]?
            .split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        let scenarios = plan.scenarios.filter { wanted == nil || wanted!.contains($0.id) }
        guard !scenarios.isEmpty else {
            throw XCTSkip("走訪計畫沒有情境可跑（DUOQC_PLAN 未設定，或 DUOQC_SCENARIOS 沒有對到任何 id）")
        }
        for scenario in scenarios {
            runPrefix = scenario.id + "-"
            switch scenario.mode {
            case "sequence": runSequence(scenario)
            default: runMatrix(scenario)
            }
        }
    }

    /// matrix：每個畫面「摺疊導航 → 摺疊截圖 → 展開截圖 → （展開直向）→（摺回）」
    private func runMatrix(_ scenario: DuoQCPlan.Scenario) {
        coldLaunch(posture: scenario.launchPosture, screen: "launch")
        for screen in scenario.screens {
            qc(screen: screen.id, postures: screen.postures ?? scenario.postures) { [self] in
                run(steps: screen.steps, screen: screen.id)
            }
            if screen.leaveAfter { leaveDetailPage() }
        }
    }

    /// sequence：導航一次，然後依序切姿態截圖，最後跑 after 步驟
    private func runSequence(_ scenario: DuoQCPlan.Scenario) {
        coldLaunch(posture: scenario.launchPosture, screen: "launch")
        run(steps: scenario.navigate, screen: scenario.id)
        for (index, item) in scenario.sequence.enumerated() {
            if index > 0 || item.posture != scenario.launchPosture {
                requestPosture(item.posture, screen: item.id)
                settle(item.settle ?? plan.timing.afterUnfold)
            }
            dumpAndShot(screen: item.id, posture: item.posture)
        }
        run(steps: scenario.after, screen: scenario.id)
    }

    /// 在指定姿態冷啟動；展開時 XCUITest 的點擊會落到外螢幕，所以先摺回關掉浮動視窗，再回到要求的姿態
    private func coldLaunch(posture: String, screen: String) {
        requestPosture(posture, screen: screen)
        launchApp()
        settle(plan.timing.afterLaunch)
        if posture != "folded" {
            requestPosture("folded", screen: screen)
            settle(1)
            dismissOverlayWindows()
            requestPosture(posture, screen: screen)
            settle(2)
        } else {
            dismissOverlayWindows()
        }
    }
}
