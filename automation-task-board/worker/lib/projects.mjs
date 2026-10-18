// 專案根驗證：只 advertise 含合法 .agent-automation/config.json 的根，其餘回報排除原因。
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * @param {string[]} projectRoots 絕對路徑陣列
 * @returns {Promise<{valid: Array<{root: string, slug: string, taskIds: string[]}>, excluded: Array<{root: string, reason: string}>}>}
 */
export async function validateProjects(projectRoots) {
  const valid = [];
  const excluded = [];
  for (const root of projectRoots) {
    const configPath = path.join(root, ".agent-automation", "config.json");
    let raw;
    try {
      raw = await readFile(configPath, "utf8");
    } catch {
      excluded.push({ root, reason: "缺少 .agent-automation/config.json" });
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      excluded.push({ root, reason: ".agent-automation/config.json 不是合法 JSON" });
      continue;
    }
    const tasks = parsed && typeof parsed.tasks === "object" && parsed.tasks !== null ? Object.keys(parsed.tasks) : [];
    if (tasks.length === 0) {
      excluded.push({ root, reason: "config.json 沒有任何 task" });
      continue;
    }
    valid.push({ root, slug: slugForRoot(root), taskIds: tasks });
  }
  return { valid, excluded };
}

/** 專案 slug：根目錄名稱轉 kebab-case（看板上的專案識別）。 */
export function slugForRoot(root) {
  return path
    .basename(root)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
