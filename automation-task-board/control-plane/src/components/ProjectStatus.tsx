"use client";
// 專案頁：磁碟證據的階段總覽（worker 上傳的 automation-pipeline-board 快照）+ 外部執行活動（唯讀）。
// SSE refresh 即時更新，不重新整理頁面。
import { useCallback, useEffect, useState } from "react";

export type ProjectStatusData = {
  slug: string;
  displayName: string;
  snapshot: {
    hasDefinition: boolean;
    generatedAt: string;
    stages: Array<{ id: string; title: string; state: string; verified?: boolean }>;
    sources: Array<{ id: string; title: string; present: boolean }>;
  } | null;
  externalRuns: Array<{
    runId: string;
    taskId: string;
    phase: string;
    runnerId: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  }>;
};

const STAGE_STATE_LABELS: Record<string, { label: string; tone: string }> = {
  "not-started": { label: "尚未開始", tone: "idle" },
  produced: { label: "已產出", tone: "warn" },
  verified: { label: "已驗證", tone: "ok" },
};

const PHASE_LABELS: Record<string, string> = {
  running: "執行中",
  completed: "完成",
  "verification-failed": "完成檢查沒通過",
  exhausted: "所有 AI 工具都失敗",
  "possibly-stopped": "可能已停止",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export default function ProjectStatus({ initial }: { initial: ProjectStatusData }) {
  const [data, setData] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/projects/${encodeURIComponent(initial.slug)}/status`);
    if (res.ok) setData(await res.json());
  }, [initial.slug]);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.addEventListener("refresh", refresh);
    return () => source.close();
  }, [refresh]);

  return (
    <div className="detail">
      <section className="panel">
        <h2>磁碟現況（證據推導）</h2>
        {!data.snapshot && <p className="empty">worker 尚未同步這個專案——啟動 worker 並 advertise 此專案後會自動上傳</p>}
        {data.snapshot && !data.snapshot.hasDefinition && (
          <p className="empty">
            此專案沒有 .pipeline-board/pipeline.json 定義——加上定義後，這裡會顯示各階段的磁碟證據狀態
          </p>
        )}
        {data.snapshot?.hasDefinition && (
          <>
            <div className="stage-flow">
              {data.snapshot.stages.map((stage) => {
                const meta = STAGE_STATE_LABELS[stage.state] ?? { label: stage.state, tone: "idle" };
                return (
                  <div key={stage.id} className={`stage-node tone-${meta.tone}`}>
                    <span className="dot" />
                    <span className="stage-node-title">{stage.title}</span>
                    <span className="stage-node-state">{meta.label}</span>
                  </div>
                );
              })}
              {data.snapshot.stages.length === 0 && <p className="empty">快照沒有任何階段</p>}
            </div>
            <p className="snapshot-time">快照時間：{formatTime(data.snapshot.generatedAt)}</p>
          </>
        )}
      </section>

      <section className="panel">
        <h2>外部執行（看板以外發起，唯讀）</h2>
        {data.externalRuns.length === 0 && <p className="empty">沒有偵測到看板以外的執行</p>}
        <ul className="history-list">
          {data.externalRuns.map((run) => (
            <li key={run.runId}>
              <span className="history-event">{run.taskId}</span>
              <span className={`phase phase-${run.phase}`}>{PHASE_LABELS[run.phase] ?? run.phase}</span>
              {run.runnerId && <span className="history-actor">{run.runnerId}</span>}
              <span className="run-id">{run.runId}</span>
              <span className="history-time">{formatTime(run.finishedAt ?? run.startedAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
