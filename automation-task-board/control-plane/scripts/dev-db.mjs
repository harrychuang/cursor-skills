// 本機開發用 PostgreSQL：embedded-postgres 內含真正的 PG binaries，
// 資料目錄放在專案 .devdb/，不需要系統層安裝。
// 用法：npm run dev-db（保持前景執行，Ctrl+C 停止）
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const databaseDir = path.join(root, ".devdb");
const initialised = existsSync(path.join(databaseDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 54329,
  persistent: true,
});

if (!initialised) {
  await pg.initialise();
}
await pg.start();
if (!initialised) {
  await pg.createDatabase("taskboard");
}

console.log("dev PostgreSQL ready: postgresql://postgres:postgres@127.0.0.1:54329/taskboard");

const stop = async (signal) => {
  console.log(`\n${signal} received, stopping dev PostgreSQL...`);
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
