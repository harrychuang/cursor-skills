"use client";
// 五欄看板：卡片移動由系統事件驅動（SSE 推播 → 重抓）。
// 拖曳=下指令，只開放收件匣兩欄（需要處理/待確認）；拖起時合法目的欄亮起，
// 放下後以 View Transition 讓卡片動畫移到目的欄（樂觀更新，伺服器為準校正）。
import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import type { BoardCard, BoardState } from "@/lib/board";

const COLUMNS: Array<{ key: string; title: string; tone: string; inbox?: boolean }> = [
  { key: "CLAIMABLE", title: "待領取", tone: "idle" },
  { key: "RUNNING", title: "執行中", tone: "link" },
  { key: "NEEDS_ATTENTION", title: "需要處理", tone: "stop", inbox: true },
  { key: "AWAITING_REVIEW", title: "待確認", tone: "warn", inbox: true },
  { key: "DONE", title: "完成", tone: "ok" },
];

const REASON_LABELS: Record<string, string> = {
  "possibly-stopped": "可能已停止（心跳中斷）",
  "verification-failed": "完成檢查沒通過",
  exhausted: "所有 AI 工具都失敗",
  "hub-input-missing": "這台機器讀不到清理輸入（請由送出者的機器領取）",
  "hub-apply-failed": "Figma Plugin 套用失敗",
};

const ORIGIN_LABELS: Record<string, string> = {
  PIPELINE_CHAIN: "接棒",
  DESIGN_AUTOMATION_HUB: "Figma Hub",
};

/**
 * Hub 派工卡的待確認文案：AI 只跑到「產出清理計畫」，Figma 的實際修改只在 Plugin 發生。
 * 看板在 Hub 回報套用完成之前，不得把這張卡說成已完成的工程任務。
 */
const HUB_REVIEW_HINT = "AI 只產出了清理計畫，Figma 還沒有被修改。請到 Figma Plugin 確認並套用計畫；套用完成後這張卡會自動結案。";

function isHubCard(card: { origin: string } | null): boolean {
  return card?.origin === "DESIGN_AUTOMATION_HUB";
}

/** 拖曳指令表：合法的 (來源欄, 目的欄) → 指令；不在表上的方向一律不可放。 */
function dropCommandFor(fromColumn: string, toColumn: string): "rerun" | "approve" | null {
  if (
    (fromColumn === "NEEDS_ATTENTION" || fromColumn === "AWAITING_REVIEW") &&
    (toColumn === "CLAIMABLE" || toColumn === "RUNNING")
  ) {
    return "rerun";
  }
  if (fromColumn === "AWAITING_REVIEW" && toColumn === "DONE") {
    return "approve";
  }
  return null;
}

/** 指令的實際目的欄（卡片真正會落地的地方，與放下的欄無關）。 */
const COMMAND_DESTINATION: Record<"rerun" | "approve", string> = {
  rerun: "CLAIMABLE",
  approve: "DONE",
};

/** DOM 更新包進 View Transition（不支援的瀏覽器直接更新）。 */
function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (doc.startViewTransition) {
    doc.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}

export default function Board({ initial }: { initial: BoardState }) {
  const [state, setState] = useState(initial);
  const [dragging, setDragging] = useState<{ id: string; from: string } | null>(null);
  // 待確認的指令（drop 後彈出應用內 modal——瀏覽器會封鎖 drag 事件中的原生 prompt/confirm）
  const [pending, setPending] = useState<{ cardId: string; cmd: "rerun" | "approve" } | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/board");
    if (res.ok) {
      const next = (await res.json()) as BoardState;
      withTransition(() => setState(next));
    }
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.addEventListener("refresh", refresh);
    return () => source.close();
  }, [refresh]);

  const approve = useCallback(
    async (cardId: string) => {
      await fetch(`/api/cards/${cardId}/approve`, { method: "POST" });
      await refresh();
    },
    [refresh],
  );

  /** 實際執行指令：樂觀移動 → POST → 以伺服器結果校正。 */
  const executeCommand = useCallback(
    async (cardId: string, cmd: "rerun" | "approve", note?: string) => {
      withTransition(() =>
        setState((prev) => ({
          ...prev,
          cards: prev.cards.map((card) =>
            card.id === cardId ? { ...card, column: COMMAND_DESTINATION[cmd] } : card,
          ),
        })),
      );
      const res = await fetch(`/api/cards/${cardId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, note: note || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(`指令被拒：${data.error ?? res.status}`);
      }
      await refresh();
    },
    [refresh],
  );

  /** 請求指令：只開 modal，不做任何事——取消即一切如舊。 */
  const command = useCallback((cardId: string, cmd: "rerun" | "approve") => {
    setPending({ cardId, cmd });
  }, []);

  // 復原誤拖的重跑：卡還在待領取且未被領走時才會成功
  const undo = useCallback(
    async (cardId: string) => {
      const res = await fetch(`/api/cards/${cardId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "undo-rerun" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error === "already-claimed" ? "來不及了：卡片已被 worker 領走開跑" : `無法復原：${data.error ?? res.status}`);
      }
      await refresh();
    },
    [refresh],
  );

  return (
    <div className="board">
      {pending && (
        <CommandModal
          cmd={pending.cmd}
          card={state.cards.find((card) => card.id === pending.cardId) ?? null}
          onCancel={() => setPending(null)}
          onConfirm={(note) => {
            const { cardId, cmd } = pending;
            setPending(null);
            void executeCommand(cardId, cmd, note);
          }}
        />
      )}
      {COLUMNS.map((column) => {
        const cards = state.cards.filter((card) => card.column === column.key);
        const legalCmd = dragging ? dropCommandFor(dragging.from, column.key) : null;
        const draggedCard = dragging ? state.cards.find((card) => card.id === dragging.id) ?? null : null;
        return (
          <section
            key={column.key}
            className={`column tone-${column.tone}${column.inbox ? " inbox" : ""}${legalCmd ? " drop-legal" : ""}`}
            onDragOver={(e) => {
              // 只有合法目的欄允許放下；其他欄不 preventDefault → 瀏覽器顯示禁止游標
              if (legalCmd) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(e) => {
              if (!legalCmd || !dragging) return;
              e.preventDefault();
              const cardId = dragging.id;
              setDragging(null);
              command(cardId, legalCmd); // 開 modal；不在 drag 事件裡呼叫原生對話框
            }}
          >
            <header className="column-head">
              <span className="dot" />
              <h2>{column.title}</h2>
              <span className="count">{cards.length}</span>
              {column.inbox && <span className="inbox-tag">等你處理</span>}
            </header>
            {legalCmd && (
              <div className="drop-hint">
                放開＝{legalCmd === "rerun" ? "附說明重跑" : isHubCard(draggedCard) ? "標記結案" : "批准完成"}
              </div>
            )}
            <div className="cards">
              {cards.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  isDragging={dragging?.id === card.id}
                  onDragState={setDragging}
                  onApprove={approve}
                  onCommand={command}
                  onUndo={undo}
                />
              ))}
              {cards.length === 0 && !legalCmd && <p className="empty">目前沒有卡片</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** 指令確認 modal：重跑可附調整說明；批准提示會結案並接棒。取消＝卡片不動。 */
function CommandModal({
  cmd,
  card,
  onCancel,
  onConfirm,
}: {
  cmd: "rerun" | "approve";
  card: BoardCard | null;
  onCancel: () => void;
  onConfirm: (note?: string) => void;
}) {
  const [note, setNote] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="modal-scrim" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{cmd === "rerun" ? "附說明重跑" : isHubCard(card) ? "標記結案" : "批准完成"}</h3>
        {card && (
          <p className="modal-card-ref">
            {card.projectName} · {card.taskId}
          </p>
        )}
        {cmd === "approve" && isHubCard(card) && <p className="modal-hint">{HUB_REVIEW_HINT}</p>}
        {cmd === "rerun" ? (
          <>
            <textarea
              className="modal-note"
              placeholder="要附上什麼調整說明？（可留空，例如：採用 B 案的間距）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              autoFocus
            />
            <p className="modal-hint">送出後卡片回到待領取，有 10 秒可復原；之後由 AI 接手重跑。</p>
          </>
        ) : (
          <p className="modal-hint">批准後卡片會結案；若任務鏈上有下一階段，會自動建立接棒卡。此操作無法復原。</p>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className="btn btn-ok" onClick={() => onConfirm(note.trim() || undefined)} autoFocus={cmd === "approve"}>
            {cmd === "rerun" ? "確定重跑" : isHubCard(card) ? "確定結案" : "確定批准"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 復原倒數：每秒更新、進度條縮短，歸零時整組消失（伺服器同時開放領取並拒絕復原）。 */
function UndoCountdown({ until, onUndo }: { until: string; onUndo: () => void }) {
  const untilMs = useMemo(() => new Date(until).getTime(), [until]);
  const totalMs = useMemo(() => Math.max(untilMs - Date.now(), 0), [untilMs]);
  const [remainingMs, setRemainingMs] = useState(totalMs);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(untilMs - Date.now(), 0);
      setRemainingMs(left);
      if (left === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [untilMs]);

  if (remainingMs <= 0) return null;
  const seconds = Math.ceil(remainingMs / 1000);
  const ratio = totalMs > 0 ? remainingMs / totalMs : 0;
  return (
    <div className="undo-zone">
      <button className="btn btn-undo" onClick={onUndo} title="倒數結束後卡片開放給 worker 領取，屆時無法復原">
        復原重跑（{seconds}s）
      </button>
      <div className="undo-track">
        <div className="undo-bar" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="undo-caption">倒數結束後開放執行，無法再更正</span>
    </div>
  );
}

function Card({
  card,
  isDragging,
  onDragState,
  onApprove,
  onCommand,
  onUndo,
}: {
  card: BoardCard;
  isDragging: boolean;
  onDragState: (value: { id: string; from: string } | null) => void;
  onApprove: (id: string) => void;
  onCommand: (id: string, cmd: "rerun" | "approve") => void;
  onUndo: (id: string) => void;
}) {
  const draggable = card.column === "NEEDS_ATTENTION" || card.column === "AWAITING_REVIEW";
  return (
    <article
      className={`card${isDragging ? " dragging" : ""}`}
      data-card-id={card.id}
      draggable={draggable}
      title={draggable ? "拖到「待領取／執行中」重跑；待確認的卡拖到「完成」批准" : undefined}
      style={{ viewTransitionName: `card-${card.id}` } as React.CSSProperties}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/card-id", card.id);
        e.dataTransfer.effectAllowed = "move";
        onDragState({ id: card.id, from: card.column });
      }}
      onDragEnd={() => onDragState(null)}
    >
      <a className="card-project" href={`/projects/${encodeURIComponent(card.projectSlug)}`}>
        {card.projectName}
      </a>
      <a className="card-title" href={`/cards/${card.id}`}>
        {card.taskId}
      </a>
      <div className="card-badges">
        <span className="badge">{ORIGIN_LABELS[card.origin] ?? "手動"}</span>
        {card.reviewGate && <span className="badge">需 review</span>}
        {!card.approved && card.column === "CLAIMABLE" && <span className="badge badge-warn">待放行</span>}
        {draggable && <span className="badge badge-drag">⠿ 可拖曳</span>}
      </div>
      {card.stage && (
        <div className="card-stage" title={`流水線第 ${card.stage.index}/${card.stage.total} 階段`}>
          {Array.from({ length: card.stage.total }, (_, i) => (
            <span key={i} className={`stage-dot${i < card.stage!.index ? " on" : ""}`} />
          ))}
          <span className="stage-label">
            階段 {card.stage.index}/{card.stage.total}
          </span>
        </div>
      )}
      {card.attribution && (
        <div className="card-attribution">
          {card.attribution.member} · {card.attribution.machine}
          {card.attribution.runner ? ` · ${card.attribution.runner}` : ""}
        </div>
      )}
      {card.attentionReason && (
        <div className="card-reason">{REASON_LABELS[card.attentionReason] ?? card.attentionReason}</div>
      )}
      {isHubCard(card) && card.column === "AWAITING_REVIEW" && <p className="card-hub-hint">{HUB_REVIEW_HINT}</p>}
      {card.note && <p className="card-note">{card.note}</p>}
      {!card.approved && card.column === "CLAIMABLE" && (
        <button className="btn" onClick={() => onApprove(card.id)}>
          放行執行
        </button>
      )}
      {card.undoable && card.undoUntil && <UndoCountdown until={card.undoUntil} onUndo={() => onUndo(card.id)} />}
      {(card.column === "NEEDS_ATTENTION" || card.column === "AWAITING_REVIEW") && (
        <div className="card-actions">
          <button className="btn" onClick={() => onCommand(card.id, "rerun")}>
            附說明重跑
          </button>
          {card.column === "AWAITING_REVIEW" && (
            <button
              className="btn btn-ok"
              title={isHubCard(card) ? HUB_REVIEW_HINT : undefined}
              onClick={() => onCommand(card.id, "approve")}
            >
              {isHubCard(card) ? "標記結案" : "批准完成"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
