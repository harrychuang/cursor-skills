import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { reportRun, QueueError } from "@/lib/queue";
import { maybeCreateSuccessorCard } from "@/lib/chain";

export async function POST(req: Request) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    leaseId?: string;
    runId?: string;
    phase?: string;
    runnerId?: string;
    verification?: unknown;
    resumedFrom?: string;
    attentionReason?: string;
  } | null;
  if (!body?.leaseId || !body.runId || !body.phase) {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }
  try {
    const result = await reportRun(
      prisma,
      identity,
      {
        leaseId: body.leaseId,
        runId: body.runId,
        phase: body.phase,
        runnerId: body.runnerId,
        verification: body.verification,
        resumedFrom: body.resumedFrom,
        attentionReason: body.attentionReason,
      },
      {
        onCardDone: async (tx, cardId) => {
          await maybeCreateSuccessorCard(tx, cardId);
        },
      },
    );
    return Response.json(result);
  } catch (error) {
    if (error instanceof QueueError) {
      const status = error.code === "invalid-attention-reason" ? 400 : 409;
      return Response.json({ error: error.code }, { status });
    }
    throw error;
  }
}
