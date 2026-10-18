// worker 設定載入與驗證。machineId 是穩定識別碼：
// 首次啟動產生 uuid 存於設定檔同層的 .worker-machine-id，之後重用。
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class ConfigError extends Error {}

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigError(`缺少必填欄位 ${name}（非空字串）`);
  }
  return value.trim();
}

export async function loadConfig(configPath) {
  const absPath = path.resolve(configPath);
  let raw;
  try {
    raw = await readFile(absPath, "utf8");
  } catch {
    throw new ConfigError(`讀不到設定檔：${absPath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(`設定檔不是合法 JSON：${absPath}`);
  }

  const controlPlaneUrl = requireString(parsed.controlPlaneUrl, "controlPlaneUrl").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(controlPlaneUrl)) {
    throw new ConfigError("controlPlaneUrl 必須是 http(s) URL");
  }
  const workerToken = requireString(parsed.workerToken, "workerToken");

  if (!Array.isArray(parsed.projectRoots) || parsed.projectRoots.length === 0) {
    throw new ConfigError("缺少必填欄位 projectRoots（非空陣列）");
  }
  const projectRoots = parsed.projectRoots.map((root, index) => {
    const value = requireString(root, `projectRoots[${index}]`);
    if (!path.isAbsolute(value)) {
      throw new ConfigError(`projectRoots[${index}] 必須是絕對路徑：${value}`);
    }
    return value;
  });

  const runners =
    parsed.runners === undefined
      ? ["claude"]
      : Array.isArray(parsed.runners) && parsed.runners.length > 0
        ? parsed.runners.map((r, i) => requireString(r, `runners[${i}]`))
        : (() => {
            throw new ConfigError("runners 若提供必須是非空字串陣列");
          })();

  const machineLabel =
    parsed.machineLabel === undefined ? os.hostname() : requireString(parsed.machineLabel, "machineLabel");

  // skillsRoot：run-task.mjs 所在的 cm-skills checkout；預設由本模組位置推導（automation-task-board/worker/lib → repo root）
  const defaultSkillsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const skillsRoot = parsed.skillsRoot === undefined ? defaultSkillsRoot : requireString(parsed.skillsRoot, "skillsRoot");
  const runTaskScript = path.join(skillsRoot, "agent-automation", "scripts", "run-task.mjs");
  if (!existsSync(runTaskScript)) {
    throw new ConfigError(`找不到 run-task.mjs（skillsRoot 設定錯誤？）：${runTaskScript}`);
  }

  const machineId = await ensureMachineId(path.dirname(absPath));

  return {
    controlPlaneUrl,
    workerToken,
    projectRoots,
    runners,
    machineLabel,
    machineId,
    skillsRoot,
    runTaskScript,
    pollIntervalMs: Number.isInteger(parsed.pollIntervalMs) ? parsed.pollIntervalMs : 5000,
    heartbeatIntervalMs: Number.isInteger(parsed.heartbeatIntervalMs) ? parsed.heartbeatIntervalMs : 20000,
    statusSyncIntervalMs: Number.isInteger(parsed.statusSyncIntervalMs) ? parsed.statusSyncIntervalMs : 600000,
    workerStateDir: path.join(path.dirname(absPath), ".worker-state"),
  };
}

async function ensureMachineId(dir) {
  const idFile = path.join(dir, ".worker-machine-id");
  try {
    const existing = (await readFile(idFile, "utf8")).trim();
    if (existing) return existing;
  } catch {
    // 首次啟動：產生並落檔
  }
  const fresh = `${os.hostname().toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${createHash("sha256")
    .update(randomUUID())
    .digest("hex")
    .slice(0, 12)}`;
  await writeFile(idFile, `${fresh}\n`, { mode: 0o600 });
  return fresh;
}
