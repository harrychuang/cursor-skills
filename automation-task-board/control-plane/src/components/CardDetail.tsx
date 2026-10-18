"use client";
// 卡片詳情：run 歷史 + log 即時追加（SSE refresh → 依 seq 游標增量抓取，不重新整理頁面）
import { useCallback, useEffect, useRef, useState } from "react";

type RunSummary = {
  runId: string;
  phase: string;
  verification: { configured?: number; passed?: number; failed?: number; notRun?: number } | null;
  resumedFrom: string | null;
  attribution: { member: string; machine: string; runner: string | null };
  startedAt: string;
  finishedAt: string | null;
  logChunkCount: number;
};

type Detail = {
  id: string;
  projectName: string;
  taskId: string;
  column: string;
  origin: string;
  note: string | null;
  attentionReason: string | null;
  resumeNote: string | null;
  runs: RunSummary[];
  history: Array<{
    event: string;
    fromColumn: string;
    toColumn: string;
    actorType: string;
    actorId: string | null;
    note: string | null;
    createdAt: string;
  }>;
};

const PHASE_LABELS: Record<string, string> = {
  running: "執行中",
  completed: "完成",
  "verification-failed": "完成檢查沒通過",
  exhausted: "所有 AI 工具都失敗",
};

const REASON_LABELS: Record<string, string> = {
  "possibly-stopped": "可能已停止（心跳中斷）",
  "verification-failed": "完成檢查沒通過",
  exhausted: "所有 AI 工具都失敗",
  "hub-input-missing": "這台機器讀不到清理輸入（請由送出者的機器領取）",
  "hub-apply-failed": "Figma Plugin 套用失敗",
};

// 與看板卡片同一段文案：AI 只到 plan-ready，Figma 的修改只在 Plugin 發生
const HUB_REVIEW_HINT = "AI 只產出了清理計畫，Figma 還沒有被修改。請到 Figma Plugin 確認並套用計畫；套用完成後這張卡會自動結案。";

export default function CardDetail({ initial }: { initial: Detail }) {
  const [detail, setDetail] = useState(initial);
  const [selectedRun, setSelectedRun] = useState<string | null>(initial.runs[0]?.runId ?? null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const cursorRef = useRef(0);

  const refreshDetail = useCallback(async () => {
    const res = await fetch(`/api/cards/${initial.id}/detail`);
    if (res.ok) setDetail(await res.json());
  }, [initial.id]);

  const pullLogs = useCallback(async () => {
    if (!selectedRun) return;
    const res = await fetch(`/api/cards/${initial.id}/logs?runId=${encodeURIComponent(selectedRun)}&after=${cursorRef.current}`);
    if (!res.ok) return;
    const data = (await res.json()) as { chunks: Array<{ seq: number; content: string }> };
    if (data.chunks.length > 0) {
      cursorRef.current = data.chunks[data.chunks.length - 1].seq;
      setLogLines((prev) => [...prev, ...data.chunks.map((chunk) => chunk.content)]);
    }
  }, [initial.id, selectedRun]);

  // 換選 run 時重置游標重抓
  useEffect(() => {
    cursorRef.current = 0;
    setLogLines([]);
    void pullLogs();
  }, [selectedRun, pullLogs]);

  useEffect(() => {
    const source = new EventSource("/api/events");
    const onRefresh = () => {
      void refreshDetail();
      void pullLogs();
    };
    source.addEventListener("refresh", onRefresh);
    return () => source.close();
  }, [refreshDetail, pullLogs]);

  return (
    <div className="detail">
      {detail.origin === "DESIGN_AUTOMATION_HUB" && detail.column === "AWAITING_REVIEW" && (
        <section className="panel">
          <h2>下一步在 Figma Plugin</h2>
          <p className="card-hub-hint">{HUB_REVIEW_HINT}</p>
        </section>
      )}
      {detail.attentionReason && (
        <section className="panel">
          <h2>需要處理的原因</h2>
          <p className="card-reason">{REASON_LABELS[detail.attentionReason] ?? detail.attentionReason}</p>
        </section>
      )}
      <section className="panel">
        <h2>執行紀錄</h2>
        {detail.runs.length === 0 && <p className="empty">還沒有任何執行</p>}
        <ul className="run-list">
          {detail.runs.map((run) => (
            <li key={run.runId} className={run.runId === selectedRun ? "selected" : ""}>
              <button className="run-row" onClick={() => setSelectedRun(run.runId)}>
                <span className={`phase phase-${run.phase}`}>{PHASE_LABELS[run.phase] ?? run.phase}</span>
                <span className="run-id">{run.runId}</span>
                <span className="run-attribution">
                  {run.attribution.member} · {run.attribution.machine}
                  {run.attribution.runner ? ` · ${run.attribution.runner}` : ""}
                </span>
                {run.verification && (
                  <span className="run-verification">
                    檢查 {run.verification.passed ?? 0} 過 / {run.verification.failed ?? 0} 敗 /{" "}
                    {run.verification.notRun ?? 0} 未跑
                  </span>
                )}
                {run.resumedFrom && <span className="badge">重跑自 {run.resumedFrom}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>執行輸出{selectedRun ? `（${selectedRun}）` : ""}</h2>
        <pre className="log-view" data-testid="log-view">
          {logLines.length > 0 ? logLines.join("") : "（尚無輸出）"}
        </pre>
      </section>

      <section className="panel">
        <h2>卡片歷史</h2>
        <ul className="history-list">
          {detail.history.map((event, index) => (
            <li key={index}>
              <span className="history-event">{event.event}</span>
              <span className="history-move">
                {event.fromColumn} → {event.toColumn}
              </span>
              <span className="history-actor">
                {event.actorType}
                {event.actorId ? `:${event.actorId}` : ""}
              </span>
              {event.note && <span className="history-note">{event.note}</span>}
              <span className="history-time">{new Date(event.createdAt).toISOString().replace("T", " ").slice(0, 19)} UTC</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
