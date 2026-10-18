// 包裹 run-task.mjs 執行一張卡：
// spawn 子程序 → 心跳維持 lease → 捕捉輸出遮罩後分塊上傳 → 以 stateDir 最新
// run summary 為結果權威回報終態。orchestrate 的腳本與 schema 一律不修改。
import { spawn } from "node:child_process";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { hubInputPath } from "./hub-inputs.mjs";
import { createMasker } from "./mask.mjs";
import { savePendingReport } from "./pending.mjs";

const SUMMARY_POLL_MS = 500;
const LOG_FLUSH_MS = 1000;
const START_GRACE_MS = 1000;

/**
 * Hub 派工卡的執行前硬保險：卡片指向的 input.json 必須存在、是一般檔案、
 * 且解析後仍在專案根之內。資格過濾是輪詢當下的快照，領卡後檔案仍可能消失
 * （人工清理、換分支），所以這一關不能省。
 *
 * @returns {Promise<boolean>} 可以執行為 true
 */
async function hubInputReadable(projectRoot, automationTaskId) {
  const target = hubInputPath(projectRoot, automationTaskId);
  try {
    const info = await stat(target);
    if (!info.isFile()) return false;
    const [realRoot, realTarget] = await Promise.all([realpath(projectRoot), realpath(target)]);
    return realTarget === realRoot || realTarget.startsWith(`${realRoot}${path.sep}`);
  } catch {
    return false;
  }
}

async function readProjectConfig(projectRoot) {
  const raw = await readFile(path.join(projectRoot, ".agent-automation", "config.json"), "utf8");
  return JSON.parse(raw);
}

/** 掃 stateDir 找本次執行（taskId 相符且 startedAt 不早於 spawn 時間）最新的 summary。 */
async function findRunSummary(stateDirAbs, taskId, notBefore) {
  let files;
  try {
    files = await readdir(stateDirAbs);
  } catch {
    return null;
  }
  let newest = null;
  for (const name of files) {
    if (!name.endsWith(".json") || name.startsWith(".")) continue;
    let parsed;
    try {
      parsed = JSON.parse(await readFile(path.join(stateDirAbs, name), "utf8"));
    } catch {
      continue;
    }
    if (parsed?.taskId !== taskId) continue;
    const startedAt = Date.parse(parsed.startedAt ?? "") || 0;
    if (startedAt < notBefore - START_GRACE_MS) continue;
    const sortKey = Date.parse(parsed.updatedAt ?? parsed.startedAt ?? "") || 0;
    if (!newest || sortKey > newest.sortKey) newest = { summary: parsed, sortKey };
  }
  return newest?.summary ?? null;
}

function verificationCounts(summary, configured) {
  const recorded = Array.isArray(summary?.verification) ? summary.verification : [];
  const passed = recorded.filter((entry) => entry?.passed === true).length;
  const failed = recorded.length - passed;
  return { configured, passed, failed, notRun: Math.max(0, configured - recorded.length) };
}

/**
 * @returns {Promise<{phase: string, runId: string | null}>} 回報後的終態
 */
export async function executeClaimedCard({ config, api, card, projects, log = () => {} }) {
  const project = projects.find((entry) => entry.slug === card.projectSlug);
  if (!project) throw new Error(`claim 到未 advertise 的專案：${card.projectSlug}`);
  const projectConfig = await readProjectConfig(project.root);
  const stateDirAbs = path.resolve(project.root, projectConfig.stateDir ?? ".agent-automation/runs");
  const configured = Array.isArray(projectConfig.tasks?.[card.taskId]?.verification)
    ? projectConfig.tasks[card.taskId].verification.length
    : 0;

  // Hub 派工卡：讀不到清理輸入就完全不 spawn，回報帶原因的終態讓卡進需要處理
  if (card.hubAutomationTaskId && !(await hubInputReadable(project.root, card.hubAutomationTaskId))) {
    const payload = {
      leaseId: card.leaseId,
      runId: `local-${Date.now()}`,
      phase: "exhausted",
      attentionReason: "hub-input-missing",
      resumedFrom: card.resume?.previousRunId ?? undefined,
    };
    try {
      await api.report(payload);
    } catch {
      await savePendingReport(config.workerStateDir, payload);
    }
    log(`這台機器讀不到清理輸入，未執行：${card.hubAutomationTaskId}`);
    return { phase: payload.phase, runId: payload.runId, attentionReason: payload.attentionReason };
  }

  const args = [config.runTaskScript, "--project-root", project.root, "--task", card.taskId];
  if (card.resume?.previousRunId) args.push("--resume", card.resume.previousRunId);
  const requestText = card.resume?.note ?? card.note;
  if (requestText) args.push("--request", requestText);

  const spawnTime = Date.now();
  const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });

  const mask = createMasker({ envValues: Object.values(process.env) });
  let runId = null;
  let selectedRunner = null;
  let seq = 0;
  let buffer = "";
  const capture = (data) => {
    buffer += mask(data.toString());
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);

  const heartbeatTimer = setInterval(() => {
    api.heartbeat({ leaseId: card.leaseId, runnerId: selectedRunner ?? undefined }).catch(() => {});
  }, config.heartbeatIntervalMs);

  const flushLogs = async () => {
    if (!runId || buffer === "") return;
    const chunk = buffer;
    buffer = "";
    seq += 1;
    // 送失敗（含 Run 尚未在伺服器建立的 unknown-run）就還回緩衝，下一輪重送
    const res = await api.logs({ runId, seq, chunk }).catch(() => null);
    if (!res || res.status !== 200) {
      seq -= 1;
      buffer = chunk + buffer;
    }
  };
  const logTimer = setInterval(() => void flushLogs(), LOG_FLUSH_MS);

  // 等 run-task 寫下第一份 summary 取得 runId 後回報 running
  const summaryTimer = setInterval(async () => {
    if (runId) return;
    const summary = await findRunSummary(stateDirAbs, card.taskId, spawnTime);
    if (summary?.runId) {
      runId = summary.runId;
      selectedRunner = summary.selectedRunner?.id ?? null;
      api
        .report({
          leaseId: card.leaseId,
          runId,
          phase: "running",
          runnerId: selectedRunner ?? undefined,
          resumedFrom: card.resume?.previousRunId ?? undefined,
        })
        .catch(() => {});
    }
  }, SUMMARY_POLL_MS);

  const exitCode = await new Promise((resolve) => {
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });

  clearInterval(heartbeatTimer);
  clearInterval(logTimer);
  clearInterval(summaryTimer);

  const summary = await findRunSummary(stateDirAbs, card.taskId, spawnTime);
  if (summary?.runId) {
    runId = summary.runId;
    selectedRunner = summary.selectedRunner?.id ?? selectedRunner;
  }

  // 結果權威：summary 的 phase；沒有 summary 或仍是 running（子程序已結束）→ exhausted
  let phase = summary?.phase ?? "exhausted";
  if (!["completed", "verification-failed", "exhausted"].includes(phase)) {
    phase = exitCode === 0 ? "completed" : "exhausted";
  }
  const payload = {
    leaseId: card.leaseId,
    runId: runId ?? `local-${spawnTime}`,
    phase,
    runnerId: selectedRunner ?? undefined,
    verification: verificationCounts(summary, configured),
    resumedFrom: card.resume?.previousRunId ?? undefined,
  };
  try {
    await api.report(payload); // 終態 report 會 upsert Run，殘餘 log 之後一定送得進去
  } catch {
    await savePendingReport(config.workerStateDir, payload);
    log(`控制平面不可達，結果已快取：${payload.runId}`);
  }
  await flushLogs();
  return { phase, runId };
}
