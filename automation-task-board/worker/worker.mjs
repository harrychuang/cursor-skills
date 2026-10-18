#!/usr/bin/env node
// 任務看板 worker daemon 進入點。
// 零依賴純 Node：載入設定 → 註冊 → 輪詢領卡 → 包裹 run-task.mjs 執行 → 回報。
// 用法：node worker.mjs --config <path>（預設 ./worker.config.json）
import process from "node:process";
import { loadConfig, ConfigError } from "./lib/config.mjs";

function parseArgs(argv) {
  const args = { config: "worker.config.json" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") {
      args.config = argv[i + 1];
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new ConfigError(`未知的參數：${arg}`);
    }
  }
  return args;
}

const HELP = `任務看板 worker daemon

用法：node worker.mjs [--config <path>]

設定檔（JSON）必填欄位：
  controlPlaneUrl  控制平面 base URL（如 https://board.example.zeabur.app）
  workerToken      成員在看板上簽發的 worker token
  projectRoots     本機專案根目錄的絕對路徑陣列
選填欄位：
  runners          本機可用的 runner id 陣列（預設 ["claude"]）
  machineLabel     看板上顯示的機器名稱（預設 hostname）
  skillsRoot       cm-skills checkout 絕對路徑（預設由本檔案位置推導）
`;

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
  if (args.help) {
    process.stdout.write(HELP);
    process.exit(0);
  }

  let config;
  try {
    config = await loadConfig(args.config);
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`設定錯誤：${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }

  process.stdout.write(
    `worker 設定載入完成：machineId=${config.machineId} projects=${config.projectRoots.length} runners=${config.runners.join(",")}\n`,
  );

  const { runWorker } = await import("./lib/loop.mjs").catch(() => ({ runWorker: null }));
  if (!runWorker) {
    process.stdout.write("輪詢迴圈尚未實作（task 4.x），骨架啟動即結束。\n");
    return;
  }
  await runWorker(config);
}

main().catch((error) => {
  process.stderr.write(`worker 未預期錯誤：${error.stack ?? error.message}\n`);
  process.exit(1);
});
