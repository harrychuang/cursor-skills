// worker 主迴圈：註冊 → 輪詢領卡 → 執行（單機同時最多一個任務）。
import { setTimeout as sleep } from "node:timers/promises";
import { createApi } from "./api.mjs";
import { executeClaimedCard } from "./exec.mjs";
import { collectLocalHubInputs } from "./hub-inputs.mjs";
import { flushPendingReports } from "./pending.mjs";
import { validateProjects } from "./projects.mjs";
import { createSyncScheduler } from "./status-sync.mjs";

/**
 * 可測試的迴圈核心：busy 時不領卡（Poll and claim within capacity）。
 */
export function createWorkerLoop({ config, api, projects, execute }) {
  let busy = false;
  const slugs = projects.map((project) => project.slug);

  async function tick() {
    await flushPendingReports(api, config.workerStateDir).catch(() => {});
    if (busy) return "busy";
    // Hub 派工卡只能由讀得到其 runtime input 的機器領取，所以每輪申報本機現有的 id
    const localInputs = await collectLocalHubInputs(projects).catch(() => []);
    let res;
    try {
      res = await api.claim({
        machineId: config.machineId,
        projects: slugs,
        runnerId: config.runners[0],
        localInputs,
      });
    } catch {
      return "unreachable";
    }
    if (res.status !== 200 || !res.data?.cardId) return "idle";
    busy = true;
    void execute(res.data)
      .catch(() => {})
      .finally(() => {
        busy = false;
      });
    return "claimed";
  }

  return { tick, isBusy: () => busy };
}

export async function runWorker(config) {
  const api = createApi(config);
  const { valid, excluded } = await validateProjects(config.projectRoots);
  for (const item of excluded) {
    process.stdout.write(`排除專案根（${item.reason}）：${item.root}\n`);
  }
  if (valid.length === 0) {
    process.stderr.write("沒有任何可用的專案根，worker 結束。\n");
    process.exitCode = 1;
    return;
  }
  const registration = await api.register({
    machineId: config.machineId,
    label: config.machineLabel,
    runners: config.runners,
    projects: valid.map((project) => ({ slug: project.slug })),
  });
  if (registration.status !== 200) {
    process.stderr.write(`註冊失敗（${registration.status}）：${JSON.stringify(registration.data)}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`已註冊 ${valid.length} 個專案，開始輪詢 ${config.controlPlaneUrl}\n`);

  const workerLog = (message) => process.stdout.write(`${message}\n`);
  const scheduler = createSyncScheduler({ config, api, projects: valid, log: workerLog });
  // 同步時機 1：註冊成功後立即（導入既有專案第一天就有畫面）
  void scheduler.onRegistered();

  const loop = createWorkerLoop({
    config,
    api,
    projects: valid,
    execute: (card) => {
      process.stdout.write(`領到卡片：${card.projectSlug}/${card.taskId}（${card.cardId}）\n`);
      return executeClaimedCard({
        config,
        api,
        card,
        projects: valid,
        log: workerLog,
      }).then((result) => {
        process.stdout.write(`卡片 ${card.cardId} 結束：${result.phase}\n`);
        // 同步時機 3：執行結束後（階段最可能剛變化）
        void scheduler.onRunFinished(card.projectSlug);
      });
    },
  });

  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  while (!stopped) {
    await loop.tick();
    // 同步時機 2：固定間隔（statusSyncIntervalMs，預設 10 分鐘）；失敗不中斷輪詢
    void scheduler.maybeInterval();
    await sleep(config.pollIntervalMs);
  }
  process.stdout.write("worker 停止輪詢。\n");
}
