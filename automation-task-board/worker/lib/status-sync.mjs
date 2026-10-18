// 專案現況同步：快照（子程序跑 automation-pipeline-board 的 build 腳本，不重寫推導）+ 外部執行掃描。
// 所有失敗只印一行 log、不丟例外——同步是 best-effort，絕不中斷輪詢與執行。
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const BUILD_TIMEOUT_MS = 180_000;

function runBuildScript(scriptPath, projectRoot) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, "--project-root", projectRoot], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, reason: "timeout" });
    }, BUILD_TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? { ok: true } : { ok: false, reason: stderr.slice(0, 200) || `exit ${code}` });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, reason: error.message });
    });
  });
}

/** 快照流程：有 pipeline.json → build + 上傳；無 → 上傳 hasDefinition=false。 */
export async function syncProjectSnapshot({ config, api, project, log = () => {} }) {
  try {
    const definitionPath = path.join(project.root, ".pipeline-board", "pipeline.json");
    if (!existsSync(definitionPath)) {
      await api.projectStatus({ projectSlug: project.slug, hasDefinition: false });
      return { status: "no-definition" };
    }
    const scriptPath = path.join(config.skillsRoot, "automation-pipeline-board", "scripts", "build-pipeline-status.mjs");
    const built = await runBuildScript(scriptPath, project.root);
    if (!built.ok) {
      log(`快照產生失敗（${project.slug}）：${built.reason}`);
      return { status: "build-failed" };
    }
    const statusPath = path.join(project.root, ".pipeline-board", "status.json");
    const snapshot = JSON.parse(await readFile(statusPath, "utf8"));
    await api.projectStatus({
      projectSlug: project.slug,
      hasDefinition: true,
      generatedAt: snapshot.generatedAt,
      snapshot,
    });
    return { status: "uploaded" };
  } catch (error) {
    log(`快照同步失敗（${project.slug}）：${error.message}`);
    return { status: "failed" };
  }
}

/** 掃描 stateDir 的 run summary，回傳 sanitized 欄位（不含 instruction／prompt 等內容）。 */
export async function scanExternalRuns(project) {
  const configPath = path.join(project.root, ".agent-automation", "config.json");
  let stateDir = ".agent-automation/runs";
  try {
    const parsed = JSON.parse(await readFile(configPath, "utf8"));
    if (typeof parsed.stateDir === "string") stateDir = parsed.stateDir;
  } catch {
    return [];
  }
  const stateDirAbs = path.resolve(project.root, stateDir);
  let files;
  try {
    files = await readdir(stateDirAbs);
  } catch {
    return [];
  }
  const runs = [];
  for (const name of files) {
    if (!name.endsWith(".json") || name.startsWith(".")) continue;
    let parsed;
    try {
      parsed = JSON.parse(await readFile(path.join(stateDirAbs, name), "utf8"));
    } catch {
      continue; // 無法解析的檔案略過
    }
    if (!parsed?.runId || !parsed?.taskId || !parsed?.phase) continue;
    runs.push({
      runId: parsed.runId,
      taskId: parsed.taskId,
      phase: parsed.phase,
      runnerId: parsed.selectedRunner?.id ?? undefined,
      startedAt: parsed.startedAt ?? undefined,
      finishedAt: parsed.finishedAt ?? undefined,
    });
  }
  return runs;
}

/** 對單一專案做完整同步（快照 + 外部執行）。 */
export async function syncProject({ config, api, project, log = () => {} }) {
  await syncProjectSnapshot({ config, api, project, log });
  try {
    const runs = await scanExternalRuns(project);
    if (runs.length > 0) {
      await api.externalRuns({ projectSlug: project.slug, machineId: config.machineId, runs });
    }
  } catch (error) {
    log(`外部執行上報失敗（${project.slug}）：${error.message}`);
  }
}

/** 對全部 advertise 的專案同步。 */
export async function syncAllProjects({ config, api, projects, log = () => {} }) {
  for (const project of projects) {
    await syncProject({ config, api, project, log });
  }
}

/**
 * 同步排程器：三個觸發點（註冊後、固定間隔、執行結束後）。
 * 同時間只跑一個同步；任何失敗吞下記 log，絕不往外丟。
 */
export function createSyncScheduler({ config, api, projects, log = () => {}, syncAll = syncAllProjects, syncOne = syncProject }) {
  let lastSyncAt = 0;
  let running = false;

  async function kick(fn) {
    if (running) return false;
    running = true;
    try {
      await fn();
      lastSyncAt = Date.now();
    } catch (error) {
      log(`現況同步失敗：${error.message}`);
    } finally {
      running = false;
    }
    return true;
  }

  return {
    onRegistered: () => kick(() => syncAll({ config, api, projects, log })),
    maybeInterval: () => {
      if (Date.now() - lastSyncAt < config.statusSyncIntervalMs) return Promise.resolve(false);
      return kick(() => syncAll({ config, api, projects, log }));
    },
    onRunFinished: (projectSlug) => {
      const project = projects.find((entry) => entry.slug === projectSlug);
      if (!project) return Promise.resolve(false);
      return kick(() => syncOne({ config, api, project, log }));
    },
  };
}
