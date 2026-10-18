import fs from "node:fs";
import path from "node:path";

import { DesignAutomationError, isInside } from "./contract.mjs";

// 派工綁定：專案選擇把 Plugin 送出的清理任務交給團隊看板，而不是在送出者機器立刻分析。
// 綁定憑證絕不進入 .design-automation/project.json（該檔會因 credential-like key 整個被拒）、
// 不進安裝 receipt、不進任何 HTTP 回應或錯誤訊息——只留在環境變數或未追蹤的本機設定檔。
export const BINDING_RELATIVE_PATH = ".design-automation/task-board.json";

export const BINDING_ENV = Object.freeze({
  url: "DESIGN_AUTOMATION_TASK_BOARD_URL",
  token: "DESIGN_AUTOMATION_TASK_BOARD_TOKEN",
  project: "DESIGN_AUTOMATION_TASK_BOARD_PROJECT",
  stallSeconds: "DESIGN_AUTOMATION_TASK_BOARD_STALL_SECONDS",
});

/** 派工卡遲遲沒被領取時，Plugin 開始說明「尚無機器領取」的門檻（預設 15 分鐘）。 */
export const DEFAULT_STALL_SECONDS = 900;

function invalid(message) {
  return new DesignAutomationError("invalid-task-board-binding", message, { status: 500 });
}

function optionalText(value, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim() === "") throw invalid(`${label} must be a non-empty string.`);
  return value.trim();
}

/**
 * 專案 slug 預設值：必須與 worker 的 slugForRoot 規則一致，
 * 否則 Hub 建的卡會落在 worker 從未 advertise 的專案上，永遠沒有人領。
 */
export function defaultProjectSlug(projectRoot) {
  return path
    .basename(projectRoot)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readBindingFile(projectRoot) {
  const resolvedRoot = fs.realpathSync(projectRoot);
  const bindingPath = path.resolve(resolvedRoot, BINDING_RELATIVE_PATH);
  if (!isInside(resolvedRoot, bindingPath)) throw invalid("Binding path escaped the project root.");
  if (!fs.existsSync(bindingPath)) return {};
  if (fs.lstatSync(bindingPath).isSymbolicLink()) throw invalid("Binding file cannot be a symlink.");
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
  } catch {
    throw invalid("Binding file is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw invalid("Binding file must be an object.");
  if (parsed.schemaVersion !== 1) throw invalid("Binding schemaVersion must be 1.");
  return {
    controlPlaneUrl: optionalText(parsed.controlPlaneUrl, "controlPlaneUrl"),
    token: optionalText(parsed.token, "token"),
    projectSlug: optionalText(parsed.projectSlug, "projectSlug"),
    stallSeconds: parsed.stallSeconds,
  };
}

function positiveInteger(value, fallback) {
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * 解析派工綁定。環境變數逐欄覆寫設定檔；控制平面 URL 與 token 任一缺席即視為未綁定
 * （回傳 null），呼叫端因此走與今天完全相同的 standalone 路徑。
 *
 * @returns {{controlPlaneUrl: string, token: string, projectSlug: string, stallMs: number} | null}
 */
export function loadTaskBoardBinding(projectRoot, env = process.env) {
  const file = readBindingFile(projectRoot);
  const controlPlaneUrl = optionalText(env[BINDING_ENV.url], BINDING_ENV.url) ?? file.controlPlaneUrl;
  const token = optionalText(env[BINDING_ENV.token], BINDING_ENV.token) ?? file.token;
  if (!controlPlaneUrl || !token) return null;
  if (!/^https?:\/\//.test(controlPlaneUrl)) throw invalid("controlPlaneUrl must be an http(s) URL.");
  const projectSlug =
    optionalText(env[BINDING_ENV.project], BINDING_ENV.project)
    ?? file.projectSlug
    ?? defaultProjectSlug(fs.realpathSync(projectRoot));
  if (!projectSlug) throw invalid("Project slug could not be derived; set it explicitly.");
  const stallSeconds = positiveInteger(
    env[BINDING_ENV.stallSeconds] ?? file.stallSeconds,
    DEFAULT_STALL_SECONDS,
  );
  return {
    controlPlaneUrl: controlPlaneUrl.replace(/\/+$/, ""),
    token,
    projectSlug,
    stallMs: stallSeconds * 1000,
  };
}
