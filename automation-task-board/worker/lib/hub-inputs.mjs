// Design Automation Hub 派工卡的領卡資格：這台機器讀得到哪些 automation task 的清理輸入。
//
// Hub 的 snapshot 落在專案的 .design-automation/runtime/<automation-task-id>/input.json，
// 那個目錄是 gitignored 的——別台機器的 working tree 看不到它。所以 worker 每次領卡時
// 申報本機讀得到的 id，控制平面只把對得上的 Hub 卡放進候選；讀不到的機器連候選都拿不到，
// 卡片因此停在待領取，而不是被錯的機器領走再假裝是派工。
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const RUNTIME_DIR = path.join(".design-automation", "runtime");
export const INPUT_FILE = "input.json";
/** 申報上限：runtime 目錄會隨歷史任務累積，只取最近修改的前 N 筆讓 claim 請求維持小體積。 */
export const MAX_ADVERTISED_INPUTS = 200;

/** 單一專案根：回傳含 input.json 的 runtime 目錄名（＝automation task id）與其修改時間。 */
async function scanProject(projectRoot) {
  const runtimeRoot = path.join(projectRoot, RUNTIME_DIR);
  let entries;
  try {
    entries = await readdir(runtimeRoot, { withFileTypes: true });
  } catch {
    return []; // 沒有 runtime 目錄（或讀不到）＝這個專案沒有派工輸入，不是錯誤
  }
  const found = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const info = await stat(path.join(runtimeRoot, entry.name, INPUT_FILE));
      if (!info.isFile()) continue;
      found.push({ id: entry.name, mtimeMs: info.mtimeMs });
    } catch {
      // 沒有 input.json 的目錄（或已被清掉）不申報
    }
  }
  return found;
}

/**
 * 掃描所有 advertise 的專案根，回傳本機可讀的 Hub automation task id 清單。
 * 取最近修改的前 MAX_ADVERTISED_INPUTS 筆；沒有任何輸入時回空陣列。
 *
 * @param {Array<{root: string}>} projects
 * @returns {Promise<string[]>}
 */
export async function collectLocalHubInputs(projects, { limit = MAX_ADVERTISED_INPUTS } = {}) {
  const found = [];
  for (const project of projects) {
    found.push(...(await scanProject(project.root)));
  }
  found.sort((left, right) => right.mtimeMs - left.mtimeMs);
  const seen = new Set();
  const ids = [];
  for (const entry of found) {
    if (seen.has(entry.id)) continue; // 不同專案同名目錄只申報一次
    seen.add(entry.id);
    ids.push(entry.id);
    if (ids.length >= limit) break;
  }
  return ids;
}

/** 卡片上的 automation task id 對應到某個專案根的 input.json 絕對路徑。 */
export function hubInputPath(projectRoot, automationTaskId) {
  return path.join(projectRoot, RUNTIME_DIR, automationTaskId, INPUT_FILE);
}
