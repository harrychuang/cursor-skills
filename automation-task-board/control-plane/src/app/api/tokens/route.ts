import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateWorkerToken, hashWorkerToken } from "@/lib/worker-auth";

/** 列出自己簽發的 worker token（不含明文）。 */
export async function GET() {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const tokens = await prisma.workerToken.findMany({
    where: { memberId },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ tokens });
}

/** 簽發 worker token；明文只在本回應出現一次。 */
export async function POST(req: Request) {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { label?: string };
  const label = typeof body.label === "string" && body.label.trim() !== "" ? body.label.trim() : "worker";
  const token = generateWorkerToken();
  const record = await prisma.workerToken.create({
    data: { memberId, label, tokenHash: hashWorkerToken(token) },
  });
  return Response.json({ id: record.id, label, token }, { status: 201 });
}
