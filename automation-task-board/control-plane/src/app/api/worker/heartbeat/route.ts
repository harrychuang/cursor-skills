import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { heartbeatLease } from "@/lib/queue";

export async function POST(req: Request) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { leaseId?: string; runnerId?: string } | null;
  if (!body?.leaseId) return Response.json({ error: "invalid-body" }, { status: 400 });
  const result = await heartbeatLease(prisma, identity, { leaseId: body.leaseId, runnerId: body.runnerId });
  if (result.status === "stale") return Response.json({ error: "stale-lease" }, { status: 409 });
  return Response.json({ ok: true });
}
