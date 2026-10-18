import { createHash, randomBytes } from "node:crypto";

const TOKEN_PREFIX = "wtk_";

export function generateWorkerToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function hashWorkerToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 純函式的驗證決策，供單元測試：格式、撤銷狀態。 */
export function isTokenUsable(token: string, record: { revokedAt: Date | null } | null): boolean {
  if (!token.startsWith(TOKEN_PREFIX)) return false;
  if (!record) return false;
  return record.revokedAt === null;
}

export type WorkerIdentity = { memberId: string; tokenId: string };

/** 從 Authorization: Bearer 驗證 worker token；失敗回 null。 */
export async function authenticateWorker(req: Request): Promise<WorkerIdentity | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  // 動態 import：本模組的純函式部分可被 node --test 直接載入
  const { prisma } = await import("./db");
  const record = await prisma.workerToken.findUnique({ where: { tokenHash: hashWorkerToken(token) } });
  if (!isTokenUsable(token, record)) return null;
  prisma.workerToken
    .update({ where: { id: record!.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return { memberId: record!.memberId, tokenId: record!.id };
}
