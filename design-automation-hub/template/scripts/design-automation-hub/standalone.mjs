#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DesignAutomationError } from "./contract.mjs";
import { DesignAutomationHubCore } from "./core.mjs";
import { createDesignAutomationHubServer } from "./server.mjs";

// 派工模組是可選安裝：這裡絕不靜態 import，缺檔時 Coordinator 必須照常啟動。
const DISPATCH_MODULE_FILES = ["dispatch.mjs", "task-board-binding.mjs", "task-board-client.mjs"];

function dispatchPreconditionHolds(resolvedRoot) {
  // URL 或 TOKEN 只要「有定義」就成立（含空值）：設定錯誤必須大聲失敗或警告，
  // 不得因為值不完整就靜默退回本機分析。
  return (
    fs.existsSync(path.join(resolvedRoot, ".design-automation", "task-board.json"))
    || process.env.DESIGN_AUTOMATION_TASK_BOARD_URL !== undefined
    || process.env.DESIGN_AUTOMATION_TASK_BOARD_TOKEN !== undefined
  );
}

function dispatchModulesInstalled() {
  return DISPATCH_MODULE_FILES.every((name) => fs.existsSync(fileURLToPath(new URL(`./${name}`, import.meta.url))));
}

export function parseStandaloneMembers(serialized = process.env.DESIGN_AUTOMATION_MEMBERS_JSON) {
  let values;
  try {
    values = JSON.parse(serialized || "[]");
  } catch {
    throw new DesignAutomationError("invalid-member-configuration", "Member configuration is invalid.", { status: 500 });
  }
  if (!Array.isArray(values) || values.length === 0) {
    throw new DesignAutomationError("invalid-member-configuration", "At least one local member is required.", { status: 500 });
  }
  const seenCodes = new Set();
  return values.map((value) => {
    if (
      !value
      || typeof value.accessCode !== "string"
      || !value.accessCode
      || typeof value.id !== "string"
      || !value.id
      || seenCodes.has(value.accessCode)
    ) throw new DesignAutomationError("invalid-member-configuration", "Local member entry is invalid.", { status: 500 });
    seenCodes.add(value.accessCode);
    return {
      accessCode: value.accessCode,
      id: value.id,
      displayName: typeof value.displayName === "string" && value.displayName ? value.displayName : value.id,
      roles: Array.isArray(value.roles) ? value.roles.filter((role) => typeof role === "string") : ["designer"],
    };
  });
}

export function createStandaloneAuthenticator(members) {
  const byCode = new Map(members.map(({ accessCode, ...member }) => [accessCode, member]));
  return (authorization) => {
    const match = /^Bearer\s+(.+)$/i.exec(authorization || "");
    return match ? byCode.get(match[1]) || null : null;
  };
}

export async function startStandalone({ projectRoot = process.cwd(), port = Number(process.env.PORT || 8787) } = {}) {
  const resolvedRoot = fs.realpathSync(projectRoot);
  const core = new DesignAutomationHubCore({ projectRoot: resolvedRoot });
  const members = parseStandaloneMembers();
  const log = (message) => process.stdout.write(`${message}\n`);

  // 前置條件不成立＝未派工：不讀綁定檔、不載入派工模組，走與今天完全相同的本機分析路徑。
  // 前置條件成立但模組未安裝：出聲警告後照常以 standalone 運作，絕不因此拒絕啟動。
  let binding = null;
  let dispatch = null;
  if (dispatchPreconditionHolds(resolvedRoot)) {
    if (!dispatchModulesInstalled()) {
      log("警告：偵測到派工綁定，但看板派工模組未安裝；任務將在本機分析。");
    } else {
      const [{ createDispatchCore, createDispatchScheduler }, { loadTaskBoardBinding }, { createTaskBoardClient }] =
        await Promise.all([
          import("./dispatch.mjs"),
          import("./task-board-binding.mjs"),
          import("./task-board-client.mjs"),
        ]);
      binding = loadTaskBoardBinding(resolvedRoot);
      if (binding) {
        const client = createTaskBoardClient(binding);
        dispatch = {
          core: createDispatchCore({ core, binding, client, log }),
          scheduleTask: createDispatchScheduler({ core, binding, client, log }),
        };
      }
    }
  }

  const server = createDesignAutomationHubServer({
    core: dispatch ? dispatch.core : core,
    authenticate: createStandaloneAuthenticator(members),
    dispatch: Boolean(dispatch),
    ...(dispatch ? { scheduleTask: dispatch.scheduleTask } : {}),
  });
  server.listen(port, "127.0.0.1", () => {
    log(`Design Automation Hub Coordinator: http://127.0.0.1:${server.address().port}`);
    if (binding) log(`派工模式：清理任務會送到團隊看板的專案 ${binding.projectSlug} 等待放行。`);
  });
  return server;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startStandalone();
}
