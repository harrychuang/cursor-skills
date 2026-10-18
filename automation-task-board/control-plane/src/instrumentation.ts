// Next.js 伺服器啟動 hook：啟動 lease 逾時掃描與 log 保留期限清理。
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("./lib/db");
    const { startExpirySweeper } = await import("./lib/expiry");
    const { cleanupExpiredLogChunks } = await import("./lib/card-detail");
    startExpirySweeper(prisma);
    // log 保留期限清理：每小時一次
    const timer = setInterval(
      () => {
        cleanupExpiredLogChunks(prisma).catch(() => {});
      },
      60 * 60 * 1000,
    );
    timer.unref();
  }
}
