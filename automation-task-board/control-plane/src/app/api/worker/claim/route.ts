import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { claimCard, QueueError } from "@/lib/queue";

export async function POST(req: Request) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    machineId?: string;
    projects?: string[];
    runnerId?: string;
    localInputs?: string[];
  } | null;
  if (!body?.machineId || !Array.isArray(body.projects)) {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }
  try {
    const result = await claimCard(prisma, identity, {
      machineId: body.machineId,
      projects: body.projects,
      runnerId: body.runnerId,
      localInputs: Array.isArray(body.localInputs)
        ? body.localInputs.filter((id): id is string => typeof id === "string")
        : undefined,
    });
    if (result.status === "claimed") return Response.json(result.card);
    if (result.status === "conflict") return Response.json({ error: "conflict" }, { status: 409 });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof QueueError) return Response.json({ error: error.code }, { status: 409 });
    throw error;
  }
}
