import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { appendLogChunk } from "@/lib/queue";

export async function POST(req: Request) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { runId?: string; seq?: number; chunk?: string } | null;
  if (!body?.runId || !Number.isInteger(body.seq) || typeof body.chunk !== "string") {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }
  const result = await appendLogChunk(prisma, identity, {
    runId: body.runId,
    seq: body.seq as number,
    chunk: body.chunk,
  });
  if (result.status === "unknown-run") return Response.json({ error: "unknown-run" }, { status: 409 });
  return Response.json({ ok: true });
}
