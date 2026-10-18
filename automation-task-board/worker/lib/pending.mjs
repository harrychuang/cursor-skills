// 結果快取：控制平面不可達時把終態 report 落盤，恢復後冪等補送（runId 為鍵）。
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const PREFIX = "pending-report-";

export async function savePendingReport(stateDir, payload) {
  await mkdir(stateDir, { recursive: true });
  const file = path.join(stateDir, `${PREFIX}${payload.runId}.json`);
  await writeFile(file, JSON.stringify(payload), { mode: 0o600 });
  return file;
}

/** 補送所有快取的 report；送達（含 idempotent）即刪檔。送不出去的留著下輪再試。 */
export async function flushPendingReports(api, stateDir) {
  let files;
  try {
    files = await readdir(stateDir);
  } catch {
    return 0;
  }
  let flushed = 0;
  for (const name of files) {
    if (!name.startsWith(PREFIX) || !name.endsWith(".json")) continue;
    const file = path.join(stateDir, name);
    let payload;
    try {
      payload = JSON.parse(await readFile(file, "utf8"));
    } catch {
      await unlink(file).catch(() => {});
      continue;
    }
    try {
      const res = await api.report(payload);
      if (res.status === 200 || res.status === 409) {
        // 200：recorded / idempotent；409：lease 已失效（逾時被掃走），重送已無意義
        await unlink(file).catch(() => {});
        flushed += 1;
      }
    } catch {
      // 仍然不可達：留給下一輪
    }
  }
  return flushed;
}
